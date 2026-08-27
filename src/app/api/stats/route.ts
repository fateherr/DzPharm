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
  ] = await Promise.all([
    db.drug.count(),
    db.drug.count({ where: { status: "ACTIF" } }),
    db.drug.count({ where: { status: "NON_RENOUVELE" } }),
    db.drug.count({ where: { status: "RETRIE" } }),
    db.drug.count({ where: { country: "ALGERIE" } }),
    db.monograph.count().catch(() => 0),
    groupCount("lab", { status: "ACTIF" }, 12),
    groupCount("dci", { status: "ACTIF" }, 12),
    groupCount("form", { status: "ACTIF" }, 12),
    groupCount("domain", { status: "ACTIF" }, 30),
    groupCount("country", { status: "ACTIF" }, 10),
    groupCount("liste", { status: "ACTIF" }, 10),
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
    generatedAt: new Date().toISOString(),
  };
}

function groupCount(
  field: "lab" | "dci" | "form" | "domain" | "country" | "liste",
  where: { status: string },
  take: number
): Promise<Counts> {
  return (db.drug.groupBy({
    by: [field],
    where: { ...where, [field]: { not: null } } as never,
    _count: { _all: true },
    orderBy: { _count: { [field]: "desc" } } as never,
    take,
  }) as unknown as Promise<{ [k: string]: string | null; _count: { _all: number } }[]>).then(
    (rows) =>
      rows
        .filter((r) => r[field])
        .map((r) => ({ key: r[field] as string, count: r._count._all }))
  );
}
