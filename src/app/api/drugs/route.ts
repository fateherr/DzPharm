import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * Dictionnaire arabe / darija (usage maghrébin) -> clés de recherche réelles
 * du registre. Permet de chercher « باراسيتامول » et retrouver le PARACETAMOL.
 * Q3 (audit) : étendu à 65 entrées et RE-VÉRIFIÉ contre la base — chaque
 * valeur correspond à au moins 1 produit ACTIF (dciKey/brandKey) :
 * les anciennes cibles inexistantes (ANTIBIOTIQUE, ASTHME, HYPERTENSION…)
 * ont été remplacées par des DCI/marques réelles du registre algérien.
 */
const ARABIC_SEARCH_MAP: Record<string, string> = {
  // --- Antalgiques / fièvre ---
  "\u0628\u0627\u0631\u0627\u0633\u064a\u062a\u0627\u0645\u0648\u0644": "PARACETAMOL", // paracétamol
  "\u0627\u0644\u0645\u0633\u0643\u0646": "PARACETAMOL", // le calmant
  "\u0645\u0633\u0643\u0646": "PARACETAMOL", // calmant
  "\u0627\u0644\u0635\u062f\u0627\u0639": "PARACETAMOL", // le mal de tête
  "\u0627\u0644\u062d\u0645\u0649": "PARACETAMOL", // la fièvre
  "\u0633\u062e\u0648\u0646\u064a\u0629": "PARACETAMOL", // fièvre (darija)
  "\u0628\u0631\u0641\u064a\u0646": "IBUPROFENE", // Brufen
  "\u0628\u0631\u0648\u0641\u064a\u0646": "IBUPROFENE", // Brufen (variante)
  "\u0623\u0633\u0628\u0631\u064a\u0646": "ACIDE ACETYLSALICYLIQUE", // aspirine
  "\u0627\u0633\u0628\u0631\u064a\u0646": "ACIDE ACETYLSALICYLIQUE",
  // --- Antibiotiques ---
  "\u0645\u0636\u0627\u062f \u062d\u064a\u0648\u064a": "AMOXICILLINE", // antibiotique
  "\u0645\u0636\u0627\u062f \u0627\u0644\u062d\u064a\u0648\u0627\u062a": "AMOXICILLINE", // ancienne graphie conservée
  "\u0645\u0636\u0627\u062f \u0627\u0644\u062a\u062e\u0631\u0628": "AMOXICILLINE", // ancienne graphie conservée
  "\u0623\u0645\u0648\u0643\u0633\u064a\u0633\u064a\u0644\u064a\u0646": "AMOXICILLINE",
  "\u0627\u0645\u0648\u0643\u0633\u064a\u0633\u064a\u0644\u064a\u0646": "AMOXICILLINE",
  "\u0623\u0648\u062c\u0645\u0646\u062a\u064a\u0646": "AUGMENTIN", // marque registre
  "\u0632\u064a\u062b\u0631\u0648\u0645\u0627\u064a\u0633\u064a\u0646": "AZITHROMYCINE",
  "\u0633\u064a\u0628\u0631\u0648\u0641\u0644\u0648\u0643\u0633\u0627\u0633\u064a\u0646": "CIPROFLOXACINE",
  // --- Diabète ---
  "\u0645\u064a\u062a\u0641\u0648\u0631\u0645\u064a\u0646": "METFORMINE",
  "\u0645\u064a\u062a\u0631\u0641\u0648\u0631\u0645\u064a\u0646": "METFORMINE", // graphie darija
  "\u0627\u0644\u0633\u0643\u0631": "METFORMINE", // le sucre
  "\u062f\u0648\u0627 \u0627\u0644\u0633\u0643\u0631": "METFORMINE",
  "\u062f\u0648\u0627\u0621 \u0627\u0644\u0633\u0643\u0631": "METFORMINE",
  "\u0633\u0643\u0631 \u0627\u0644\u062f\u0645": "METFORMINE",
  "\u0625\u0646\u0633\u0648\u0644\u064a\u0646": "INSULINE",
  "\u0627\u0646\u0633\u0648\u0644\u064a\u0646": "INSULINE",
  // --- Cardiovasculaire ---
  "\u0627\u0644\u0636\u063a\u0637": "AMLODIPINE", // la tension
  "\u0636\u063a\u0637 \u0627\u0644\u062f\u0645": "AMLODIPINE",
  "\u062f\u0648\u0627 \u0627\u0644\u0636\u063a\u0637": "AMLODIPINE",
  "\u0627\u0644\u0636\u063a\u0637 \u0627\u0644\u0639\u0627\u0644\u064a": "AMLODIPINE",
  "\u0627\u0644\u0642\u0644\u0628": "ACIDE ACETYLSALICYLIQUE", // le cœur
  "\u0627\u0644\u0643\u0648\u0644\u064a\u0633\u062a\u0631\u0648\u0644": "ATORVASTATINE",
  "\u0643\u0648\u0644\u064a\u0633\u062a\u0631\u0648\u0644": "ATORVASTATINE",
  "\u0645\u062f\u0631 \u0627\u0644\u0628\u0648\u0644": "FUROSEMIDE", // diurétique
  "\u0627\u0644\u0645\u062f\u0631 \u0644\u0644\u0628\u0648\u0644": "FUROSEMIDE",
  // --- Gastro ---
  "\u0627\u0644\u0631\u0648": "OMEPRAZOLE", // les brûlures (darija)
  "\u0627\u0644\u062d\u0645\u0648\u0636\u0629": "OMEPRAZOLE",
  "\u062d\u0631\u0642\u0629 \u0627\u0644\u0645\u0639\u062f\u0629": "OMEPRAZOLE",
  "\u0627\u0644\u0645\u0639\u062f\u0629": "OMEPRAZOLE",
  "\u0627\u0644\u0625\u0633\u0647\u0627\u0644": "LOPERAMIDE",
  "\u0625\u0633\u0647\u0627\u0644": "LOPERAMIDE",
  "\u0627\u0644\u0625\u0645\u0633\u0627\u0643": "LACTULOSE",
  "\u0625\u0645\u0633\u0627\u0643": "LACTULOSE",
  "\u0627\u0644\u063a\u062b\u064a\u0627\u0646": "DOMPERIDONE", // nausées
  "\u0627\u0644\u0642\u064a\u0621": "DOMPERIDONE", // vomissements
  "\u0645\u064a\u062a\u0648\u0643\u0644\u0648\u0628\u0631\u0627\u0645\u064a\u062f": "METOCLOPRAMIDE",
  // --- Respiratoire / ORL ---
  "\u0627\u0644\u0631\u0628\u0648": "SALBUTAMOL", // l'asthme
  "\u0627\u0644\u0631\u0628\u0648\u0629": "SALBUTAMOL",
  "\u0641\u064a\u0646\u062a\u0648\u0644\u064a\u0646": "SALBUTAMOL", // Ventoline (darija)
  "\u0641\u0646\u062a\u0648\u0644\u064a\u0646": "SALBUTAMOL",
  "\u0627\u0644\u0633\u0639\u0627\u0644": "CARBOCISTEINE", // la toux (→ expectorant)
  "\u0627\u0644\u0643\u062d\u0629": "CARBOCISTEINE",
  "\u0643\u062d\u0629": "CARBOCISTEINE",
  "\u0631\u0634\u062d": "PSEUDOEPHEDRINE", // rhume
  "\u0627\u0644\u0628\u0631\u062f": "PSEUDOEPHEDRINE", // le rhume
  // --- Allergies ---
  "\u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629": "CETIRIZINE",
  "\u062d\u0633\u0627\u0633\u064a\u0629": "CETIRIZINE",
  "\u0633\u064a\u062a\u064a\u0631\u064a\u0632\u064a\u0646": "CETIRIZINE",
  "\u0644\u0648\u0631\u0627\u062a\u0627\u062f\u064a\u0646": "LORATADINE",
  // --- Vitamines / fer / glandes ---
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646": "VITAMINE",
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646 \u062f": "CHOLECALCIFEROL",
  "\u0627\u0644\u062d\u062f\u064a\u062f": "FER",
  "\u062d\u0628\u0648\u0628 \u0627\u0644\u062d\u062f\u064a\u062f": "FER",
  "\u0627\u0644\u063a\u062f\u0629": "LEVOTHYROXINE", // la glande (thyroïde)
  "\u0627\u0644\u063a\u062f\u0629 \u0627\u0644\u062f\u0631\u0642\u064a\u0629": "LEVOTHYROXINE",
  "\u0644\u064a\u0641\u0648\u062b\u064a\u0631\u0648\u0643\u0633\u064a\u0646": "LEVOTHYROXINE",
  // --- SNC ---
  "\u062d\u0628\u0648\u0628 \u0627\u0644\u0646\u0648\u0645": "ZOLPIDEM", // somnifères
  "\u0627\u0644\u0646\u0648\u0645": "ZOLPIDEM",
  "\u0645\u0647\u062f\u0626": "DIAZEPAM", // calmant
  "\u062a\u0631\u0627\u0646\u0643\u064a\u0644\u0627\u0646": "DIAZEPAM", // tranquilisant (darija)
  "\u0627\u0643\u062a\u0626\u0627\u0628": "SERTRALINE", // dépression
  "\u062a\u0631\u0627\u0645\u0627\u062f\u0648\u0644": "TRAMADOL",
  // --- Divers ---
  "\u0627\u0644\u062f\u064a\u062f\u0627\u0646": "ALBENDAZOLE", // vers
  "\u0645\u0646\u0639 \u0627\u0644\u062d\u0645\u0644": "ETHINYLESTRADIOL", // contraception
};

