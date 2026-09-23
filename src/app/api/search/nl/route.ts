import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/search/nl?q=… — recherche en langage naturel (heuristique locale, <50ms).
 * Parse une requête en français courant ou dialecte maghrébin ("antibiotique sirop pour enfant", "دوا الراس", "boumada safra")
 * et en extrait : domaine thérapeutique, forme galénique, statut, P1 hôpital,
 * remboursable CNAS, contexte pédiatrique, dosage + texte libre restant.
 */

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Domaines du registre avec synonymes cliniques & symptômes populaires.
 */
const DOMAIN_SYNONYMS: Array<{ domain: string; syn: string }> = [
  {
    domain: "Antibiotiques",
    syn: "antibiotique | antibiotiques | antibiotic | atb | bacterien | bacterienne | angine bacterienne",
  },
  {
    domain: "Anti-infectieux",
    syn: "anti infectieux | antiinfectieux | infectieux | infection | infections | antiviral | antiviraux | vaccin | vaccins | vaccination",
  },
  {
    domain: "Antalgiques & Anti-inflammatoires",
    syn: "antalgique | antalgiques | antidouleur | douleur | douleurs | analgesique | analgesiques | ains | anti inflammatoire | antiinflammatoire | antiinflammatoires | fievre | febrifuge | cephalée | cephalees | migraine | migraines | mal de tete | maux de tete | mal de dos | courbatures | regles douloureuses",
  },
  {
    domain: "Diabétologie & Endocrinologie",
    syn: "diabete | diabetique | diabetiques | glycemie | endocrinologie | endocrino | thyroide | insuline | sucre | dwa sokor",
  },
  {
    domain: "Cardiologie",
    syn: "coeur | cardiaque | cardio | tension | tensionnel | hypertension | hypotension | tachycardie | arythmie | cholesterol | triglycerides | avk | dwa lkelb",
  },
  {
    domain: "Pneumologie & Antiasthmatiques",
    syn: "asthme | asthmatique | bronchite | bronchique | pneumologie | respiration | essoufflement | dyspnee | ventoline | bouffee",
  },
  {
    domain: "Oncologie",
    syn: "cancer | cancers | oncologie | chimiotherapie | chimio | tumeur | tumeurs | metastase",
  },
  {
    domain: "Psychiatrie & Psychotropes",
    syn: "psychique | psychiatrie | psychiatre | deprime | depression | depressif | anxiete | anxieux | anxiolytique | neuroleptique | antidepresseur | sommeil | insomnie | calmant | sedatif | stress | angoisse",
  },
  {
    domain: "Neurologie & Antiépileptiques",
    syn: "epilepsie | epileptique | convulsion | convulsions | neurologie | neurologique | parkinson | alzheimer | vertige | vertiges | doukha",
  },
  {
    domain: "Vitamines & Minéraux",
    syn: "vitamine | vitamines | mineral | mineraux | supplement | supplements | fer | carence | fatigue | anemie",
  },
  {
    domain: "Gastro-entérologie",
    syn: "estomac | gastrique | gastro | ulcere | ulceres | reflux | digestion | digestif | nausee | nausees | vomissement | vomissements | diarrhee | constipation | laxatif | colique | brulure | brulures destomac | brulure destomac | acidite | rgo | spasme | spasmes | maux de ventre | mal au ventre",
  },
  {
    domain: "Dermatologie",
    syn: "peau | cutane | dermato | dermatologie | eczema | acne | psoriasis | dermite | demangeaison | demangeaisons | bouton | boutons | brulure cutanee | cicatrisant",
  },
  {
    domain: "Ophtalmologie",
    syn: "yeux | oeil | oculaire | ophtalmologie | ophtalmo | vision | conjonctivite | yeux rouges | orgelet | larmoiement",
  },
  {
    domain: "ORL",
    syn: "gorge | nez | rhume | sinusite | otite | orl | toux | toux seche | toux grasse | angine | laryngite | nasal | nez bouche | eternuement | eternuements | allergie | allergies | allergique | rhinite",
  },
  {
    domain: "Urologie",
    syn: "urinaire | urologie | prostate | cystite | vesicale | erection | diuretique | infection urinaire",
  },
  {
    domain: "Gynécologie & Obstétrique",
    syn: "gynecologie | gyneco | contraception | contraceptif | regles | menstruel | grossesse | ovulation | mycose vaginale",
  },
  {
    domain: "Rhumatologie",
    syn: "arthrose | articulation | articulations | rhumatisme | rhumatologie | lombalgie | sciatique | tendinite | arthrite",
  },
  {
    domain: "Antifongiques & Antiparasitaires",
    syn: "antifongique | antifongiques | mycose | mycoses | antiparasitaire | parasite | vermifuge | gale | vers",
  },
];

/**
 * Correspondances spécifiques algériennes (Noms familiers / de rue).
 */
