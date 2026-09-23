import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiError } from "@/lib/gemini";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { normalizeKey } from "@/lib/dci-normalizer";
import {
  buildInteractionSummary,
  canonicalIdentities,
  detectDuplicateDci,
  globalRiskFromPairs,
  matchInteractions,
  pairIndicesFromRule,
  type LocalRule,
} from "@/lib/interaction-rules";
import type { InteractionSeverity } from "@/components/dzpharm/types";

export const maxDuration = 120;

/** Garde anti-abus : 12 requêtes / minute / IP (analyse approfondie coûteuse). */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

interface InteractionPair {
  drugs: [string, string];
  severity: "CONTRE-INDIQUE" | "MAJEURE" | "MODEREE" | "MINEURE";
  mechanism: string;
  management: string;
}

const VALID_SEVERITIES = new Set(["CONTRE-INDIQUE", "MAJEURE", "MODEREE", "MINEURE"]);

/**
 * POST /api/ai/interactions — Contrôle d'interactions enrichi.
 *
 * ARCHITECTURE D'ARBITRAGE DÉTERMINISTE :
 *  1. Le moteur local de règles s'exécute en premier sur les DCI canoniques :
 *     son verdict (sévérité, mécanisme, conduite) fait foi.
 *  2. Le modèle de langage ne voit QUE la liste canonique des DCI (jamais les
 *     marques) — la requête est donc invariante par changement de nom commercial.
 *  3. Au retour, toute paire IA déjà couverte par une règle locale est ÉCARTÉE :
 *     la version locale (déterministe) remplace systématiquement la version IA.
 *  4. La sévérité globale et le résumé sont recalculés depuis les paires
 *     fusionnées (modèle déterministe) — jamais repris du texte libre du LLM.
 *
 * → Quel que soit le nom commercial saisi, le verdict et le résumé sont
 *   strictement identiques d'une exécution à l'autre pour les paires couvertes
 *   par la base de référence ; les paires supplémentaires détectées par le LLM
 *   (hors base) sont conservées comme complément, avec sévérité validée.
 */

function toSearchKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Résolution produit : marque ou DCI saisie → fiche registre (marque, DCI, statut). */
async function resolveProduct(input: string, dciHint?: string) {
  const key = toSearchKey(input);

  if (dciHint && dciHint.trim().length > 0) {
    const dciKeyHint = toSearchKey(dciHint);
    const byDci = await db.drug.findFirst({
      where: { dciKey: dciKeyHint },
      orderBy: [{ status: "asc" }, { brandKey: "asc" }],
    });
    if (byDci) {
      return {
        input,
        dci: dciHint,
        brand: byDci.brand ?? input,
        status: byDci.status ?? null,
        lab: byDci.lab ?? null,
        forme: byDci.form ?? null,
      };
    }
  }

  if (!key) {
    return { input, dci: null, brand: null, status: null, lab: null, forme: null };
  }

  const exact = await db.drug.findFirst({
    where: { OR: [{ brandKey: key }, { dciKey: key }] },
    orderBy: [{ status: "asc" }, { brandKey: "asc" }],
  });
  const m =
    exact ??
    (await db.drug.findFirst({
      where: {
        OR: [{ brandKey: { contains: key } }, { dciKey: { contains: key } }],
      },
      orderBy: [{ status: "asc" }, { brandKey: "asc" }],
    }));

  return {
    input,
    dci: m?.dci ?? dciHint ?? null,
    brand: m?.brand ?? null,
    status: m?.status ?? null,
    lab: m?.lab ?? null,
    forme: m?.form ?? null,
  };
}