function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

function mapArabicQuery(q: string): string | null {
  const trimmed = q.trim();
  if (trimmed in ARABIC_SEARCH_MAP) return ARABIC_SEARCH_MAP[trimmed];
  for (const [ar, fr] of Object.entries(ARABIC_SEARCH_MAP)) {
    if (trimmed.includes(ar) || ar.includes(trimmed)) return fr;
  }
  return null;
}

/**
 * Normalize to search key: uppercase, strip accents & non-alphanumerics.
 */
function toKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Distance de Levenshtein avec coupe précoce.
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

/* ------------------------------------------------------------------ */
/* Dosage parser                                                        */
/* ------------------------------------------------------------------ */

/**
 * Common unit aliases normalized to their base string for DB matching.
 * E.g. "1g" → "1000 mg", "500mg" → "500 mg", "250mg/5ml" → "250 mg/5 ml"
 */
interface ParsedDosage {
  /** The normalized numeric value in mg (if convertible) or null */
  valueMg: number | null;
  /** Original dosage token for string-based DB contains match */
  raw: string;
  /** True when parsed as grams (1g → 1000mg) */
  fromGrams: boolean;
}

const DOSAGE_RE =
  /\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(mg|g|mcg|µg|ui|iu|ml|mcu)\b(?:\/\s*(\d{1,3})\s*ml)?/i;

