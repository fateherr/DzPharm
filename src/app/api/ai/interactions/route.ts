import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

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

/**
 * POST /api/ai/interactions — Multi-drug interaction checker
 * Body: { drugs: [{ name: string }], patientContext?: string }
 * Each drug name is enriched with registry data (DCI, status) before LLM analysis.
 */
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
    const inputDrugs: { name?: string }[] = Array.isArray(body?.drugs) ? body.drugs : [];
    const patientContext: string = String(body?.patientContext || "").slice(0, 500);

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

    // --- enrich each drug with registry data
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

    const drugLines = enriched
      .map(
        (d) =>
          `- "${d.input}"${d.dci ? ` → DCI: ${d.dci}` : ""}${d.status ? ` [statut: ${d.status === "ACTIF" ? "actif" : d.status === "RETRIE" ? "RETIRÉ du marché" : "non renouvelé"}]` : ""}`
      )
      .join("\n");

    const userPrompt = `Analyse les interactions médicamenteuses pour la prescription suivante en Algérie :

Médicaments:
${drugLines}
${patientContext ? `\nContexte patient: ${patientContext}` : ""}

Analyse TOUTES les paires possibles. Réponds STRICTEMENT en JSON valide avec ce format (aucun texte hors du JSON) :
{
  "globalRisk": "FAIBLE|MODERE|ELEVE|CRITIQUE",
  "summary": "résumé en 2-3 phrases du risque global",
  "pairs": [
    {
      "drugs": ["Nom1", "Nom2"],
      "severity": "CONTRE-INDIQUE|MAJEURE|MODEREE|MINEURE",
      "mechanism": "mécanisme pharmacologique précis (2 phrases max)",
      "management": "conduite à tenir pratique pour le pharmacien/médecin"
    }
  ],
  "advice": ["conseil 1", "conseil 2"],
  "monitoring": ["paramètre à surveiller 1"]
}
N'inclus que les paires ayant une interaction cliniquement pertinente. Si aucune interaction notable, renvoie pairs: [] avec globalRisk: "FAIBLE".`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "Tu es un pharmacien clinicien expert en interactions médicamenteuses, spécialisé sur le marché pharmaceutique algérien. Tu réponds uniquement en JSON valide.",
        },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let parsed: {
      globalRisk?: string;
      summary?: string;
      pairs?: InteractionPair[];
      advice?: string[];
      monitoring?: string[];
    } | null = null;

    try {
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }

    if (!parsed || !Array.isArray(parsed.pairs)) {
      return NextResponse.json(
        {
          error: "Analyse indisponible, veuillez réessayer.",
          raw: raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      enriched,
      globalRisk: parsed.globalRisk ?? "MODERE",
      summary: parsed.summary ?? "",
      pairs: parsed.pairs,
      advice: parsed.advice ?? [],
      monitoring: parsed.monitoring ?? [],
    });
  } catch (error) {
    console.error("[api/ai/interactions]", error);
    return NextResponse.json(
      { error: "Erreur du service d'analyse d'interactions." },
      { status: 500 }
    );
  }
}