const POPULAR_ALGERIAN_MAPPINGS: Array<{ match: string; dciOrBrand: string }> = [
  { match: "boumada safra | بومادا صفراء | البومادا الصفراء", dciOrBrand: "CHLORTETRACYCLINE" },
  { match: "boumada kahla | بومادا كحلة | البومادا الكحلة", dciOrBrand: "SULFOBITUMINATE" },
  { match: "cachi zreg | cachet bleu | كاشي زرق | الكاشي الزرق", dciOrBrand: "METRONIDAZOLE" },
  { match: "dwa rass | dwa erass | دوا الراس", dciOrBrand: "PARACETAMOL" },
  { match: "dwa sokor | دوا السكر", dciOrBrand: "METFORMINE" },
  { match: "dwa lkelb | dwa el kalb | دوا القلب", dciOrBrand: "ACIDE ACETYLSALICYLIQUE" },
  { match: "dwa so3la | dwa sou3la | دوا السعلة | سيرو السعلة", dciOrBrand: "CARBOCISTEINE" },
  { match: "dwa hrig | دوا الحريق", dciOrBrand: "OMEPRAZOLE" },
];

/** Formes galéniques → valeur « contains » du registre. */
const FORM_SYNONYMS: Array<{ form: string; syn: string }> = [
  { form: "SIROP", syn: "sirop | sirops | liquide | oral | buvable | buvables | suspension | susp" },
  { form: "GOUTTE", syn: "goutte | gouttes | gtt" },
  { form: "COMP", syn: "comprime | comprimes | tablette | tablettes | cp | cpr | cps | cachet | cachets | حبوب | كاشي" },
  { form: "GELULE", syn: "gelule | gelules | capsule | capsules" },
  { form: "INJ", syn: "injectable | injection | injections | ampoule | ampoules | perfusion | iv | im | inj | حقنة | إبرة" },
  { form: "POMMADE", syn: "pommade | pommades | بومادا" },
  { form: "CREME", syn: "creme | cremes | topique | topiques | dermique | gel topique" },
  { form: "COLLYRE", syn: "collyre | collyres | oculaire | قطرة" },
  { form: "SUPPO", syn: "suppositoire | suppositoires | suppo | قويلبات" },
  { form: "SACHET", syn: "sachet | sachets | granule | granules | poudre | كواغط" },
  { form: "SPRAY", syn: "spray | sprays | aerosol | aerosols | inhalateur | vaporisateur | nebuliseur | بخاخ" },
  { form: "PATCH", syn: "patch | patches | dispositif | timbre | adhesif" },
  { form: "GEL", syn: "gel | gels" },
];

/** Mots outils ignorés. */
const STOPWORDS = new Set([
  "pour", "un", "une", "des", "le", "la", "les", "au", "aux", "du", "de", "d",
  "avec", "sans", "contre", "je", "cherche", "recherche", "recherchez", "medicament",
  "medicaments", "traitement", "traitements", "remede", "remedes", "produit",
  "produits", "qui", "que", "quel", "quelle", "quels", "quelles", "sur", "en",
  "est", "ce", "cet", "cette", "mon", "ma", "mes", "a", "the", "of",
  "avez", "vous", "faut", "il", "elle", "besoin", "voudrais", "souhaite", "donner",
  "donnez", "prendre", "prend", "pas", "plus", "moins", "trop",
  "من", "عن", "على", "في", "إلى", "هو", "هي", "هذا", "هذه", "عندي", "نحوس", "حبيت", "اعطيني",
]);

/* Dosage patterns in NL queries */
const NL_DOSAGE_RE =
  /\b(\d{1,6}(?:[.,]\d{1,3})?)\s*(mg|g|mcg|µg|ui|iu|ml)\b/i;

