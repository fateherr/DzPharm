import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/domains — therapeutic domains with counts + pharmacological classes
 */
const cache = new Map<string, { value: unknown; expires: number }>();

export async function GET() {
  try {
    const hit = cache.get("domains");
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json(hit.value);
    }

    const [domainRows, forms, listes, countries] = await Promise.all([
      db.drug.groupBy({
        by: ["domain"],
        where: { domain: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { domain: "desc" } },
        take: 40,
      }),
      db.drug.groupBy({
        by: ["form"],
        where: { status: "ACTIF", form: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { form: "desc" } },
        take: 30,
      }),
      db.drug.groupBy({
        by: ["liste"],
        where: { status: "ACTIF", liste: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { liste: "desc" } },
        take: 12,
      }),
      db.drug.groupBy({
        by: ["country"],
        where: { status: "ACTIF", country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 12,
      }),
    ]);

    const domains = domainRows
      .filter((r) => r.domain)
      .map((r) => ({ name: r.domain as string, count: r._count._all }));

    const value = {
      domains,
      forms: forms.filter((f) => f.form).map((f) => ({ name: f.form, count: f._count._all })),
      listes: listes.filter((l) => l.liste).map((l) => ({ name: l.liste, count: l._count._all })),
      countries: countries
        .filter((c) => c.country)
        .map((c) => ({ name: c.country, count: c._count._all })),
    };

    cache.set("domains", { value, expires: Date.now() + 5 * 60 * 1000 });
    return NextResponse.json(value);
  } catch (error) {
    console.error("[api/domains]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
