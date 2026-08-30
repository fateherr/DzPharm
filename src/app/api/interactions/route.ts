import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  globalRiskFromPairs,
  matchInteractions,
  pairsFromRule,
  type LocalRule,
} from "@/lib/interaction-rules";
import type { InteractionSeverity } from "@/components/dzpharm/types";

/**
 * POST /api/interactions — Contrôle d'interactions par le moteur local de règles.
 * Body: { drugs: [{ name: string }] }
 * Réponse instantanée (aucun appel IA) — premier niveau d'analyse et repli
 * lorsque le service d'analyse IA approfondie est indisponible.
 */

const SEVERITY_ORDER: Record<string, number> = {
  "CONTRE-INDIQUE": 4,
  MAJEURE: 3,
  MODEREE: 2,
  MINEURE: 1,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const inputDrugs: { name?: string }[] = Array.isArray(body?.drugs)
      ? body.drugs
      : [];

    const names = inputDrugs
      .map((d) => String(d?.name || "").trim())
      .filter((n) => n.length > 0);

    if (names.length < 2) {
      return NextResponse.json(
        { error: "Sélectionnez au moins 2 médicaments pour analyser les interactions." },
        { status: 400 }
      );
    }
    if (names.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 médicaments par analyse." },
        { status: 400 }
      );
    }

    // Enrichissement registre : marque → DCI (essentiel pour les règles)
    const enriched = await Promise.all(
      names.map(async (name) => {
        const key = name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const m = await db.drug.findFirst({
          where: {
            OR: [{ brandKey: { contains: key } }, { dciKey: { contains: key } }],
          },
          orderBy: [{ status: "asc" }, { brandKey: "asc" }],
        });
        return {
          input: name,
          dci: m?.dci ?? null,
          brand: m?.brand ?? null,
          status: m?.status ?? null,
          lab: m?.lab ?? null,
          forme: m?.form ?? null,
        };
      })
    );

    const rules = matchInteractions(enriched);

    const pairs = rules
      .flatMap((rule: LocalRule) =>
        pairsFromRule(rule, enriched).map(
          ([a, b]): {
            drugs: [string, string];
            severity: InteractionSeverity;
            mechanism: string;
            management: string;
          } => ({
            drugs: [a, b],
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

    const globalRisk = globalRiskFromPairs(pairs);

    // Avertissement pour les produits non résolus dans le registre :
    // ne jamais présenter « aucune interaction » sans signaler l'angle mort.
    const unresolved = enriched
      .filter((e) => !e.dci && !e.brand)
      .map((e) => e.input);

    const hasCi = pairs.some((p) => p.severity === "CONTRE-INDIQUE");
    const hasMajor = pairs.some((p) => p.severity === "MAJEURE");

    const summary =
      unresolved.length > 0
        ? `Analyse partielle : ${unresolved.length} produit(s) non reconnu(s) dans le registre — vérifiez la saisie. Aucune interaction connue entre les produits identifiés.`
        : pairs.length === 0
          ? `Aucune interaction connue dans la base de règles locale entre les ${enriched.length} produits analysés.`
          : hasCi
            ? `${pairs.length} association(s) à risque identifiée(s), dont une contre-indication formelle — cette ordonnance doit être validée avant dispensation.`
            : hasMajor
              ? `${pairs.length} association(s) à risque identifiée(s), dont ${pairs.filter((p) => p.severity === "MAJEURE").length} majeure(s) — surveillance et adaptation recommandées.`
              : `${pairs.length} association(s) à surveiller selon la base de règles locale.`;

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
    if (pairs.length > 0) {
      advice.push(
        "Rappel systématique au patient : ne pas automédiquer avec des AINS ou produits en vente libre sans avis pharmaceutique."
      );
    }

    const monitoring: string[] = [];
    if (
      enriched.some((e) =>
        e.dci?.toUpperCase().includes("WARFARINE") ||
        e.dci?.toUpperCase().includes("ACENOCOUMAROL") ||
        e.dci?.toUpperCase().includes("FLUINDIONE"))
    ) {
      monitoring.push("INR (international normalized ratio)");
    }
    if (enriched.some((e) => e.dci?.toUpperCase().includes("LITHIUM"))) {
      monitoring.push("Lithémie");
    }
    if (
      enriched.some((e) => e.dci?.toUpperCase().includes("DIGOXINE")) ||
      enriched.some((e) => e.dci?.toUpperCase().includes("FUROSEMIDE"))
    ) {
      monitoring.push("Kaliémie, ECG");
    }
    if (
      enriched.some((e) =>
        ["GLIBENCLAMIDE", "GLICLAZIDE", "GLIMEPIRIDE", "INSULINE"].some((x) =>
          e.dci?.toUpperCase().includes(x)
        )
      )
    ) {
      monitoring.push("Glycémie capillaire");
    }
    if (
      enriched.some((e) =>
        ["SIMVASTATINE", "ATORVASTATINE", "ROSUVASTATINE", "COLCHICINE"].some(
          (x) => e.dci?.toUpperCase().includes(x)
        )
      )
    ) {
      monitoring.push("CPK (créatine phosphokinase) si myalgies");
    }

    return NextResponse.json({
      enriched,
      globalRisk,
      summary,
      pairs,
      advice,
      monitoring,
      source: "local" as const,
      rulesVersion: 1,
    });
  } catch (error) {
    console.error("[api/interactions]", error);
    return NextResponse.json(
      { error: "Erreur du moteur local d'interactions." },
      { status: 500 }
    );
  }
}
