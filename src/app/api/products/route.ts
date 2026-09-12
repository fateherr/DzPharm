import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * GET /api/products — catalogue officine (liste des prix PPA)
 * Query params:
 *   q          — recherche libre (nom, labo) — accents/casse ignorés
 *   class      — classe thérapeutique (exact)
 *   category   — all (défaut) | drug (médicaments enregistrés) | parapharma
 *   refundable — 1 => uniquement produits remboursables CNAS
 *   lab        — laboratoire (contains)
 *   minPrice   — prix minimum (DA)
 *   maxPrice   — prix maximum (DA)
 *   sort       — name | priceAsc | priceDesc (défaut name)
 *   page / pageSize (défaut 20 / max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const klass = sp.get("class") || "";
    const category = sp.get("category") || "all";
    const refundable = sp.get("refundable") === "1";
    const lab = (sp.get("lab") || "").trim();
    const minPrice = parseFloat(sp.get("minPrice") || "");
    const maxPrice = parseFloat(sp.get("maxPrice") || "");
    const sort = sp.get("sort") || "name";
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10) || 20));

    const where: Prisma.PharmacyProductWhereInput = {};

    if (category === "drug") where.drugId = { not: null };
    else if (category === "parapharma") where.drugId = null;
    if (refundable) where.cnasId = { not: null };
    if (klass) where.class = klass;
    if (lab) where.lab = { contains: lab };
    if (!Number.isNaN(minPrice)) where.ppa = { ...(where.ppa as object), gte: minPrice };
    if (!Number.isNaN(maxPrice)) where.ppa = { ...(where.ppa as object), lte: maxPrice };

    if (q) {
      const key = q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const ors: Prisma.PharmacyProductWhereInput[] = [];
      if (key) ors.push({ nameKey: { contains: key } });
      ors.push({ name: { contains: q } });
      ors.push({ lab: { contains: q } });
      const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []
      where.AND = [...and, { OR: ors }];
    }

    const orderBy: Prisma.PharmacyProductOrderByWithRelationInput[] =
      sort === "priceAsc"
        ? [{ ppa: "asc" }]
        : sort === "priceDesc"
          ? [{ ppa: "desc" }]
          : [{ nameKey: "asc" }];

    const [total, products, agg] = await Promise.all([
      db.pharmacyProduct.count({ where }),
      db.pharmacyProduct.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          drug: {
            select: { id: true, dci: true, status: true, domain: true, form: true, dosage: true },
          },
        },
      }),
      db.pharmacyProduct.aggregate({
        where: { ...where, ppa: { not: null } },
        _avg: { ppa: true },
        _min: { ppa: true },
        _max: { ppa: true },
      }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        lab: p.lab,
        ppa: p.ppa,
        cnasId: p.cnasId,
        refundable: p.cnasId !== null,
        class: p.class,
        drug: p.drug,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      priceStats: {
        avg: agg._avg.ppa ? Math.round(agg._avg.ppa * 100) / 100 : null,
        min: agg._min.ppa,
        max: agg._max.ppa,
      },
    });
  } catch (error) {
    console.error("[api/products]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
