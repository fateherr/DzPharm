import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/search/nl?q=… — recherche en langage naturel (heuristique locale, <100ms).
 * Parse une requête en français courant ("antibiotique sirop pour enfant") et en
 * extrait : domaine thérapeutique, forme galénique, statut, P1 hôpital,
 * remboursable CNAS, contexte pédiatrique + texte libre restant.
 * Retourne les 8 meilleurs résultats du registre + filtres interprétés.
 */

/* ------------------------------------------------------------------ */
/* Normalisation & dictionnaires de synonymes                          */
/* ------------------------------------------------------------------ */

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Domaines du registre (correspondance exacte avec Drug.domain).
 * Synonymes séparés par « | » ; une expression multi-mots s'écrit avec des espaces.
 */
const DOMAIN_SYNONYMS: Array<{ domain: string; syn: string }> = [
  { domain: "Antibiotiques", syn: "antibiotique | antibiotiques | antibiotic | atb" },
  {
    domain: "Anti-infectieux",
    syn: "anti infectieux | antiinfectieux | infectieux | infection | infections | antiviral | antiviraux | vaccin | vaccins | vaccination",
  },
  {
    domain: "Antalgiques & Anti-inflammatoires",
    syn: "antalgique | antalgiques | antidouleur | douleur | douleurs | analgesique | analgesiques | ains | anti inflammatoire | antiinflammatoire | antiinflammatoires | fievre | febrifuge | cephalée | cephalees",
  },
  {
    domain: "Diabétologie & Endocrinologie",
    syn: "diabete | diabetique | diabetiques | glycemie | endocrinologie | endocrino | thyroide",
  },
  {
    domain: "Cardiologie",
    syn: "coeur | cardiaque | cardio | tension | tensionnel | hypertension | hypotension | tachycardie | arythmie | cholesterol | triglycerides | avk",
  },
  {
    domain: "Pneumologie & Antiasthmatiques",
    syn: "asthme | asthmatique | bronchite | bronchique | pneumologie | respiration | essoufflement | dyspnee",
  },
  {
    domain: "Oncologie",
    syn: "cancer | cancers | oncologie | chimiotherapie | chimio | tumeur | tumeurs | metastase",
  },
  {
    domain: "Psychiatrie & Psychotropes",
    syn: "psychique | psychiatrie | psychiatre | deprime | depression | depressif | anxiete | anxieux | anxiolytique | neuroleptique | antidepresseur | sommeil | insomnie | calmant | sedatif",
  },
  {
    domain: "Neurologie & Antiépileptiques",
    syn: "epilepsie | epileptique | convulsion | convulsions | neurologie | neurologique | migraine | parkinson | alzheimer",
  },
  {
    domain: "Vitamines & Minéraux",
    syn: "vitamine | vitamines | mineral | mineraux | supplement | supplements | fer",
  },
  {
    domain: "Gastro-entérologie",
    syn: "estomac | gastrique | gastro | ulcerе | ulceres | reflux | digestion | digestif | nausee | nausees | vomissement | vomissements | diarrhee | constipation | laxatif | colique | brulure",
  },
  {
    domain: "Dermatologie",
    syn: "peau | cutane | dermato | dermatologie | eczema | acne | psoriasis | dermite | demangeaison",
  },
  {
    domain: "Ophtalmologie",
    syn: "yeux | oeil | oculaire | ophtalmologie | ophtalmo | vision | conjonctivite",
  },
  {
    domain: "ORL",
    syn: "gorge | nez | rhume | sinusite | otite | orl | toux | angine | laryngite | nasal | allergie | allergies | allergique",
  },
  {
    domain: "Urologie",
    syn: "urinaire | urologie | prostate | cystite | vesicale | erection | diuretique",
  },
  {
    domain: "Gynécologie & Obstétrique",
    syn: "gynecologie | gyneco | contraception | contraceptif | regles | menstruel | grossesse | ovulation",
  },
  {
    domain: "Rhumatologie",
    syn: "arthrose | articulation | articulations | rhumatisme | rhumatologie | lombalgie | sciatique",
  },
  {
    domain: "Antifongiques & Antiparasitaires",
    syn: "antifongique | antifongiques | mycose | mycoses | antiparasitaire | parasite | vermifuge | gale",
  },
];