function parseDosageFromQuery(q: string): ParsedDosage | null {
  const m = q.match(DOSAGE_RE);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  const unit = m[2].toLowerCase();
  let valueMg: number | null = null;
  let fromGrams = false;
  if (unit === "mg") {
    valueMg = num;
  } else if (unit === "g") {
    valueMg = num * 1000;
    fromGrams = true;
  } else if (unit === "mcg" || unit === "µg") {
    valueMg = num / 1000;
  }
  // strip dosage token from raw for a cleaner "drug name" leftover
  return { valueMg, raw: m[0], fromGrams };
}

/* ------------------------------------------------------------------ */
/* Form-in-main-search parser                                          */
/* ------------------------------------------------------------------ */

/** Maps a phrase found in the search bar to one or more `form` contains keys (OR logic). */
const FORM_TOKENS: Array<{ tokens: string[]; formKeys: string[] }> = [
  // "sirop" in Algeria = any oral liquid: SIROP, BUVABLE (suspension buvable), SUSP
  { tokens: ["sirop", "sirops", "liquide", "oral"], formKeys: ["SIROP", "BUVABLE", "SUSP"] },
  { tokens: ["buvable", "buvables", "suspension", "susp"], formKeys: ["BUVABLE", "SIROP", "SUSP"] },
  { tokens: ["goutte", "gouttes", "gtt"], formKeys: ["GOUTTE"] },
  { tokens: ["comprime", "comprimes", "cp", "cpr", "tablette", "tablettes", "cachet", "cachets"], formKeys: ["COMP"] },
  { tokens: ["gelule", "gelules", "capsule", "capsules"], formKeys: ["GELULE", "GLES", "GLE"] },
  {
    tokens: ["injectable", "injection", "injections", "ampoule", "ampoules", "perfusion", "iv", "im", "inj"],
    formKeys: ["INJ", "PDRE.SOL.INJ", "PDRE. SOL.INJ", "PERF"],
  },
  { tokens: ["pommade", "pommades"], formKeys: ["POMMADE"] },
  { tokens: ["creme", "cremes", "topique", "dermique"], formKeys: ["CREME"] },
  { tokens: ["collyre", "collyres"], formKeys: ["COLLYRE"] },
  { tokens: ["suppositoire", "suppositoires", "suppo"], formKeys: ["SUPPO"] },
  { tokens: ["sachet", "sachets", "granule", "granules"], formKeys: ["SACHET", "SACHET DOSE"] },
  { tokens: ["spray", "aerosol", "aerosols", "inhalateur"], formKeys: ["SPRAY", "AEROSOL"] },
  { tokens: ["patch", "dispositif", "timbre"], formKeys: ["PATCH"] },
];

