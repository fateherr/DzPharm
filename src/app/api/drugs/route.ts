import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/drugs
 * Query params:
 *   q        — free text search (DCI, brand, lab, AMM) — accent/case-insensitive
 *   status   — ACTIF | NON_RENOUVELE | RETRIE (comma-separated)
 *   domain   — therapeutic domain (exact)
 *   form     — pharmaceutical form (contains)
 *   liste    — Liste I/II/Tableau (exact)
 *   country  — lab country (exact)
 *   lab      — laboratory (contains)
 *   page     — 1-based page number (default 1)
 *   pageSize — default 20, max 100
 *   sort     — relevance | brand | dci | lab | dateInitial | dateFinal
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10) || 20));
    const status = sp.get("status") || "";
    const domain = sp.get("domain") || "";
    const form = sp.get("form") || "";
    const liste = sp.get("liste") || "";
    const country = sp.get("country") || "";
    const lab = (sp.get("lab") || "").trim();
    const sort = sp.get("sort") || "relevance";

    const where: Prisma.DrugWhereInput = {};

    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (domain) where.domain = domain;
    if (form) where.form = { contains: form };
    if (liste) where.liste = liste;
    if (country) where.country = country;
    if (lab) where.lab = { contains: lab };

    if (q) {
      // normalize query the same way dciKey/brandKey were normalized:
      // uppercase, strip accents & non-alphanumerics
      const key = q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const ors: Prisma.DrugWhereInput[] = [];
      if (key) {
        ors.push({ dciKey: { contains: key } });
        ors.push({ brandKey: { contains: key } });
      }
      ors.push({ dci: { contains: q } });
      ors.push({ brand: { contains: q } });
      ors.push({ lab: { contains: q } });
      ors.push({ regNumber: { contains: q } });
      const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...and, { OR: ors }];
    }

    const orderBy: Prisma.DrugOrderByWithRelationInput[] =
      sort === "brand"
        ? [{ brandKey: "asc" }]
        : sort === "dci"
          ? [{ dciKey: "asc" }]
          : sort === "lab"
            ? [{ lab: "asc" }]
            : sort === "dateInitial"
              ? [{ regDateInitial: "desc" }]
              : sort === "dateFinal"
                ? [{ regDateFinal: "desc" }]
                : [{ status: "asc" }, { dciKey: "asc" }];

    const [total, drugs] = await Promise.all([
      db.drug.count({ where }),
      db.drug.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          pharmacyProducts: {
            orderBy: [{ ppa: "asc" }],
            take: 1,
            select: { ppa: true, cnasId: true },
          },
        },
      }),
    ]);
    const index = await getMonoIndex();

    const items = drugs.map((d) => ({
      id: d.id,
      regNumber: d.regNumber,
      dci: d.dci,
      brand: d.brand,
      form: d.form,
      dosage: d.dosage,
      packaging: d.packaging,
      lab: d.lab,
      country: d.country,
      liste: d.liste,
      p1: d.p1,
      p2: d.p2,
      type: d.type,
      statut: d.statut,
      status: d.status,
      domain: d.domain,
      domains: d.domains ? (JSON.parse(d.domains) as string[]) : [],
      regDateInitial: d.regDateInitial,
      regDateFinal: d.regDateFinal,
      /** Prix public (PPA, DA) du produit d'officine correspondant — plus bas si plusieurs. */
      price: d.pharmacyProducts[0]?.ppa ?? null,
      /** Présent sur la liste CNAS => remboursable. */
      refundable: d.pharmacyProducts[0]?.cnasId != null,
      /** RCP issu des livres techniques disponible pour cette DCI. */
      hasBookRcp: index ? matchMonograph(index, d.dciKey ?? d.dci) !== null : false,
    }));

    return NextResponse.json({
      drugs: items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("[api/drugs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