/** Formes galéniques → valeur « contains » du registre. */
const FORM_SYNONYMS: Array<{ form: string; syn: string }> = [
  { form: "SIROP", syn: "sirop | sirops" },
  { form: "BUVABLE", syn: "buvable | buvables | suspension | susp" },
  { form: "GOUTTE", syn: "goutte | gouttes | gtt" },
  { form: "COMP", syn: "comprime | comprimes | tablette | tablettes | cp | cpr | cps | cachet | cachets" },
  { form: "GELULE", syn: "gelule | gelules | capsule | capsules" },
  { form: "INJ", syn: "injectable | injection | injections | ampoule | ampoules | perfusion | iv | im | inj" },
  { form: "POMMADE", syn: "pommade | pommades" },
  { form: "CREME", syn: "creme | cremes | topique | topiques | dermique | gel topique" },
  { form: "COLLYRE", syn: "collyre | collyres | oculaire" },
  { form: "SUPPO", syn: "suppositoire | suppositoires | suppo" },
  { form: "SACHET", syn: "sachet | sachets | granule | granules | poudre" },
  { form: "SPRAY", syn: "spray | sprays | aerosol | aerosols | inhalateur | vaporisateur | nebuliseur" },
  { form: "PATCH", syn: "patch | patches | dispositif | timbre | adhesif" },
  { form: "GEL", syn: "gel | gels" },
]

/** Mots outils ignorés (début de phrase type « médicament pour le … »). */
const STOPWORDS = new Set([
  "pour", "un", "une", "des", "le", "la", "les", "au", "aux", "du", "de", "d",
  "avec", "sans", "contre", "je", "cherche", "recherche", "recherchez", "medicament",
  "medicaments", "traitement", "traitements", "remede", "remedes", "produit",
  "produits", "qui", "que", "quel", "quelle", "quels", "quelles", "sur", "en",
  "est", "ce", "cet", "cette", "mon", "ma", "mes", "a", "the", "of",
  "avez", "vous", "faut", "il", "elle", "besoin", "voudrais", "souhaite", "donner",
  "donnez", "prendre", "prend", "pas", "plus", "moins", "trop",
]);

/* Dosage patterns in NL queries: "500mg", "1g", "250 mg", "0.5 g" */
const NL_DOSAGE_RE =
  /\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(mg|g|mcg|µg|ui|iu|ml)\b/i;

function extractDosageToken(normed: string): { token: string; valueMg: number | null } | null {
  const m = normed.match(NL_DOSAGE_RE);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  const unit = m[2].toLowerCase();
  let valueMg: number | null = null;
  if (unit === "mg") valueMg = num;
  else if (unit === "g") valueMg = num * 1000;
  return { token: m[0], valueMg };
}

/* ------------------------------------------------------------------ */
/* Parseur heuristique                                                 */
/* ------------------------------------------------------------------ */

interface Interpreted {
  q?: string;
  domain?: string;
  form?: string;
  status?: string;
  liste?: string;
  refundableOnly?: boolean;
  /** Produits réservés aux hôpitaux (P1 = HOP). */
  p1?: string;
  /** Contexte pédiatrique détecté (enfant, nourrisson…). */
  pediatric?: boolean;
  /** Dosage extracted from query (e.g. "500mg" → "500") */
  dosage?: string;
}