interface ParsedForm {
  /** All form keys to match (OR logic) */
  formKeys: string[];
  matchedToken: string;
}

function parseFormFromQuery(key: string): ParsedForm | null {
  // key may be uppercased (from toKey), so lowercase for comparison
  const words = key.toLowerCase().split(" ");
  for (const entry of FORM_TOKENS) {
    for (const token of entry.tokens) {
      if (words.includes(token)) {
        return { formKeys: entry.formKeys, matchedToken: token.toUpperCase() };
      }
    }
  }
  return null;
}

/** Strip matched form token and dosage token from the key. */
function stripMetaTokens(key: string, toRemove: string[]): string {
  let result = key;
  for (const t of toRemove) {
    result = result.replace(new RegExp(`\\b${t}\\b`, "gi"), " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* N-gram / token-start scoring                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns a relevance score for a drug against the query key.
 * Lower = more relevant.
 *   0 — exact word-start match on brand or DCI key
 *   1 — all query tokens appear as word-starts in brand or DCI key
 *   2 — contains match
 *   3 — fuzzy match
 */
function scoreResult(
  dciKey: string | null,
  brandKey: string | null,
  queryKey: string
): number {
  const dk = dciKey ?? "";
  const bk = brandKey ?? "";
  const tokens = queryKey.split(" ").filter((t) => t.length >= 2);

  // Exact word-start
  if (dk.startsWith(queryKey) || bk.startsWith(queryKey)) return 0;

  // All tokens appear as word starts
  const allTokenStart = tokens.every(
    (t) =>
      new RegExp(`\\b${t}`).test(dk) || new RegExp(`\\b${t}`).test(bk)
  );
  if (allTokenStart) return 1;

  // Contains match
  if (dk.includes(queryKey) || bk.includes(queryKey)) return 2;

  return 3;
}

/**
 * GET /api/drugs
 * Query params:
 *   q        — free text search (DCI, brand, lab, AMM, dosage, form) — accent/case-insensitive
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
    let form = sp.get("form") || "";
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

    const baseWhere: Prisma.DrugWhereInput = { ...where };

    // ── Enhanced query parsing ──────────────────────────────────────────
    let dosageHint: ParsedDosage | null = null;
    let formHint: ParsedForm | null = null;
    let cleanKey = "";

    if (q) {
      const rawKey = toKey(q);

      // 1. Extract dosage (e.g. "500mg", "1g", "250mg/5ml")
      dosageHint = parseDosageFromQuery(rawKey);
      let workingKey = rawKey;

      if (dosageHint) {
        workingKey = stripMetaTokens(workingKey, [toKey(dosageHint.raw)]);
      }

      // 2. Extract form (only if no explicit form filter set)
      if (!form) {
        formHint = parseFormFromQuery(workingKey);
        if (formHint) {
          workingKey = stripMetaTokens(workingKey, [formHint.matchedToken.toUpperCase()]);
          // Apply form filter — OR across all form keys (e.g. sirop → SIROP | BUVABLE | SUSP)
          if (formHint.formKeys.length === 1) {
            where.form = { contains: formHint.formKeys[0] };
          } else {
            // Multiple form keys: use AND [{ OR [form contains X, form contains Y, ...] }]
            const formOr: Prisma.DrugWhereInput[] = formHint.formKeys.map((fk) => ({
              form: { contains: fk },
            }));
            const existingAnd2 = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
            where.AND = [...existingAnd2, { OR: formOr }];
          }
        }
      }

      cleanKey = workingKey;

      // 3. Build search OR clauses on the cleaned drug name key
      const ors: Prisma.DrugWhereInput[] = [];
      if (cleanKey) {
        ors.push({ dciKey: { contains: cleanKey } });
        ors.push({ brandKey: { contains: cleanKey } });
      }
      // Also search original q (with accents) for DCI/brand display fields
      ors.push({ dci: { contains: q } });
      ors.push({ brand: { contains: q } });
      ors.push({ lab: { contains: q } });
      ors.push({ regNumber: { contains: q } });

      const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...and, { OR: ors }];

      // 4. Apply dosage filter (additively — AND dosage contains "500")
      if (dosageHint) {
        // Try exact mg value first (e.g. "1000" for 1g), then raw token
        const dosageTokens: Prisma.DrugWhereInput[] = [];
        if (dosageHint.valueMg != null) {
          const mgStr = dosageHint.valueMg % 1 === 0
            ? String(Math.round(dosageHint.valueMg))
            : String(dosageHint.valueMg);
          dosageTokens.push({ dosage: { contains: mgStr } });
        }
        // Also try original token (e.g. "1G" or "500MG")
        const rawDosageKey = toKey(dosageHint.raw).split("/")[0].trim();
        if (rawDosageKey) {
          dosageTokens.push({ dosage: { contains: rawDosageKey } });
        }
        if (dosageTokens.length > 0) {
          const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
          where.AND = [...existingAnd, { OR: dosageTokens }];
        }
      }
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

    /* ── Fuzzy fallback ──────────────────────────────────────────────
     * If exact search returns 0 results and the query has enough length,
     * use Levenshtein on brand/DCI keys to find close matches.
     * Threshold: max=1 for short queries (4-6 chars), max=2 for longer.
     * Also retry without the dosage constraint if it was too restrictive. */
    let fuzzyApplied = false;
    let fuzzyTotal = total;
    let fuzzyDrugs = drugs;

    if (total === 0 && cleanKey.length >= 4) {
      const searchKey = cleanKey || toKey(q);
      if (searchKey.length >= 4) {
        // Try relaxing dosage constraint first
        if (dosageHint) {
          const relaxedWhere: Prisma.DrugWhereInput = { ...baseWhere };
          if (formHint) relaxedWhere.form = { contains: formHint.formKeys[0] };
          const ors: Prisma.DrugWhereInput[] = [
            { dciKey: { contains: searchKey } },
            { brandKey: { contains: searchKey } },
            { dci: { contains: q } },
            { brand: { contains: q } },
          ];
          relaxedWhere.AND = [{ OR: ors }];
          const [rt, rd] = await Promise.all([
            db.drug.count({ where: relaxedWhere }),
            db.drug.findMany({
              where: relaxedWhere,
              orderBy: [{ status: "asc" }, { dciKey: "asc" }],
              skip: (page - 1) * pageSize,
              take: pageSize,
              include: {
                pharmacyProducts: { orderBy: [{ ppa: "asc" }], take: 1, select: { ppa: true, cnasId: true } },
              },
            }),
          ]);
          if (rt > 0) {
            fuzzyApplied = true;
            fuzzyTotal = rt;
            fuzzyDrugs = rd;
          }
        }

        // Full fuzzy Levenshtein if still 0
        if (!fuzzyApplied) {
          const candidates = await db.drug.findMany({
            where: { status: "ACTIF" },
            select: { brandKey: true, dciKey: true },
          });
          const seen = new Set<string>();
          for (const c of candidates) {
            if (c.brandKey) seen.add(c.brandKey);
            if (c.dciKey) seen.add(c.dciKey);
          }
          // Adaptive max distance: 1 for ≤6 chars, 2 for longer
          const maxDist = searchKey.length <= 6 ? 1 : 2;
          const scored: { k: string; d: number }[] = [];
          for (const k of seen) {
            const words = k.split(" ");
            for (const w of [k, ...words]) {
              if (Math.abs(w.length - searchKey.length) > maxDist) continue;
              const d = levenshtein(w, searchKey, maxDist);
              if (d <= maxDist) {
                scored.push({ k, d: d + (w === k ? 0 : 1) });
                break;
              }
            }
          }
          scored.sort((a, b) => a.d - b.d);
          const best = scored.slice(0, 5).map((s) => s.k);
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
    }

    /* ── Token-start relevance re-ranking (only for relevance sort) ── */
    const finalDrugs = fuzzyApplied ? fuzzyDrugs : drugs;
    const rankingKey = cleanKey || toKey(q);
    const ranked =
      sort === "relevance" && rankingKey
        ? [...finalDrugs].sort(
            (a, b) =>
              scoreResult(a.dciKey, a.brandKey, rankingKey) -
              scoreResult(b.dciKey, b.brandKey, rankingKey)
          )
        : finalDrugs;

    const index = await getMonoIndex();

    const items = ranked.map((d) => ({
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
      price: d.pharmacyProducts[0]?.ppa ?? null,
      refundable: d.pharmacyProducts[0]?.cnasId != null,
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
      fuzzy: fuzzyApplied,
      /** Parsed dosage hint — for UI debugging */
      _meta: q
        ? {
            arabicMapped,
            cleanKey,
            dosageHint: dosageHint ? { raw: dosageHint.raw, valueMg: dosageHint.valueMg } : null,
            formHint: formHint ? formHint.formKeys.join("|") : null,
          }
        : undefined,
    });
  } catch (error) {
    console.error("[api/drugs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
