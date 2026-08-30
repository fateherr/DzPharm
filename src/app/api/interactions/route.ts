import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildInteractionSummary,
  detectDuplicateDci,
  globalRiskFromPairs,
  matchInteractions,
  pairIndicesFromRule,
  type DuplicateDciAlert,
  type LocalRule,
} from "@/lib/interaction-rules";
import type { InteractionSeverity } from "@/components/dzpharm/types";

/**
 * POST /api/interactions — Contrôle d'interactions par le moteur local de règles.
 * Body: { drugs: [{ name: string, dci?: string }] }
 *
 * DÉTERMINISME — le cœur de la garantie d'invariance :
 *  1. chaque produit est résolu vers sa DCI (registre) ;
 *  2. la DCI est canonisée (constituants d'associations éclatés, dérivés
 *     rattachés à la molécule mère, sels/hydrates ignorés) ;
 *  3. la correspondance des règles utilise EXCLUSIVEMENT ces jetons canoniques ;
 *  4. verdict, mécanisme, conduite et résumé proviennent de la base de règles.
 * → Changer le nom commercial ne change JAMAIS le verdict ni le résumé.
 */

const SEVERITY_ORDER: Record<string, number> = {
  "CONTRE-INDIQUE": 4,
  MAJEURE: 3,
  MODEREE: 2,
  MINEURE: 1,
};

/** Normalisation de saisie pour la recherche registre. */
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

  // La DCI fournie par le client (panier issu du registre) est prioritaire :
  // résolution exacte, insensible à la marque.
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

  // Recherche par marque exacte d'abord (plus précise), puis partielle.
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const inputDrugs: { name?: string; dci?: string }[] = Array.isArray(body?.drugs)
      ? body.drugs
      : [];

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

    // Enrichissement registre : marque/DCI → fiche + DCI canonique
    const enriched = await Promise.all(
      cleaned.map((d) => resolveProduct(d.name, d.dci))
    );

    const rules = matchInteractions(enriched);

    const pairs = rules
      .flatMap((rule: LocalRule) =>
        pairIndicesFromRule(rule, enriched).map(
          ([i, j]): {
            drugs: [string, string];
            severity: InteractionSeverity;
            mechanism: string;
            management: string;
          } => ({
            drugs: [enriched[i].input, enriched[j].input],
            severity: rule.severity,
            mechanism: rule.mechanism,
            management: rule.management,
          })
        )
      )
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
      );

    // Doublons de DCI : même constituant actif dans plusieurs produits
    const duplicates = detectDuplicateDci(enriched);
    const duplicatePairs = duplicates.map((dup: DuplicateDciAlert) => ({
      drugs: [dup.products[0], dup.products.slice(1).join(" + ")] as [string, string],
      severity: dup.severity as InteractionSeverity,
      mechanism: dup.mechanism,
      management: dup.management,
    }));

    const allPairs = [...pairs, ...duplicatePairs];

    const globalRisk = globalRiskFromPairs(allPairs);

    const unresolved = enriched
      .filter((e) => !e.dci && !e.brand)
      .map((e) => e.input);

    const hasCi = allPairs.some((p) => p.severity === "CONTRE-INDIQUE");
    const hasMajor = allPairs.some((p) => p.severity === "MAJEURE");

    const summary = buildInteractionSummary({
      pairsCount: allPairs.length,
      contreIndications: allPairs.filter((p) => p.severity === "CONTRE-INDIQUE").length,
      majeures: allPairs.filter((p) => p.severity === "MAJEURE").length,
      duplicates: duplicates.length,
      unresolvedCount: unresolved.length,
      totalDrugs: enriched.length,
    });

    const advice: string[] = [];
    if (unresolved.length > 0) {
      advice.push(
        `Attention : ${unresolved.join(", ")} n'a pas été reconnu dans le registre algérien — l'analyse porte uniquement sur les produits identifiés. Essayez la DCI ou vérifiez l'orthographe.`
      );
    }
    if (hasCi) {
      advice.push(
        "Contre-indication détectée : contacter le prescripteur avant toute dispensation."
      );
    }
    if (hasMajor) {
      advice.push(
        "Vérifier la fonction rénale (créatinine, DFG) et la kaliémie si l'association est maintenue."
      );
    }
    if (enriched.some((e) => e.status === "RETRIE")) {
      advice.push(
        "Un des produits figure sur la liste des retraits du marché — vérifier son statut commercial."
      );
    }
    if (allPairs.length > 0) {
      advice.push(
        "Rappel systématique au patient : ne pas automédiquer avec des AINS ou produits en vente libre sans avis pharmaceutique."
      );
    }

    const monitoring: string[] = [];
    const dciAll = enriched.map((e) => (e.dci ?? "").toUpperCase()).join(" | ");
    if (/WARFARINE|ACENOCOUMAROL|FLUINDIONE|PHENPROCOUMON/.test(dciAll)) {
      monitoring.push("INR (international normalized ratio)");
    }
    if (/LITHIUM/.test(dciAll)) {
      monitoring.push("Lithémie");
    }
    if (/DIGOXINE|FUROSEMIDE/.test(dciAll)) {
      monitoring.push("Kaliémie, ECG");
    }
    if (/GLIBENCLAMIDE|GLICLAZIDE|GLIMEPIRIDE|INSULINE/.test(dciAll)) {
      monitoring.push("Glycémie capillaire");
    }
    if (/SIMVASTATINE|ATORVASTATINE|ROSUVASTATINE|COLCHICINE/.test(dciAll)) {
      monitoring.push("CPK (créatine phosphokinase) si myalgies");
    }
    if (/PARACETAMOL/.test(dciAll) && duplicates.length > 0) {
      monitoring.push("Fonction hépatique (ASAT/ALAT) en cas de doses cumulées élevées");
    }

    return NextResponse.json({
      enriched,
      globalRisk,
      summary,
      pairs: allPairs,
      advice,
      monitoring,
      source: "local" as const,
      rulesVersion: 2,
    });
  } catch (error) {
    console.error("[api/interactions]", error);
    return NextResponse.json(
      { error: "Erreur du moteur local d'interactions." },
      { status: 500 }
    );
  }
}
