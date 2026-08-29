import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/timeline — 30-year registration timeline + auto-generated narrative
 * insights. Pure computation from live data (no LLM). Cached 10 min in memory.
 */

interface TimelineYear {
  year: number
  actifs: number
  nonRenouveles: number
  retires: number
  total: number
}

interface InsightItem {
  icon: string // hint — mapped to a Lucide icon client-side
  value: string // big number (fr-FR formatted)
  label: string // short label
  text: string // one-line explanation with exact numbers
  tone: 'positive' | 'neutral' | 'warning'
}

interface TimelinePayload {
  years: TimelineYear[]
  firstYear: number
  lastYear: number
  dated: number // registrations with a parseable year
  totalDrugs: number
  insights: InsightItem[]
}

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 10 * 60 * 1000;

const MIN_YEAR = 1990;
const MAX_YEAR = 2026;

export async function GET() {
  try {
    const data = await cached("timeline", computeTimeline);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/timeline]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expires: Date.now() + TTL });
  return value;
}

const nf = new Intl.NumberFormat('fr-FR');
const fmtPct = (num: number, den: number): string =>
  den > 0 ? `${Math.round((num / den) * 100).toLocaleString('fr-FR')} %` : '—';
const fmtPct1 = (num: number, den: number): string =>
  den > 0
    ? ((num / den) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
    : '—';

async function computeTimeline(): Promise<TimelinePayload> {
  const [rows, actifs, localActifs, totalDrugs, topLab, topDomain, topForm, productsTotal, refundable] =
    await Promise.all([
      db.drug.findMany({
        where: { regDateInitial: { not: null } },
        select: { regDateInitial: true, status: true },
      }),
      db.drug.count({ where: { status: 'ACTIF' } }),
      db.drug.count({ where: { status: 'ACTIF', country: 'ALGERIE' } }),
      db.drug.count(),
      groupCount('lab', { status: 'ACTIF' }, 1),
      groupCount('domain', { status: 'ACTIF' }, 1),
      groupCount('form', { status: 'ACTIF' }, 1),
      db.pharmacyProduct.count(),
      db.pharmacyProduct.count({ where: { cnasId: { not: null } } }),
    ]);

  // --- Registration years, split by status -------------------------------
  const perYear = new Map<number, { actifs: number; nonRenouveles: number; retires: number; total: number }>();
  let dated = 0;
  for (const row of rows) {
    const m = (row.regDateInitial ?? '').match(/(\d{4})/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    if (year < MIN_YEAR || year > MAX_YEAR) continue;
    dated++;
    let entry = perYear.get(year);
    if (!entry) {
      entry = { actifs: 0, nonRenouveles: 0, retires: 0, total: 0 };
      perYear.set(year, entry);
    }
    if (row.status === 'ACTIF') entry.actifs++;
    else if (row.status === 'RETRIE') entry.retires++;
    else if (row.status === 'NON_RENOUVELE') entry.nonRenouveles++;
    entry.total++;
  }

  const yearKeys = [...perYear.keys()].sort((a, b) => a - b);
  const firstYear = yearKeys.length > 0 ? yearKeys[0] : MIN_YEAR;
  const lastYear = yearKeys.length > 0 ? yearKeys[yearKeys.length - 1] : MAX_YEAR;
  const years: TimelineYear[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const e = perYear.get(y);
    years.push({
      year: y,
      actifs: e?.actifs ?? 0,
      nonRenouveles: e?.nonRenouveles ?? 0,
      retires: e?.retires ?? 0,
      total: e?.total ?? 0,
    });
  }

  // --- Insight inputs -----------------------------------------------------
  const peak = years.reduce((best, y) => (y.total > best.total ? y : best), years[0]);
  const lastDecade = years.filter((y) => y.year > lastYear - 10);
  const avgPerYear = lastDecade.reduce((s, y) => s + y.total, 0) / Math.max(1, lastDecade.length);
  const actifsDated = years.reduce((s, y) => s + y.actifs, 0);
  const actifsBefore2010 = years
    .filter((y) => y.year < 2010)
    .reduce((s, y) => s + y.actifs, 0);

  const insights: InsightItem[] = [
    {
      icon: 'factory',
      tone: 'positive',
      value: fmtPct(localActifs, actifs),
      label: 'Production locale',
      text: `${nf.format(localActifs)} des ${nf.format(actifs)} médicaments actifs sont fabriqués en Algérie.`,
    },
  ];

  if (topLab.length > 0) {
    insights.push({
      icon: 'building',
      tone: 'neutral',
      value: fmtPct1(topLab[0].count, actifs),
      label: 'Laboratoire leader',
      text: `${topLab[0].key} — ${nf.format(topLab[0].count)} références actives, premier détenteur du marché.`,
    });
  }

  if (topDomain.length > 0) {
    insights.push({
      icon: 'activity',
      tone: 'neutral',
      value: nf.format(topDomain[0].count),
      label: 'Domaine n° 1',
      text: `${topDomain[0].key} : domaine thérapeutique le plus représenté (${fmtPct(topDomain[0].count, actifs)} des actifs).`,
    });
  }

  if (productsTotal > 0) {
    insights.push({
      icon: 'check',
      tone: 'positive',
      value: fmtPct(refundable, productsTotal),
      label: 'Remboursables CNAS',
      text: `${nf.format(refundable)} des ${nf.format(productsTotal)} produits du catalogue officine disposent d'un tarif CNAS.`,
    });
  }

  if (avgPerYear > 0) {
    insights.push({
      icon: 'chart',
      tone: 'neutral',
      value: nf.format(Math.round(avgPerYear)),
      label: 'Enregistrements / an',
      text: `en moyenne entre ${lastDecade[0]?.year ?? lastYear} et ${lastYear}, d'après les dates initiales.`,
    });
  }

  if (topForm.length > 0) {
    insights.push({
      icon: 'pill',
      tone: 'neutral',
      value: nf.format(topForm[0].count),
      label: 'Forme dominante',
      text: `la forme « ${topForm[0].key} » arrive en tête des formes galéniques (${fmtPct(topForm[0].count, actifs)} des actifs).`,
    });
  }

  if (peak && peak.total > 0) {
    insights.push({
      icon: 'trophy',
      tone: 'neutral',
      value: String(peak.year),
      label: 'Année record',
      text: `${nf.format(peak.total)} enregistrements datés de ${peak.year} — record sur la période ${firstYear}–${lastYear}.`,
    });
  }

  if (actifsDated > 0) {
    insights.push({
      icon: 'calendar',
      tone: 'warning',
      value: fmtPct(actifsBefore2010, actifsDated),
      label: 'Parc ancien',
      text: `des médicaments actifs datés ont été enregistrés avant 2010 — un parc à renouveler.`,
    });
  }

  return { years, firstYear, lastYear, dated, totalDrugs, insights };
}

/** Same groupBy pattern as /api/stats (SQLite casts for orderBy on _count). */
function groupCount(
  field: 'lab' | 'domain' | 'form',
  where: { status: string },
  take: number
): Promise<{ key: string; count: number }[]> {
  const order = { _count: { [field]: 'desc' } } as unknown as never;
  return (
    db.drug.groupBy({
      by: [field],
      where: { ...where, [field]: { not: null } } as never,
      _count: { _all: true },
      orderBy: order,
      take,
    }) as unknown as Promise<
      { [k: string]: string | null | { _all: number }; _count: { _all: number } }[]
    >
  ).then((rows) =>
    rows.filter((r) => r[field]).map((r) => ({ key: r[field] as string, count: r._count._all }))
  );
}