function parseQuery(raw: string): Interpreted {
  const tokens = norm(raw).split(" ").filter(Boolean);
  const interpreted: Interpreted = {};
  const consumed = new Set<number>();

  const matchAt = (words: string[], startIdx: number): number | null => {
    const n = words.length;
    if (n === 0 || startIdx + n > tokens.length) return null;
    for (let k = 0; k < n; k++) {
      if (tokens[startIdx + k] !== words[k]) return null;
    }
    return n;
  };

  /** Consomme tous les synonymes présents dans la requête (≥1 pour renvoyer true). */
  const tryConsume = (syn: string, onMatch: () => void): boolean => {
    const variants = syn.split("|").map((s) => s.trim().split(/\s+/).filter(Boolean));
    let matched = false;
    for (let i = 0; i < tokens.length; i++) {
      if (consumed.has(i)) continue;
      for (const words of variants) {
        const n = matchAt(words, i);
        if (n !== null) {
          for (let k = 0; k < n; k++) consumed.add(i + k);
          onMatch();
          matched = true;
          break;
        }
      }
    }
    return matched;
  };

  // 1. Domaine thérapeutique (premier synonyme trouvé)
  for (const entry of DOMAIN_SYNONYMS) {
    if (tryConsume(entry.syn, () => (interpreted.domain = entry.domain))) break;
  }

  // 2. Forme galénique
  for (const entry of FORM_SYNONYMS) {
    if (tryConsume(entry.syn, () => (interpreted.form = entry.form))) break;
  }

  // 3. Statut d'enregistrement
  tryConsume("non renouvele | renouvele", () => (interpreted.status = "NON_RENOUVELE"));
  if (!interpreted.status) {
    tryConsume("retire | retires | retiree | retirees | retrait", () => (interpreted.status = "RETRIE"));
  }
  if (!interpreted.status) {
    tryConsume("actif | actifs | active | actives", () => (interpreted.status = "ACTIF"));
  }

  // 4. Gratuit / hôpital → P1 HOP ; remboursable → CNAS ; pédiatrique
  tryConsume("hopital | hopitaux | gratuit | gratuits | gratuite", () => (interpreted.p1 = "HOP"));
  tryConsume(
    "remboursable | rembourse | rembourses | remboursement | remboursee | cnas",
    () => (interpreted.refundableOnly = true)
  );
  tryConsume(
    "enfant | enfants | pediatrique | pediatrie | bebe | bebes | nourrisson | nourrissons | pediatric",
    () => (interpreted.pediatric = true)
  );

  // 5. Dosage extraction (e.g. "500mg", "1g", "250 mg")
  const normedRaw = norm(raw);
  const dosageToken = extractDosageToken(normedRaw);
  if (dosageToken) {
    // Mark dosage tokens as consumed (remove from free text)
    const dosageWords = norm(dosageToken.token).split(" ");
    for (let i = 0; i < tokens.length; i++) {
      if (consumed.has(i)) continue;
      if (dosageWords[0] && tokens[i].startsWith(dosageWords[0].replace(/[^a-z0-9]/g, ""))) {
        consumed.add(i);
      }
    }
    if (dosageToken.valueMg != null) {
      interpreted.dosage =
        dosageToken.valueMg % 1 === 0
          ? String(Math.round(dosageToken.valueMg))
          : String(dosageToken.valueMg);
    } else {
      interpreted.dosage = norm(dosageToken.token);
    }
  }

  // 6. Texte libre restant (hors mots outils)
  const free = tokens
    .filter((_, i) => !consumed.has(i) && !STOPWORDS.has(tokens[i]))
    .join(" ")
    .trim();
  if (free) {
    interpreted.q = interpreted.q ? `${interpreted.q} ${free}` : free;
  }

  return interpreted;
}

/* ------------------------------------------------------------------ */
/* Requête registre (même sémantique que /api/drugs)                   */
/* ------------------------------------------------------------------ */

