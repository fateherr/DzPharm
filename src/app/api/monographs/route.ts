import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/monographs — bibliothèque des monographies DCI (17 livres).
 * Query: q (recherche DCI), domain, page, pageSize.
 */

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 5 * 60 * 1000;

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = normalize(searchParams.get("q") ?? "");
    const domain = searchParams.get("domain") ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 24));

    const cacheKey = JSON.stringify({ q, domain, page, pageSize });
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return NextResponse.json(hit.value);

    const rows = await db.monograph.findMany({
      select: { dciKey: true, dci: true, domain: true, book: true, content: true },
    });

    interface Entry {
      dciKey: string;
      dci: string;
      domain: string;
      book: string;
      /** Nombre de blocs de contenu (indicateur de richesse). */
      itemCount: number;
      /** Présente un volet grossesse/allaitement (CRAT). */
      hasPregnancy: boolean;
      /** Résumé (première ligne du mécanisme). */
      summary: string;
    }

    let entries: Entry[] = [];
    for (const r of rows) {
      if (domain && r.domain !== domain) continue;
      let content: { sections?: Record<string, unknown> } = {};
      try {
        content = JSON.parse(r.content);
      } catch {
        continue;
      }
      const sections = content.sections ?? {};
      if (q && !normalize(r.dci).includes(q) && !normalize(r.dciKey).includes(q)) continue;

      let itemCount = 0;
      for (const v of Object.values(sections)) {
        if (Array.isArray(v)) itemCount += v.length;
        else if (v && typeof v === "object") {
          for (const vv of Object.values(v as Record<string, unknown>)) {
            if (Array.isArray(vv)) itemCount += vv.length;
          }
        }
      }
      const mech = (sections.mechanism as string[] | undefined) ?? [];
      const summary = mech[0]?.replace(/\s+/g, " ").slice(0, 220) ?? "";
      const preg = (sections.pregnancy as string[] | undefined) ?? [];

      entries.push({
        dciKey: r.dciKey,
        dci: r.dci,
        domain: r.domain,
        book: r.book
          .replace(/\.docx$/i, "")
          .replace(/_/g, " ")
          .replace(/Algerie Livre Technique.*$/i, "")
          .trim(),
        itemCount,
        hasPregnancy: preg.length > 0,
        summary,
      });
    }

    entries = entries.sort((a, b) => a.dci.localeCompare(b.dci, "fr"));

    // Domaines avec compteurs (après recherche pour cohérence)
    const domainCounts = new Map<string, number>();
    for (const e of entries) domainCounts.set(e.domain, (domainCounts.get(e.domain) ?? 0) + 1);

    const total = entries.length;
    const start = (page - 1) * pageSize;
    const items = entries.slice(start, start + pageSize);

    const value = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      domains: [...domainCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
    cache.set(cacheKey, { value, expires: Date.now() + TTL });
    return NextResponse.json(value);
  } catch (error) {
    console.error("[api/monographs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
