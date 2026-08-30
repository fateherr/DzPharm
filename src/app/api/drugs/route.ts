import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * Dictionnaire arabe (usage maghrébin) -> clés de recherche françaises.
 * Permet de chercher « باراسيتامول » et retrouver le PARACETAMOL.
 * Couverture volontairement limitée aux DCI/marques les plus courantes.
 */
const ARABIC_SEARCH_MAP: Record<string, string> = {
  "\u0628\u0627\u0631\u0627\u0633\u064a\u062a\u0627\u0645\u0648\u0644": "PARACETAMOL",
  "\u0628\u0631\u0641\u064a\u0646": "IBUPROFENE",
  "\u0623\u0645\u0648\u0643\u0633\u064a\u0633\u064a\u0644\u064a\u0646": "AMOXICILLINE",
  "\u0645\u064a\u062a\u0641\u0648\u0631\u0645\u064a\u0646": "METFORMINE",
  "\u0627\u0644\u0633\u0643\u0631": "DIABETE",
  "\u0627\u0644\u0636\u063a\u0637": "HYPERTENSION",
  "\u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629": "ALLERGIE",
  "\u0627\u0644\u0631\u0648": "OMEPRAZOLE",
  "\u0645\u0633\u0643\u0646": "ANTALGIQUE",
  "\u0645\u0636\u0627\u062f \u0627\u0644\u062d\u064a\u0648\u0627\u062a": "ANTIBIOTIQUE",
  "\u0645\u0636\u0627\u062f \u0627\u0644\u062d\u064a\u0648\u0627\u0646\u0627\u062a": "ANTIBIOTIQUE",
  "\u0645\u0636\u0627\u062f \u0627\u0644\u062a\u062e\u0631\u0628": "ANTIBIOTIQUE",
  "\u0627\u0644\u0642\u0644\u0628": "CARDIOLOGIE",
  "\u0627\u0644\u0635\u062f\u0627\u0639": "ANTALGIQUE",
  "\u0627\u0644\u062d\u0645\u0649": "ANTALGIQUE",
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646": "VITAMINE",
  "\u0627\u0644\u062d\u062f\u064a\u062f": "FER",
  "\u0625\u0646\u0633\u0648\u0644\u064a\u0646": "INSULINE",
  "\u0627\u0644\u0633\u0639\u0627\u0644": "ANTIBIOTIQUE",
  "\u0627\u0644\u0631\u0628\u0648": "ASTHME",
  "\u0627\u0644\u0631\u0628\u0648\u0629": "ASTHME",
  "\u0636\u063a\u0637 \u0627\u0644\u062f\u0645": "HYPERTENSION",
}

function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s)
}

/** Traduit la requête arabe en mot-clé français si possible. */
function mapArabicQuery(q: string): string | null {
  const trimmed = q.trim()
  if (trimmed in ARABIC_SEARCH_MAP) return ARABIC_SEARCH_MAP[trimmed]
  // tolérance : recherche par inclusion de clé
  for (const [ar, fr] of Object.entries(ARABIC_SEARCH_MAP)) {
    if (trimmed.includes(ar) || ar.includes(trimmed)) return fr
  }
  return null
}

/**
 * Distance de Levenshtein avec coupe précoce (bande à 2 lignes).
 * Utilisée uniquement comme repli « aucune réponse exacte ».
 */
function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

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
    let q = (sp.get("q") || "").trim();
    // Recherche arabe : traduire vers le mot-clé français si reconnu
    let arabicMapped = false;
    if (q && hasArabic(q)) {
      const mapped = mapArabicQuery(q);
      if (mapped) {
        q = mapped;
        arabicMapped = true;
      }
    }
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

    // Base (sans la clause q) — réutilisée par le repli flou
    const baseWhere: Prisma.DrugWhereInput = { ...where };

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

    /* ---------- Repli flou (tolérance aux fautes de frappe) ----------
     * Si la recherche exacte ne renvoie rien et que la requête est assez
     * longue, on cherche les clés de marque/DCI les plus proches
     * (distance de Levenshtein ≤ 2) et on relance une recherche « contains »
     * sur les meilleures candidates. */
    let fuzzyApplied = false;
    let fuzzyTotal = total;
    let fuzzyDrugs = drugs;
    if (total === 0 && q.length >= 5) {
      const key = q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (key.length >= 5) {
        const candidates = await db.drug.findMany({
          where: { status: "ACTIF" },
          select: { brandKey: true, dciKey: true },
          distinct: undefined,
        });
        const seen = new Set<string>();
        for (const c of candidates) {
          if (c.brandKey) seen.add(c.brandKey);
          if (c.dciKey) seen.add(c.dciKey);
        }
        const maxDist = key.length <= 7 ? 1 : 2;
        const scored: { k: string; d: number }[] = [];
        for (const k of seen) {
          // comparaison sur des tronçons : début de clé ou mots complets
          const words = k.split(" ");
          for (const w of [k, ...words]) {
            if (Math.abs(w.length - key.length) > maxDist) continue;
            const d = levenshtein(w, key, maxDist);
            if (d <= maxDist) {
              scored.push({ k, d: d + (w === k ? 0 : 1) });
              break;
            }
          }
        }
        scored.sort((a, b) => a.d - b.d);
        const best = scored.slice(0, 3).map((s) => s.k);
        if (best.length > 0) {
          const fuzzyWhere: Prisma.DrugWhereInput = {
            ...baseWhere,
            OR: [{ brandKey: { in: best } }, { dciKey: { in: best } }],
          };
          const [ft, fd] = await Promise.all([
            db.drug.count({ where: fuzzyWhere }),
            db.drug.findMany({
              where: fuzzyWhere,
              orderBy: [{ status: "asc" }, { dciKey: "asc" }],
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
          if (ft > 0) {
            fuzzyApplied = true;
            fuzzyTotal = ft;
            fuzzyDrugs = fd;
          }
        }
      }
    }

    const index = await getMonoIndex();

    const items = (fuzzyApplied ? fuzzyDrugs : drugs).map((d) => ({
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
      total: fuzzyApplied ? fuzzyTotal : total,
      page,
      pageSize,
      totalPages: Math.max(
        1,
        Math.ceil((fuzzyApplied ? fuzzyTotal : total) / pageSize)
      ),
      /** true si les résultats viennent du repli flou (tolérance aux fautes). */
      fuzzy: fuzzyApplied,
    });
  } catch (error) {
    console.error("[api/drugs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