function normalizeKey(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const raw = (req.nextUrl.searchParams.get("q") || "").trim();
    if (!raw) {
      return NextResponse.json({ interpreted: {}, drugs: [], total: 0 });
    }

    const interpreted = parseQuery(raw);
    const where: Prisma.DrugWhereInput = {};

    if (interpreted.domain) where.domain = interpreted.domain;
    if (interpreted.form) where.form = { contains: interpreted.form };
    if (interpreted.status) where.status = interpreted.status;
    if (interpreted.p1) where.p1 = { contains: interpreted.p1 };
    if (interpreted.refundableOnly) {
      where.pharmacyProducts = { some: { cnasId: { not: null } } };
    }
    if (interpreted.q) {
      const key = normalizeKey(interpreted.q);
      const ors: Prisma.DrugWhereInput[] = [];
      if (key) {
        ors.push({ dciKey: { contains: key } });
        ors.push({ brandKey: { contains: key } });
      }
      ors.push({ dci: { contains: interpreted.q } });
      ors.push({ brand: { contains: interpreted.q } });
      where.AND = [{ OR: ors }];
    }
    // Apply dosage filter if extracted — use OR to match both converted mg value
    // and original token (e.g. "1000" OR "1G" for a 1g query)
    if (interpreted.dosage) {
      const dosageOrs: Prisma.DrugWhereInput[] = [
        { dosage: { contains: interpreted.dosage } },
      ];
      // Also try the original raw dosage text from the query (e.g. "1G", "500MG")
      const rawDosageMatch = norm(raw).match(/\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(mg|g|mcg|ui|ml)\b/i);
      if (rawDosageMatch) {
        const rawToken = (rawDosageMatch[1] + rawDosageMatch[2]).toUpperCase().replace(",", ".");
        if (rawToken !== interpreted.dosage) {
          dosageOrs.push({ dosage: { contains: rawToken } });
        }
      }
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { OR: dosageOrs }];
    }

    let [total, drugs] = await Promise.all([
      db.drug.count({ where }),
      db.drug.findMany({
        where,
        orderBy: [{ status: "asc" }, { dciKey: "asc" }],
        take: 40,
        include: {
          pharmacyProducts: {
            orderBy: [{ ppa: "asc" }],
            take: 1,
            select: { ppa: true, cnasId: true },
          },
        },
      }),
    ]);

    // Domain relaxation fallback: if domain filter returns 0, retry without domain.
    // This covers cases like "antibiotique" (maps to "Antibiotiques") but AUGMENTIN
    // is in "Anti-infectieux" — keeping other filters (form, dosage) intact.
    if (total === 0 && interpreted.domain) {
      const relaxedWhere = { ...where };
      delete relaxedWhere.domain;
      const [rt, rd] = await Promise.all([
        db.drug.count({ where: relaxedWhere }),
        db.drug.findMany({
          where: relaxedWhere,
          orderBy: [{ status: "asc" }, { dciKey: "asc" }],
          take: 40,
          include: {
            pharmacyProducts: {
              orderBy: [{ ppa: "asc" }],
              take: 1,
              select: { ppa: true, cnasId: true },
            },
          },
        }),
      ]);
      if (rt > 0) {
        total = rt;
        drugs = rd;
      }
    }

    // Contexte pédiatrique : privilégier les spécialités « ENFANT / PEDIATRIQUE »
    let ranked = drugs;
    if (interpreted.pediatric) {
      ranked = [...drugs].sort((a, b) => {
        const pa = /ENFANT|PEDIATR|NOURRISSON|BEBE/.test(a.brandKey ?? "") ? 0 : 1;
        const pb = /ENFANT|PEDIATR|NOURRISSON|BEBE/.test(b.brandKey ?? "") ? 0 : 1;
        return pa - pb;
      });
    }

    const index = await getMonoIndex();
    const items = ranked.slice(0, 8).map((d) => ({
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

    return NextResponse.json({ interpreted, drugs: items, total });
  } catch (error) {
    console.error("[api/search/nl]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
