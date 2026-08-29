import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/drugs/top-views — médicaments les plus consultés (compteur DzPharm)
 * + agrégation par DCI (topDci).
 * Query: ?limit=8 (max 20)
 */

interface TopDciEntry {
  dci: string
  dciKey: string
  totalViews: number
  brands: string[] // top 2 brand names by views
}

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const limit = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "8", 10) || 8));

    const rows = await db.drug.findMany({
      where: { views: { gt: 0 } },
      orderBy: [{ views: "desc" }, { brandKey: "asc" }],
      take: limit,
    });

    const index = await getMonoIndex();

    return NextResponse.json({
      top: rows.map((d) => ({
        id: d.id,
        brand: d.brand,
        dci: d.dci,
        form: d.form,
        dosage: d.dosage,
        lab: d.lab,
        status: d.status,
        domain: d.domain,
        views: d.views,
        hasBookRcp: index ? matchMonograph(index, d.dciKey ?? d.dci) !== null : false,
      })),
      topDci: await computeTopDci(8),
    });
  } catch (error) {
    console.error("[api/drugs/top-views]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

/** Aggregates view counters per DCI (groupBy dciKey, sum views, top 2 brands). */
async function computeTopDci(take: number): Promise<TopDciEntry[]> {
  const rows = await db.drug.findMany({
    where: { views: { gt: 0 }, dciKey: { not: null } },
    select: { dci: true, dciKey: true, brand: true, views: true },
    orderBy: [{ views: "desc" }, { brandKey: "asc" }],
  });

  interface DciAgg {
    dci: string
    dciKey: string
    totalViews: number
    brands: Map<string, number> // brand → best view count
  }
  const map = new Map<string, DciAgg>();

  for (const row of rows) {
    if (!row.dciKey) continue;
    let entry = map.get(row.dciKey);
    if (!entry) {
      // Display name: DCI of the most-viewed drug of the group (rows are views-desc sorted)
      entry = { dci: row.dci ?? row.dciKey, dciKey: row.dciKey, totalViews: 0, brands: new Map() };
      map.set(row.dciKey, entry);
    }
    entry.totalViews += row.views;
    if (row.brand) {
      entry.brands.set(row.brand, Math.max(entry.brands.get(row.brand) ?? 0, row.views));
    }
  }

  return [...map.values()]
    .sort((a, b) => b.totalViews - a.totalViews || a.dciKey.localeCompare(b.dciKey))
    .slice(0, take)
    .map((e) => ({
      dci: e.dci,
      dciKey: e.dciKey,
      totalViews: e.totalViews,
      brands: [...e.brands.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([b]) => b),
    }));
}
