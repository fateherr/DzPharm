import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractBookSafetyAndSummary, type MonoContent } from "@/lib/rcp";

/**
 * GET /api/monographs/[key] — fiche monographie complète (livre technique).
 * Retourne les 12 sections + médicaments du registre liés à cette DCI.
 */

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toItems(list: string[] | undefined): { label?: string; text: string }[] {
  if (!list) return [];
  return list
    .filter((t) => t && t.trim())
    .map((t) => {
      const m = t.match(/^([A-ZÉÈÀÇ0-9][\wÀ-ÿ'’\- ()/.,%µ°]{2,60}?)\s*:\s*(.+)$/);
      if (m && m[2].length > 3) return { label: m[1].trim(), text: m[2].trim() };
      return { text: t.trim() };
    });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const keyNorm = normalize(decodeURIComponent(key));

    const row = await db.monograph.findFirst({
      where: { OR: [{ dciKey: keyNorm }] },
    });
    if (!row) {
      // tolérant : recherche par préfixe
      const alt = await db.monograph.findFirst({
        where: { dciKey: { startsWith: keyNorm.split(" ")[0] } },
      });
      if (!alt) {
        return NextResponse.json({ error: "Monographie introuvable" }, { status: 404 });
      }
      return await build(alt);
    }
    return await build(row);
  } catch (error) {
    console.error("[api/monographs/[key]]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

async function build(row: {
  dciKey: string;
  dci: string;
  domain: string;
  book: string;
  content: string;
}) {
  let content: MonoContent = {
    context: null,
    alias: null,
    domainsExtra: [],
    keys: [],
    sections: {
      categories: [],
      available: [],
      mechanism: [],
      profile: {},
      interactions: [],
      pregnancy: [],
      posology: [],
    },
  };
  try {
    content = JSON.parse(row.content);
  } catch {
    // fallback
  }
  const s = content.sections ?? {};
  const profile = (s.profile as Record<string, string[]> | undefined) ?? {};

  // Extraction synthèse clinique et badges sécurité
  const { safety, summary } = extractBookSafetyAndSummary({
    domain: row.domain,
    content,
  });

  // Médicaments du registre pour cette DCI (clé exacte ou composante)
  const searchKeys = new Set<string>([row.dciKey, ...(content.keys ?? [])]);
  const allKeys = [...searchKeys].filter(Boolean).slice(0, 8);
  const registry = await db.drug.findMany({
    where: {
      status: "ACTIF",
      OR: allKeys.flatMap((k) => [{ dciKey: k }, { dciKey: { startsWith: k + " " } }]),
    },
    select: {
      id: true,
      brand: true,
      dosage: true,
      form: true,
      lab: true,
      status: true,
      domain: true,
    },
    orderBy: { brandKey: "asc" },
    take: 40,
  });

  const value = {
    dciKey: row.dciKey,
    dci: row.dci,
    domain: row.domain,
    summary,
    safety,
    book: row.book
      .replace(/\.docx$/i, "")
      .replace(/_/g, " ")
      .replace(/Algerie Livre Technique.*$/i, "")
      .trim(),
    context: content.context ?? null,
    alias: content.alias ?? null,
    sections: {
      categories: toItems(s.categories as string[] | undefined),
      available: toItems(s.available as string[] | undefined),
      mechanism: toItems(s.mechanism as string[] | undefined),
      indications: toItems(profile.indications),
      contraindications: toItems(profile.contraindications),
      adverse: toItems(profile.adverse),
      management: toItems(s.management as string[] | undefined),
      interactions: toItems(s.interactions as string[] | undefined),
      pregnancy: toItems(s.pregnancy as string[] | undefined),
      posology: toItems(s.posology as string[] | undefined),
      galenic: toItems(s.galenic as string[] | undefined),
      advice: toItems(s.advice as string[] | undefined),
      pk: toItems(s.pk as string[] | undefined),
      notes: toItems(s.notes as string[] | undefined),
    },
    registry,
    registryTotal: registry.length,
  };

  return NextResponse.json(value);
}
