import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/withdrawals — market withdrawals (RETRIE) with reasons (cached 10 min).
 * Returns { total, withReason, recent, byReason, byYear }.
 */

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 10 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

export async function GET() {
  try {
    const hit = cache.get("withdrawals");
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json(hit.value);
    }

    const value = await computeWithdrawals();
    cache.set("withdrawals", { value, expires: Date.now() + TTL });
    return NextResponse.json(value);
  } catch (error) {
    console.error("[api/withdrawals]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

async function computeWithdrawals() {
  // Fetch all RETRIE rows once — withdrawDate mixes real dates ("YYYY-MM-DD")
  // with literal markers ("RETRAIT", "ABROGATION"), so filtering happens in JS.
  const [total, withReason, reasonRows, allRows] = await Promise.all([
    db.drug.count({ where: { status: "RETRIE" } }),
    db.drug.count({ where: { status: "RETRIE", withdrawReason: { not: null } } }),
    db.drug.groupBy({
      by: ["withdrawReason"],
      where: { status: "RETRIE", withdrawReason: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { withdrawReason: "desc" } },
      take: 10,
    }),
    db.drug.findMany({
      where: { status: "RETRIE", withdrawDate: { not: null } },
      select: {
        id: true,
        brand: true,
        dci: true,
        lab: true,
        withdrawDate: true,
        withdrawReason: true,
      },
    }),
  ]);

  const byReason = reasonRows.map((r) => ({
    reason: r.withdrawReason as string,
    count: r._count._all,
  }));

  // Years extracted from date-like withdrawDate values ("YYYY-MM-DD")
  const yearCount = new Map<string, number>();
  for (const row of allRows) {
    const d = row.withdrawDate ?? "";
    if (!DATE_RE.test(d)) continue;
    const y = d.slice(0, 4);
    yearCount.set(y, (yearCount.get(y) ?? 0) + 1);
  }
  const byYear = [...yearCount.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, count]) => ({ year, count }));

  // Recent withdrawals: only entries with an actual date, newest first
  const recent = allRows
    .filter((d) => DATE_RE.test(d.withdrawDate ?? ""))
    .sort((a, b) => (b.withdrawDate ?? "").localeCompare(a.withdrawDate ?? ""))
    .slice(0, 30);

  return {
    total,
    withReason,
    recent,
    byReason,
    byYear,
    generatedAt: new Date().toISOString(),
  };
}