/** Rattache un libellé renvoyé par le LLM à l'indice du produit correspondant (−1 si non rattache). */
function mapLabelToIndex(
  label: string,
  enriched: { input: string; dci: string | null; brand: string | null }[],
  ids: { tokens: Set<string> }[]
): number {
  const n = normalizeKey(label);
  if (!n) return -1;
  for (let i = 0; i < enriched.length; i++) {
    const e = enriched[i];
    const candidates = [e.input, e.brand, e.dci]
      .filter((x): x is string => Boolean(x))
      .map((x) => normalizeKey(x));
    if (candidates.includes(n)) return i;
    // Le libellé du LLM est un sous-ensemble des jetons canoniques du produit
    const labelWords = n.split(" ").filter((w) => w.length >= 4);
    if (
      labelWords.length > 0 &&
      labelWords.every((w) => ids[i].tokens.has(w))
    ) {
      return i;
    }
  }
  return -1;
}

function dedupeList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const t = it.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`ai-int:${clientIpFrom(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes — réessayez dans ${rl.retryAfterSec} s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    const inputDrugs: { name?: string; dci?: string }[] = Array.isArray(body?.drugs)
      ? body.drugs
      : [];
    const patientContext: string = String(body?.patientContext || "").slice(0, 500);

    const cleaned = inputDrugs
      .map((d) => ({
        name: String(d?.name || "").trim(),
        dci: d?.dci ? String(d.dci).trim() : undefined,
      }))
      .filter((d) => d.name.length > 0);

    if (cleaned.length < 2) {
      return NextResponse.json(
        { error: "Sélectionnez au moins 2 médicaments pour analyser les interactions." },
        { status: 400 }
      );
    }
    if (cleaned.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 médicaments par analyse." },
        { status: 400 }
      );
    }

    // --- 1. Enrichissement registre + identités canoniques DCI
    const enriched = await Promise.all(
      cleaned.map((d) => resolveProduct(d.name, d.dci))
    );
    const ids = canonicalIdentities(enriched);

    // --- 2. Moteur local : verdicts de référence (déterministes)
    const rules = matchInteractions(enriched);
    const localPairs: InteractionPair[] = [];
    const localIndexKeys = new Set<string>();
    for (const rule of rules) {
      for (const [i, j] of pairIndicesFromRule(rule, enriched)) {
        localIndexKeys.add(`${Math.min(i, j)}-${Math.max(i, j)}`);
        localPairs.push({
          drugs: [enriched[i].input, enriched[j].input],
          severity: rule.severity,
          mechanism: rule.mechanism,
          management: rule.management,
        });
      }
    }
    const duplicates = detectDuplicateDci(enriched);
    const duplicatePairs: InteractionPair[] = duplicates.map((dup) => ({
      drugs: [dup.products[0], dup.products.slice(1).join(" + ")],
      severity: dup.severity,
      mechanism: dup.mechanism,
      management: dup.management,
    }));

    // --- 3. Requête LLM sur la liste canonique de DCI (sans les marques)
    // Les produits non résolus dans le registre sont EXCLUS de l'analyse IA :
    // le LLM ne doit jamais deviner la molécule d'un nom qu'il ne connaît pas.
    const unresolvedCount = enriched.filter((e) => !e.dci && !e.brand).length;
    const dciLines = enriched
      .filter((e) => Boolean(e.dci))
      .map((e) => `- ${e.dci!.replace(/\s+/g, " ").trim()}`)
      .join("\n");
    const unresolvedNote =
      unresolvedCount > 0
        ? `\nNB : ${unresolvedCount} produit(s) saisi(s) n'ont pas pu être identifiés dans le registre — exclus de l'analyse. Ne devine JAMAIS leur molécule.\n`
        : "";

    const knownPairs =
      localPairs.length > 0
        ? `\nAssociations DÉJÀ identifiées par la base de référence (NE PAS les re-lister) :\n${[
            ...new Set(
              localPairs.map(
                (p) => `- ${normalizeKey(p.drugs[0])} × ${normalizeKey(p.drugs[1])}`
              )
            ),
          ].join("\n")}\n`
        : "";

    const userPrompt = `Analyse les interactions médicamenteuses pour la prescription suivante :