function extractDosageToken(normed: string): { token: string; valueMg: number | null; display: string } | null {
  // Fortes UI (Vitamine D, Heparine : 200000, 100000, 50000)
  const uiMatch = normed.match(/\b(\d{1,3}(?:\s*\d{3})*|\d{2,6})\s*(ui|iu)\b/i);
  if (uiMatch) {
    const rawDigits = uiMatch[1].replace(/\s+/g, "");
    return { token: `${rawDigits}UI`, valueMg: null, display: `${rawDigits} UI` };
  }

  // Pourcentages (0.05%, 1%, 2%)
  const pctMatch = normed.match(/\b(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    return { token: `${pctMatch[1]}%`, valueMg: null, display: `${pctMatch[1]}%` };
  }

  // Ratios (1g/200mg, 80/12.5)
  const ratioMatch = normed.match(/\b(\d+(?:[.,]\d+)?\s*(?:mg|g))\s*\/\s*(\d+(?:[.,]\d+)?\s*(?:mg|g))\b/i);
  if (ratioMatch) {
    return { token: ratioMatch[0], valueMg: null, display: ratioMatch[0].toUpperCase() };
  }

  // Standard mg/g
  const m = normed.match(NL_DOSAGE_RE);
  if (m) {
    const num = parseFloat(m[1].replace(",", "."));
    const unit = m[2].toLowerCase();
    let valueMg: number | null = null;
    if (unit === "mg") valueMg = num;
    else if (unit === "g") valueMg = num * 1000;
    return { token: m[0], valueMg, display: m[0].toUpperCase() };
  }

  // Bare number check (e.g. "doliprane 500", "amox 1000", "vitamine d 200000")
  const words = normed.split(" ").filter(Boolean);
  if (words.length >= 2) {
    for (const w of words) {
      if (/^\d{2,6}(?:[.,]\d{1,2})?$/.test(w)) {
        const numVal = parseFloat(w.replace(",", "."));
        if (numVal >= 10000) {
          return { token: `${Math.round(numVal)}UI`, valueMg: null, display: `${Math.round(numVal)} UI` };
        } else if (numVal >= 0.25 && numVal <= 5000) {
          return {
            token: w,
            valueMg: numVal === 1 || numVal === 2 ? numVal * 1000 : numVal,
            display: `${numVal}mg`,
          };
        }
      }
    }
  }

  return null;
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
  p1?: string;
  pediatric?: boolean;
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

  // 0. Correspondances populaires algériennes prioritaires (boumada safra, etc.)
  for (const entry of POPULAR_ALGERIAN_MAPPINGS) {
    if (
      tryConsume(entry.match, () => {
        interpreted.q = entry.dciOrBrand;
      })
    ) {
      break;
    }
  }

  // 1. Domaine thérapeutique & symptômes
  for (const entry of DOMAIN_SYNONYMS) {
    if (tryConsume(entry.syn, () => (interpreted.domain = entry.domain))) break;
  }

  // 2. Forme galénique
  for (const entry of FORM_SYNONYMS) {
    if (tryConsume(entry.syn, () => (interpreted.form = entry.form))) break;
  }

  // 3. Statut
  tryConsume("non renouvele | renouvele", () => (interpreted.status = "NON_RENOUVELE"));
  if (!interpreted.status) {
    tryConsume("retire | retires | retiree | retirees | retrait", () => (interpreted.status = "RETRIE"));
  }
  if (!interpreted.status) {
    tryConsume("actif | actifs | active | actives", () => (interpreted.status = "ACTIF"));
  }

  // 4. Hôpital P1, remboursable CNAS, pédiatrie
  tryConsume("hopital | hopitaux | gratuit | gratuits | gratuite", () => (interpreted.p1 = "HOP"));
  tryConsume(
    "remboursable | rembourse | rembourses | remboursement | remboursee | cnas",
    () => (interpreted.refundableOnly = true)
  );
  tryConsume(
    "enfant | enfants | pediatrique | pediatrie | bebe | bebes | nourrisson | nourrissons | pediatric | رضيع | طفل | اطفال",
    () => (interpreted.pediatric = true)
  );

  // 5. Dosage extraction
  const normedRaw = norm(raw);
  const dosageToken = extractDosageToken(normedRaw);
  if (dosageToken) {
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
      interpreted.dosage = dosageToken.display;
    }
  }

  // 6. Texte libre restant
  const free = tokens
    .filter((_, i) => !consumed.has(i) && !STOPWORDS.has(tokens[i]))
    .join(" ")
    .trim();
  if (free) {
    interpreted.q = interpreted.q ? `${interpreted.q} ${free}` : free;
  }

  return interpreted;
}

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

    if (interpreted.form) {
      const ORAL_LIQUID_FORMS = ["SIROP", "BUVABLE"];
      if (ORAL_LIQUID_FORMS.includes(interpreted.form)) {
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [
          ...existingAnd,
          {
            OR: [
              { form: { contains: "SIROP" } },
              { form: { contains: "BUVABLE" } },
              { form: { contains: "SUSP" } },
            ],
          },
        ];
      } else {
        where.form = { contains: interpreted.form };
      }
    }
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

    if (interpreted.dosage) {
      const dosageOrs: Prisma.DrugWhereInput[] = [
        { dosage: { contains: interpreted.dosage } },
        { brandKey: { contains: interpreted.dosage } },
      ];
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { OR: dosageOrs }];
    }

    let [total, drugs] = await Promise.all([
      db.drug.count({ where }),
      db.drug.findMany({
        where,
        orderBy: [{ status: "asc" }, { dciKey: "asc" }],
        take: 30,
        include: {
          pharmacyProducts: {
            orderBy: [{ ppa: "asc" }],
            take: 1,
            select: { ppa: true, cnasId: true },
          },
        },
      }),
    ]);

    // Relâchement du filtre domaine si 0 résultat
    if (total === 0 && interpreted.domain) {
      const relaxedWhere = { ...where };
      delete relaxedWhere.domain;
      const [rt, rd] = await Promise.all([
        db.drug.count({ where: relaxedWhere }),
        db.drug.findMany({
          where: relaxedWhere,
          orderBy: [{ status: "asc" }, { dciKey: "asc" }],
          take: 30,
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

    // Priorité pédiatrique
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
