import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/stats — aggregated dashboard statistics (cached 5 min in memory)
 */

type Counts = { key: string; count: number }[];

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 5 * 60 * 1000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expires: Date.now() + TTL });
  return value;
}

export async function GET() {
  try {
    const data = await cached("stats", computeStats);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/stats]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

async function computeStats() {
  const [
    total,
    actifs,
    nonRenew,
    retires,
    local,
    monographs,
    topLabs,
    topDci,
    topForms,
    domains,
    countries,
    listes,
    priceStats,
  ] = await Promise.all([
    db.drug.count(),
    db.drug.count({ where: { status: "ACTIF" } }),
    db.drug.count({ where: { status: "NON_RENOUVELE" } }),
    db.drug.count({ where: { status: "RETRIE" } }),
    // Local production among ACTIVE drugs only — the donut is labelled
    // "Répartition des médicaments actifs" (imported = actifs - local).
    db.drug.count({ where: { status: "ACTIF", country: "ALGERIE" } }),
    db.monograph.count().catch(() => 0),
    groupCount("lab", { status: "ACTIF" }, 12),
    groupCount("dci", { status: "ACTIF" }, 12),
    groupCount("form", { status: "ACTIF" }, 12),
    groupCount("domain", { status: "ACTIF" }, 30),
    groupCount("country", { status: "ACTIF" }, 10),
    groupCount("liste", { status: "ACTIF" }, 10),
    computePriceStats(),
  ]);

  return {
    total,
    actifs,
    nonRenew,
    retires,
    imported: actifs - local,
    local,
    monographs,
    topLabs,
    topDci,
    topForms,
    domains,
    countries,
    listes,
    prices: priceStats,
    generatedAt: new Date().toISOString(),
  };
}

/** Catalogue officine : répartition par classe, tranches de prix, stats globales. */
async function computePriceStats() {
  const [productsTotal, linked, refundable, avgRow, classRows] = await Promise.all([
    db.pharmacyProduct.count(),
    db.pharmacyProduct.count({ where: { drugId: { not: null } } }),
    db.pharmacyProduct.count({ where: { cnasId: { not: null } } }),
    db.pharmacyProduct.aggregate({
      where: { ppa: { not: null } },
      _avg: { ppa: true },
      _min: { ppa: true },
      _max: { ppa: true },
    }),
    db.pharmacyProduct.groupBy({
      by: ["class"],
      where: { class: { not: null }, ppa: { not: null } },
      _count: { _all: true },
      _avg: { ppa: true },
      orderBy: { _count: { class: "desc" } },
      take: 8,
    }),
  ]);

  // price ranges
  const [r1, r2, r3, r4, r5] = await Promise.all([
    db.pharmacyProduct.count({ where: { ppa: { lt: 200 } } }),
    db.pharmacyProduct.count({ where: { ppa: { gte: 200, lt: 500 } } }),
    db.pharmacyProduct.count({ where: { ppa: { gte: 500, lt: 1000 } } }),
    db.pharmacyProduct.count({ where: { ppa: { gte: 1000, lt: 5000 } } }),
    db.pharmacyProduct.count({ where: { ppa: { gte: 5000 } } }),
  ]);

  return {
    productsTotal,
    linked,
    parapharma: productsTotal - linked,
    refundable,
    avgPpa: avgRow._avg.ppa ? Math.round(avgRow._avg.ppa * 100) / 100 : null,
    minPpa: avgRow._min.ppa,
    maxPpa: avgRow._max.ppa,
    ranges: [
      { label: "< 200 DA", count: r1 },
      { label: "200–500 DA", count: r2 },
      { label: "500–1000 DA", count: r3 },
      { label: "1000–5000 DA", count: r4 },
      { label: "≥ 5000 DA", count: r5 },
    ],
    byClass: classRows
      .filter((c) => c.class)
      .map((c) => ({
        key: c.class as string,
        count: c._count._all,
        avg: c._avg.ppa ? Math.round(c._avg.ppa) : null,
      })),
  };
}

function groupCount(
  field: "lab" | "dci" | "form" | "domain" | "country" | "liste",
  where: { status: string },
  take: number
): Promise<Counts> {
  const order = { _count: { [field]: "desc" } } as unknown as never;
  return (db.drug.groupBy({
    by: [field],
    where: { ...where, [field]: { not: null } } as never,
    _count: { _all: true },
    orderBy: order,
    take,
  }) as unknown as Promise<
    { [k: string]: string | null | { _all: number }; _count: { _all: number } }[]
  >).then(
    (rows) =>
      rows
        .filter((r) => r[field])
        .map((r) => ({ key: r[field] as string, count: r._count._all }))
  );
}