Médicaments (DCI) :
${dciLines}${unresolvedNote}
${patientContext ? `\nContexte patient : ${patientContext}\n` : ""}${knownPairs}
Analyse TOUTES les paires possibles NON déjà couvertes ci-dessus. Réponds STRICTEMENT en JSON valide avec ce format (aucun texte hors du JSON) :
{
  "pairs": [
    {
      "drugs": ["DCI 1", "DCI 2"],
      "severity": "CONTRE-INDIQUE|MAJEURE|MODEREE|MINEURE",
      "mechanism": "mécanisme pharmacologique précis (2 phrases max)",
      "management": "conduite à tenir pratique pour le pharmacien/médecin"
    }
  ],
  "advice": ["conseil 1"],
  "monitoring": ["paramètre à surveiller 1"]
}
N'inclus que les paires ayant une interaction cliniquement pertinente, en utilisant EXACTEMENT les libellés DCI listés ci-dessus. Si aucune paire supplémentaire notable, renvoie pairs: [].`;

    let aiExtraPairs: InteractionPair[] = [];
    let aiAdvice: string[] = [];
    let aiMonitoring: string[] = [];
    let aiOk = false;

    try {
      const systemInstruction =
        "Tu es un pharmacien clinicien expert en interactions médicamenteuses, spécialisé sur le marché pharmaceutique algérien. Tu réponds uniquement en JSON valide. Tu travailles exclusivement sur les DCI fournies, sans jamais inventer de molécule.";

      const raw = await callGemini(
        systemInstruction,
        [{ role: "user", parts: [{ text: userPrompt }] }],
        { temperature: 0.1, maxOutputTokens: 1500 }
      );
      let parsed: { pairs?: InteractionPair[]; advice?: string[]; monitoring?: string[] } | null =
        null;
      try {
        const cleanedRaw = raw
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        parsed = JSON.parse(cleanedRaw);
      } catch {
        parsed = null;
      }

      if (parsed && Array.isArray(parsed.pairs)) {
        aiOk = true;
        aiAdvice = Array.isArray(parsed.advice)
          ? parsed.advice.map((a) => String(a)).filter((a) => a.trim().length > 0)
          : [];
        aiMonitoring = Array.isArray(parsed.monitoring)
          ? parsed.monitoring.map((m) => String(m)).filter((m) => m.trim().length > 0)
          : [];

        // --- 4. Arbitrage : seules les paires NON couvertes localement sont retenues
        for (const p of parsed.pairs) {
          if (!Array.isArray(p?.drugs) || p.drugs.length !== 2) continue;
          const ia = mapLabelToIndex(String(p.drugs[0]), enriched, ids);
          const ib = mapLabelToIndex(String(p.drugs[1]), enriched, ids);
          if (ia < 0 || ib < 0 || ia === ib) continue;
          // Les produits non identifiés dans le registre ne participent
          // jamais aux paires IA (anti-hallucination) :
          if (!enriched[ia].dci || !enriched[ib].dci) continue;
          const key = `${Math.min(ia, ib)}-${Math.max(ia, ib)}`;
          if (localIndexKeys.has(key)) continue; // la règle locale fait foi
          const severity = VALID_SEVERITIES.has(String(p.severity))
            ? (p.severity as InteractionPair["severity"])
            : "MODEREE";
          aiExtraPairs.push({
            drugs: [enriched[ia].input, enriched[ib].input],
            severity,
            mechanism: String(p.mechanism || "").slice(0, 500),
            management: String(p.management || "").slice(0, 500),
          });
        }
        // déduplication sur la paire d'indices (le LLM peut répéter une paire)
        const seenIdx = new Set<string>();
        aiExtraPairs = aiExtraPairs.filter((p) => {
          const ia = enriched.findIndex((e) => e.input === p.drugs[0]);
          const ib = enriched.findIndex((e) => e.input === p.drugs[1]);
          const key = `${Math.min(ia, ib)}-${Math.max(ia, ib)}`;
          if (seenIdx.has(key)) return false;
          seenIdx.add(key);
          return true;
        });
      }
    } catch (aiError) {
      if (aiError instanceof GeminiError) {
        console.error("[api/ai/interactions] Gemini indisponible, repli local :", aiError.message);
      } else {
        console.error("[api/ai/interactions] LLM indisponible, repli local :", aiError);
      }
    }

    // --- 5. Fusion + sorties déterministes
    const merged = [...localPairs, ...duplicatePairs, ...aiExtraPairs].sort((a, b) => {
      const order: Record<string, number> = {
        "CONTRE-INDIQUE": 4,
        MAJEURE: 3,
        MODEREE: 2,
        MINEURE: 1,
      };
      return (order[b.severity] ?? 0) - (order[a.severity] ?? 0);
    });

    const globalRisk = globalRiskFromPairs(merged);

    const unresolved = enriched.filter((e) => !e.dci && !e.brand).map((e) => e.input);

    const summary = buildInteractionSummary({
      pairsCount: merged.length,
      contreIndications: merged.filter((p) => p.severity === "CONTRE-INDIQUE").length,
      majeures: merged.filter((p) => p.severity === "MAJEURE").length,
      duplicates: duplicates.length,
      unresolvedCount: unresolved.length,
      totalDrugs: enriched.length,
    });

    const localAdvice: string[] = [];
    if (unresolved.length > 0) {
      localAdvice.push(
        `Attention : ${unresolved.join(", ")} n'a pas été reconnu dans le registre algérien — l'analyse porte uniquement sur les produits identifiés. Essayez la DCI ou vérifiez l'orthographe.`
      );
    }
    if (merged.some((p) => p.severity === "CONTRE-INDIQUE")) {
      localAdvice.push(
        "Contre-indication détectée : contacter le prescripteur avant toute dispensation."
      );
    }
    if (merged.some((p) => p.severity === "MAJEURE")) {
      localAdvice.push(
        "Vérifier la fonction rénale (créatinine, DFG) et la kaliémie si l'association est maintenue."
      );
    }
    if (enriched.some((e) => e.status === "RETRIE")) {
      localAdvice.push(
        "Un des produits figure sur la liste des retraits du marché — vérifier son statut commercial."
      );
    }
    if (merged.length > 0) {
      localAdvice.push(
        "Rappel systématique au patient : ne pas automédiquer avec des AINS ou produits en vente libre sans avis pharmaceutique."
      );
    }

    const dciAll = enriched.map((e) => (e.dci ?? "").toUpperCase()).join(" | ");
    const localMonitoring: string[] = [];
    if (/WARFARINE|ACENOCOUMAROL|FLUINDIONE|PHENPROCOUMON/.test(dciAll)) {
      localMonitoring.push("INR (international normalized ratio)");
    }
    if (/LITHIUM/.test(dciAll)) localMonitoring.push("Lithémie");
    if (/DIGOXINE|FUROSEMIDE/.test(dciAll)) localMonitoring.push("Kaliémie, ECG");
    if (/GLIBENCLAMIDE|GLICLAZIDE|GLIMEPIRIDE|INSULINE/.test(dciAll)) {
      localMonitoring.push("Glycémie capillaire");
    }
    if (/SIMVASTATINE|ATORVASTATINE|ROSUVASTATINE|COLCHICINE/.test(dciAll)) {
      localMonitoring.push("CPK (créatine phosphokinase) si myalgies");
    }
    if (/PARACETAMOL/.test(dciAll) && duplicates.length > 0) {
      localMonitoring.push("Fonction hépatique (ASAT/ALAT) en cas de doses cumulées élevées");
    }

    return NextResponse.json({
      enriched,
      globalRisk,
      summary,
      pairs: merged,
      advice: dedupeList([...localAdvice, ...aiAdvice]).slice(0, 8),
      monitoring: dedupeList([...localMonitoring, ...aiMonitoring]).slice(0, 8),
      source: aiOk ? ("ai" as const) : ("local" as const),
      rulesVersion: 2,
    });
  } catch (error) {
    console.error("[api/ai/interactions]", error);
    return NextResponse.json(
      { error: "Erreur du service d'analyse d'interactions." },
      { status: 500 }
    );
  }
}
