import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/labs — searchable laboratory directory (cached 10 min in memory).
 * Query: ?q= (normalized search on lab name) &page= &pageSize= (default 1/20, max 100)
 */

interface LabEntry {
  lab: string;
  totalProducts: number;
  actifs: number;
  retraites: number;
  nonRenouveles: number;
  localShare: number; // products manufactured in Algeria (country = ALGERIE)
  countries: string[]; // top 3 distinct origin countries
  topDomain: string | null; // main therapeutic domain by product count
}

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 10 * 60 * 1000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expires: Date.now() + TTL });
  return value;
}

/** Uppercase + strip accents — mirrors the dciKey/brandKey normalization. */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10) || 20));

    // Full aggregation cached once — filtering/pagination is in-memory (≈1k labs).
    const allLabs = await cached("labs-directory", computeLabDirectory);

    const needle = q ? normalizeName(q) : "";
    const filtered = needle
      ? allLabs.labs.filter((l) => normalizeName(l.lab).includes(needle))
      : allLabs.labs;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return NextResponse.json({
      labs: filtered.slice(start, start + pageSize),
      total,
      page: safePage,
      totalPages,
      topLabsQuick: allLabs.topLabsQuick,
      topFiltered: filtered.length > 0 ? { lab: filtered[0].lab, totalProducts: filtered[0].totalProducts } : null,
    });
  } catch (error) {
    console.error("[api/labs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

/** Aggregates the whole registry per laboratory: products, statuses, origins, domain. */
async function computeLabDirectory() {
  const orderCount = { _count: { lab: "desc" } } as unknown as never;

  const [byLab, byLabStatus, byLabCountry, byLabDomain] = await Promise.all([
    db.drug.groupBy({
      by: ["lab"],
      where: { lab: { not: null } },
      _count: { _all: true },
      orderBy: orderCount,
    }) as unknown as Promise<{ lab: string | null; _count: { _all: number } }[]>,
    db.drug.groupBy({
      by: ["lab", "status"],
      _count: { _all: true },
    }) as unknown as Promise<
      { lab: string | null; status: string; _count: { _all: number } }[]
    >,
    db.drug.groupBy({
      by: ["lab", "country"],
      where: { country: { not: null } },
      _count: { _all: true },
    }) as unknown as Promise<
      { lab: string | null; country: string | null; _count: { _all: number } }[]
    >,
    db.drug.groupBy({
      by: ["lab", "domain"],
      where: { domain: { not: null } },
      _count: { _all: true },
    }) as unknown as Promise<
      { lab: string | null; domain: string | null; _count: { _all: number } }[]
    >,
  ]);

  interface LabAgg {
    totalProducts: number;
    actifs: number;
    retraites: number;
    nonRenouveles: number;
    localShare: number;
    countries: Map<string, number>;
    domains: Map<string, number>;
  }

  const map = new Map<string, LabAgg>();
  const agg = (lab: string | null): LabAgg | undefined => {
    if (!lab) return undefined;
    let entry = map.get(lab);
    if (!entry) {
      entry = {
        totalProducts: 0,
        actifs: 0,
        retraites: 0,
        nonRenouveles: 0,
        localShare: 0,
        countries: new Map(),
        domains: new Map(),
      };
      map.set(lab, entry);
    }
    return entry;
  };

  for (const row of byLab) {
    const entry = agg(row.lab);
    if (entry) entry.totalProducts = row._count._all;
  }
  for (const row of byLabStatus) {
    const entry = agg(row.lab);
    if (!entry) continue;
    if (row.status === "ACTIF") entry.actifs = row._count._all;
    else if (row.status === "RETRIE") entry.retraites = row._count._all;
    else if (row.status === "NON_RENOUVELE") entry.nonRenouveles = row._count._all;
  }
  for (const row of byLabCountry) {
    const entry = agg(row.lab);
    if (!entry || !row.country) continue;
    entry.countries.set(row.country, (entry.countries.get(row.country) ?? 0) + row._count._all);
    if (row.country === "ALGERIE") entry.localShare = row._count._all;
  }
  for (const row of byLabDomain) {
    const entry = agg(row.lab);
    if (!entry || !row.domain) continue;
    entry.domains.set(row.domain, (entry.domains.get(row.domain) ?? 0) + row._count._all);
  }

  const labs: LabEntry[] = [...map.entries()]
    .map(([lab, e]) => ({
      lab,
      totalProducts: e.totalProducts,
      actifs: e.actifs,
      retraites: e.retraites,
      nonRenouveles: e.nonRenouveles,
      localShare: e.localShare,
      countries: [...e.countries.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c),
      topDomain:
        [...e.domains.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .filter((l) => l.totalProducts > 0)
    .sort((a, b) => b.totalProducts - a.totalProducts || a.lab.localeCompare(b.lab));

  return {
    labs,
    topLabsQuick: labs.slice(0, 8).map((l) => ({ lab: l.lab, totalProducts: l.totalProducts })),
  };
}
