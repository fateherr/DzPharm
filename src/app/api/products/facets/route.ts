import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products/facets — classes + labs + global counts for the catalog filters (cached 5 min)
 */
const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const hit = cache.get("facets");
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json(hit.value);
    }
    const [classes, labs, total, linked, refundable] = await Promise.all([
      db.pharmacyProduct.groupBy({
        by: ["class"],
        where: { class: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { class: "desc" } },
      }),
      db.pharmacyProduct.groupBy({
        by: ["lab"],
        where: { AND: [{ lab: { not: null } }, { lab: { not: "" } }] },
        _count: { _all: true },
        orderBy: { _count: { lab: "desc" } },
        take: 15,
      }),
      db.pharmacyProduct.count(),
      db.pharmacyProduct.count({ where: { drugId: { not: null } } }),
      db.pharmacyProduct.count({ where: { cnasId: { not: null } } }),
    ]);

    const data = {
      classes: classes
        .filter((c) => c.class)
        .map((c) => ({ key: c.class as string, count: c._count._all })),
      labs: labs
        .filter((l) => l.lab)
        .map((l) => ({ key: l.lab as string, count: l._count._all })),
      total,
      linked,
      parapharma: total - linked,
      refundable,
    };
    cache.set("facets", { value: data, expires: Date.now() + TTL });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/products/facets]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
