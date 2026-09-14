/**
 * DzPharm — Moteur de génération des RCP (Résumés Caractéristiques du Produit).
 *
 * Sources:
 *  - BOOK: monographie DCI extraite des 17 livres de pharmacologie clinique
 *          (764 fiches) + données produit du registre algérien.
 *  - AI:   génération LLM à la demande (mise en cache en base), produits
 *          sans fiche dans les livres.
 *  - REGISTRY: repli minimal (données réglementaires du registre uniquement).
 */

import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface MonoSections {
  categories: string[];
  available: string[];
  mechanism: string[];
  profile: {
    indications?: string[];
    contraindications?: string[];
    adverse?: string[];
    other?: string[];
  };
  management?: string[];
  interactions: string[];
  pregnancy: string[];
  posology: string[];
  galenic?: string[];
  advice?: string[];
  notes?: string[];
  pk?: string[];
}

export interface MonoContent {
  context: string | null;
  alias: string | null;
  domainsExtra: string[];
  keys: string[];
  sections: MonoSections;
}

export type RcpSource = "BOOK" | "AI" | "REGISTRY";

export interface RcpItem {
  /** Étiquette optionnelle du bloc (ex. « Adulte », « Sujet âgé »). */
  label?: string;
  text: string;
}

export interface RcpSection {
  /** Numérotation officielle ANSM (ex. « 4.1 ») ou annexe (« A », « B »). */
  num: string;
  title: string;
  items: RcpItem[];
}

export interface RcpSafety {
  pregnancy?: 'AUTORISE' | 'PRECAUTION' | 'DECONSEILLE' | 'CONTRE-INDIQUE' | string;
  pregnancyLabel?: string;
  breastfeeding?: 'COMPATIBLE' | 'SURVEILLANCE' | 'A_EVITER' | string;
  driving?: 0 | 1 | 2 | 3 | number;
  doping?: boolean;
  renalAlert?: boolean;
}

export interface Rcp {
  source: RcpSource;
  sourceLabel: string;
  generatedAt: string;
  summary?: string;
  safety?: RcpSafety;
  header: {
    denomination: string;
    dci: string;
    forme: string;
    dosage: string;
    titulaire: string;
    amm: string;
    liste: string;
    status: string;
    domain: string;
    dateInitial: string;
    dateFinal: string;
  };
  sections: RcpSection[];
  disclaimer: string;
}

type DrugRow = {
  id: number;
  regNumber: string | null;
  dci: string | null;
  dciKey: string | null;
  brand: string | null;
  form: string | null;
  dosage: string | null;
  packaging: string | null;
  liste: string | null;
  lab: string | null;
  country: string | null;
  regDateInitial: string | null;
  regDateFinal: string | null;
  stability: string | null;
  status: string;
  domain: string | null;
};

/* ------------------------------------------------------------------ */
/* Index des monographies (cache mémoire)                              */
/* ------------------------------------------------------------------ */

const SALTS = new Set([
  "DICHLORHYDRATE", "CHLORHYDRATE", "HYDROCHLORIDE", "MALEATE", "SUCCINATE",
  "HEMISULFATE", "SULFATE", "SODIQUE", "POTASSIQUE", "MESILATE", "TARTRATE",
  "BESYLATE", "FUMARATE", "CITRATE", "ACETATE", "BROMHYDRATE", "TOSYLATE",
  "MALATE", "PROPIONATE", "VALERATE", "CALCIQUE", "MAGNESIQUE", "ZINCIQUE",
  "ANHYDRE", "DIHYDRATE", "TRIHYDRATE", "MONOHYDRATE", "BROMURE", "GLUCONATE",
  "LACTATE", "ASCORBATE", "SALICYLATE", "NITRATE", "THEOCLATE", "CAMSYLATE",
  "EMBONATE", "STEARATE", "PALMITATE", "PIVALATE", "ENANTATE", "FURENOATE",
]);

interface MonoIndexEntry {
  dciKey: string;
  dci: string;
  domain: string;
  book: string;
  content: MonoContent;
}



export function normalizeKey(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function phoneticKey(s: string | null | undefined): string {
  if (!s) return "";
  let k = normalizeKey(s);
  k = k.replace(/PH/g, "F").replace(/Y/g, "I").replace(/TH/g, "T");
  k = k.replace(/([BCDFGHJKLMNPQRSTVWXZ])\1+/g, "$1");
  return k;
}

function stripSalts(k: string): string {
  const words = k.split(" ").filter((w) => !SALTS.has(w));
  return words.length ? words.join(" ") : k;
}

interface MonoIndexEntry {
  dciKey: string;
  dci: string;
  domain: string;
  book: string;
  content: MonoContent;
}

interface MonoIndex {
  byKey: Map<string, MonoIndexEntry>;
  byPhonetic: Map<string, MonoIndexEntry>;
  byWord: Map<string, MonoIndexEntry>;
  byPhoneticWord: Map<string, MonoIndexEntry>;
  loadedAt: number;
}

let monoIndex: MonoIndex | null = null;
const MONO_INDEX_TTL = 10 * 60 * 1000; // 10 min

export async function getMonoIndex(): Promise<MonoIndex | null> {
  if (monoIndex && Date.now() - monoIndex.loadedAt < MONO_INDEX_TTL) {
    return monoIndex;
  }
  try {
    const rows = await db.monograph.findMany();
    const byKey = new Map<string, MonoIndexEntry>();
    const byPhonetic = new Map<string, MonoIndexEntry>();
    const byWord = new Map<string, MonoIndexEntry>();
    const byPhoneticWord = new Map<string, MonoIndexEntry>();

    for (const r of rows) {
      let content: MonoContent;
      try {
        content = JSON.parse(r.content) as MonoContent;
      } catch {
        continue;
      }
      const entry: MonoIndexEntry = {
        dciKey: r.dciKey,
        dci: r.dci,
        domain: r.domain,
        book: r.book,
        content,
      };
      const keys = new Set<string>([r.dciKey, ...(content.keys ?? [])]);
      for (const k of keys) {
        if (k && k.length >= 3) {
          if (!byKey.has(k)) byKey.set(k, entry);
          const pk = phoneticKey(k);
          if (pk && !byPhonetic.has(pk)) byPhonetic.set(pk, entry);
        }
        const s = stripSalts(k);
        if (s && s !== k) {
          if (!byKey.has(s)) byKey.set(s, entry);
          const ps = phoneticKey(s);
          if (ps && !byPhonetic.has(ps)) byPhonetic.set(ps, entry);
        }
      }
      for (const w of normalizeKey(r.dci).split(" ")) {
        if (w.length >= 6) {
          if (!byWord.has(w)) byWord.set(w, entry);
          const pw = phoneticKey(w);
          if (pw.length >= 5 && !byPhoneticWord.has(pw)) byPhoneticWord.set(pw, entry);
        }
      }
    }
    monoIndex = { byKey, byPhonetic, byWord, byPhoneticWord, loadedAt: Date.now() };
    return monoIndex;
  } catch (e) {
    console.error("[rcp] mono index load failed", e);
    return monoIndex; // stale fallback
  }
}

/** Résout une clé DCI produit -> monographie du livre la plus pertinente. */
export function matchMonograph(
  index: MonoIndex,
  dciKey: string | null | undefined
): MonoIndexEntry | null {
  const k = normalizeKey(dciKey);
  if (!k) return null;

  // 1) Clé directe & Clé sans sels
  const tryKeys = [k, stripSalts(k)];
  for (const t of tryKeys) {
    if (t && index.byKey.has(t)) return index.byKey.get(t)!;
  }

  // 2) Clé phonétique (résout CEFALEXINE -> CEPHALEXINE, CARBOCYSTEINE -> CARBOCISTEINE)
  for (const t of tryKeys) {
    const pt = phoneticKey(t);
    if (pt && index.byPhonetic?.has(pt)) return index.byPhonetic.get(pt)!;
  }

  // 3) « X CHLORHYDRATE EXPRIME EN X » → base
  const m = k.match(/^(.*?)\s+(?:EXPRIME\s+EN|SOUS\s+FORME\s+DE)\s+(.*)$/);
  if (m) {
    const target = m[2].trim();
    if (index.byKey.has(target)) return index.byKey.get(target)!;
    const pTarget = phoneticKey(target);
    if (index.byPhonetic?.has(pTarget)) return index.byPhonetic.get(pTarget)!;
  }

  // 4) Associations fixes: chaque composante
  const parts = k.split(/\s*\+\s*|\s*\/\s*|\s+ET\s+/);
  for (const p of parts) {
    const ps = stripSalts(p.trim());
    if (ps && index.byKey.has(ps)) return index.byKey.get(ps)!;
    const pps = phoneticKey(ps);
    if (pps && index.byPhonetic?.has(pps)) return index.byPhonetic.get(pps)!;

    const words = ps.split(" ");
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (w.length >= 6 && index.byWord.has(w)) return index.byWord.get(w)!;
      const pw = phoneticKey(w);
      if (pw.length >= 5 && index.byPhoneticWord?.has(pw)) return index.byPhoneticWord.get(pw)!;
    }
  }

  // 5) Dernier repli: mot long quelconque
  for (const w of stripSalts(k).split(" ")) {
    if (w.length >= 7 && index.byWord.has(w)) return index.byWord.get(w)!;
    const pw = phoneticKey(w);
    if (pw.length >= 6 && index.byPhoneticWord?.has(pw)) return index.byPhoneticWord.get(pw)!;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Construction du RCP                                                 */
/* ------------------------------------------------------------------ */

function items(list: string[] | undefined, max = 30): RcpItem[] {
  if (!list) return [];
  return list
    .filter((t) => t && t.trim())
    .slice(0, max)
    .map((t) => {
      const m = t.match(/^([A-ZÉÈÀÇ][\wÀ-ÿ'’\- ()/.,%µ°]{2,60}?)\s*:\s*(.+)$/);
      if (m && m[2].length > 3) return { label: m[1].trim(), text: m[2].trim() };
      return { text: t.trim() };
    });
}

function fmtDate(d: string | null | undefined): string {
  return d ? d : "—";
}

const BOOK_LABEL = (book: string, domain: string) =>
  `Livre technique DzPharm — ${domain}`;

export function extractBookSafetyAndSummary(
  mono: { domain?: string; content: MonoContent },
  drug?: Partial<DrugRow>
) {
  const s = mono.content.sections;
  const prof = s.profile ?? {};

  // Pregnancy assessment
  const pregText = (s.pregnancy ?? []).join(" ").toLowerCase();
  let pregnancy: RcpSafety["pregnancy"] = "PRECAUTION";
  let pregnancyLabel = "Précautions requises";
  if (/contre-indiqu|teratog|foetotox|malformation/i.test(pregText)) {
    pregnancy = "CONTRE-INDIQUE";
    pregnancyLabel = "Contre-indiqué (CRAT)";
  } else if (/deconseill|eviter|prudence/i.test(pregText)) {
    pregnancy = "DECONSEILLE";
    pregnancyLabel = "Déconseillé (bénéfice/risque)";
  } else if (/utilisable|possible|aucun effet malformatif|sans risque/i.test(pregText)) {
    pregnancy = "AUTORISE";
    pregnancyLabel = "Utilisable si nécessaire";
  }

  // Breastfeeding
  let breastfeeding: RcpSafety["breastfeeding"] = "SURVEILLANCE";
  if (/allaitement contre-indiqu|passage important|interrompre l'allaitement/i.test(pregText)) {
    breastfeeding = "A_EVITER";
  } else if (/compatible avec l'allaitement|faible passage/i.test(pregText)) {
    breastfeeding = "COMPATIBLE";
  }

  // Driving & vigilance
  const allText = (prof.adverse ?? []).concat(s.management ?? [], s.advice ?? []).join(" ").toLowerCase();
  let driving: 0 | 1 | 2 | 3 = 0;
  if (/somnolence severe|conduite dangereuse|sedation intense/i.test(allText)) {
    driving = 3;
  } else if (/somnolence|vertiges|baisse de vigilance|troubles visuels/i.test(allText)) {
    driving = 2;
  } else if (/etourdissements|fatigue/i.test(allText)) {
    driving = 1;
  }

  // Renal alert
  const renalText = (s.posology ?? []).concat(s.management ?? []).join(" ").toLowerCase();
  const renalAlert = /clairance|creatinine|insuffisance renale|dfg/i.test(renalText);

  // Doping
  const domainAndClass = `${drug?.domain ?? ""} ${mono.domain ?? ""}`.toLowerCase();
  const doping = /corticoide|diuretique|anabolisant|beta-bloquant|amphetamin|erythropoietine/i.test(domainAndClass);

  // Summary (Executive 30-sec flash)
  const firstIndication = (prof.indications ?? s.categories ?? [])[0] ?? "";
  const firstPosology = (s.posology ?? [])[0] ?? "";
  const firstContra = (prof.contraindications ?? [])[0] ?? "";

  let summary = "";
  if (firstIndication) {
    summary = `Indication principale : ${firstIndication}.`;
    if (firstPosology) summary += ` Posologie usuelle : ${firstPosology.slice(0, 140)}.`;
    if (firstContra) summary += ` Contre-indication clé : ${firstContra.slice(0, 100)}.`;
  } else if (s.advice?.[0]) {
    summary = s.advice[0].slice(0, 260);
  }

  return {
    summary: summary || undefined,
    safety: {
      pregnancy,
      pregnancyLabel,
      breastfeeding,
      driving,
      doping,
      renalAlert,
    },
  };
}

export function buildBookRcp(drug: DrugRow, mono: MonoIndexEntry): Rcp {
  const s = mono.content.sections;
  const prof = s.profile ?? {};

  const sections: RcpSection[] = [];

  const push = (num: string, title: string, list: string[] | undefined, max?: number) => {
    const it = items(list, max);
    if (it.length) sections.push({ num, title, items: it });
  };

  // 1-3: identification (registre)
  sections.push({
    num: "1",
    title: "Dénomination du médicament",
    items: [{ text: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}` }],
  });
  sections.push({
    num: "2",
    title: "Composition qualitative et quantitative",
    items: [
      {
        label: "Substance active",
        text: `${drug.dci ?? mono.dci}${drug.dosage ? ` — ${drug.dosage}` : ""}`,
      },
      ...(drug.packaging
        ? [{ label: "Conditionnement", text: drug.packaging }]
        : []),
    ],
  });
  sections.push({
    num: "3",
    title: "Forme pharmaceutique",
    items: [{ text: drug.form ?? "—" }],
  });

  // 4.x: données cliniques (livre)
  push("4.1", "Indications thérapeutiques", prof.indications ?? s.categories?.slice(0, 2));
  push("4.2", "Posologie et mode d'administration", s.posology, 22);
  push("4.3", "Contre-indications", prof.contraindications ?? prof.other);
  push("4.4", "Mises en garde spéciales et précautions d'emploi", s.management, 15);
  push("4.5", "Interactions avec d'autres médicaments et autres formes d'interactions", s.interactions, 20);
  push("4.6", "Fertilité, grossesse et allaitement", s.pregnancy, 12);
  push("4.8", "Effets indésirables", prof.adverse, 18);
  const overdose = (s.notes ?? []).filter((n) => /surdosage|overdose/i.test(n));
  push("4.9", "Surdosage", overdose.length ? overdose : undefined, 6);

  // 5.x: propriétés pharmacologiques
  push("5.1", "Propriétés pharmacodynamiques", s.mechanism, 12);
  push("5.2", "Propriétés pharmacocinétiques", s.pk, 10);

  // 6.x: données pharmaceutiques
  const cons = (s.notes ?? []).filter((n) => /conservation|conserver/i.test(n));
  sections.push({
    num: "6.2",
    title: "Durée de conservation",
    items: [
      ...(drug.stability ? [{ text: `Durée de stabilité (registre) : ${drug.stability}` }] : []),
      ...items(cons.length ? cons : undefined, 4),
    ],
  });

  // 7-10: informations réglementaires (registre)
  sections.push({
    num: "7",
    title: "Titulaire de l'autorisation de mise sur le marché",
    items: [
      { text: drug.lab ?? "—" },
      ...(drug.country ? [{ label: "Pays", text: drug.country }] : []),
    ],
  });
  sections.push({
    num: "8",
    title: "Numéro d'autorisation de mise sur le marché",
    items: [{ text: drug.regNumber ?? "—" }],
  });
  sections.push({
    num: "9",
    title: "Date de première autorisation / renouvellement",
    items: [
      { label: "Autorisation initiale", text: fmtDate(drug.regDateInitial) },
      { label: "Dernier renouvellement", text: fmtDate(drug.regDateFinal) },
    ],
  });
  sections.push({
    num: "10",
    title: "Date de mise à jour du texte",
    items: [{ text: new Date().toLocaleDateString("fr-FR") }],
  });

  // Annexes DzPharm (valeur ajoutée terrain)
  push("A", "Annexe — Spécialités disponibles en Algérie", s.available, 25);
  push("B", "Annexe — Conseils au comptoir", s.advice, 10);
  push("C", "Annexe — Règles d'or & pièges au comptoir", s.notes, 12);

  const { summary, safety } = extractBookSafetyAndSummary(mono, drug);

  return {
    source: "BOOK",
    sourceLabel: BOOK_LABEL(mono.book, mono.domain),
    generatedAt: new Date().toISOString(),
    summary,
    safety,
    header: {
      denomination: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}`,
      dci: drug.dci ?? mono.dci,
      forme: drug.form ?? "—",
      dosage: drug.dosage ?? "—",
      titulaire: drug.lab ?? "—",
      amm: drug.regNumber ?? "—",
      liste: drug.liste ?? "—",
      status: drug.status,
      domain: drug.domain ?? mono.domain,
      dateInitial: fmtDate(drug.regDateInitial),
      dateFinal: fmtDate(drug.regDateFinal),
    },
    sections,
    disclaimer:
      "RCP compilé par DzPharm à partir des livres techniques de pharmacologie clinique et du registre algérien. Document de référence pédagogique — la notice officielle du laboratoire prévaut.",
  };
}

/** RCP minimal à partir du registre seul. */
export function buildRegistryRcp(drug: DrugRow, notice?: string): Rcp {
  const sections: RcpSection[] = [
    { num: "1", title: "Dénomination du médicament", items: [{ text: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}` }] },
    {
      num: "2",
      title: "Composition qualitative et quantitative",
      items: [
        { label: "Substance active", text: drug.dci ?? "—" },
        ...(drug.dosage ? [{ label: "Dosage", text: drug.dosage }] : []),
        ...(drug.packaging ? [{ label: "Conditionnement", text: drug.packaging }] : []),
      ],
    },
    { num: "3", title: "Forme pharmaceutique", items: [{ text: drug.form ?? "—" }] },
    {
      num: "7",
      title: "Titulaire de l'autorisation de mise sur le marché",
      items: [
        { text: drug.lab ?? "—" },
        ...(drug.country ? [{ label: "Pays", text: drug.country }] : []),
      ],
    },
    { num: "8", title: "Numéro d'autorisation de mise sur le marché", items: [{ text: drug.regNumber ?? "—" }] },
    {
      num: "9",
      title: "Date de première autorisation / renouvellement",
      items: [
        { label: "Autorisation initiale", text: fmtDate(drug.regDateInitial) },
        { label: "Dernier renouvellement", text: fmtDate(drug.regDateFinal) },
      ],
    },
    { num: "10", title: "Date de mise à jour du texte", items: [{ text: new Date().toLocaleDateString("fr-FR") }] },
  ];
  if (notice) {
    sections.splice(3, 0, { num: "4.0", title: "Note", items: [{ text: notice }] });
  }
  return {
    source: "REGISTRY",
    sourceLabel: "Registre algérien des médicaments (nomenclature officielle)",
    generatedAt: new Date().toISOString(),
    summary: `Médicament enregistré sous le numéro AMM ${drug.regNumber ?? "—"} (${drug.brand ?? "—"} - ${drug.dci ?? "—"}).`,
    safety: {
      pregnancy: "PRECAUTION",
      pregnancyLabel: "Précautions requises",
      breastfeeding: "SURVEILLANCE",
      driving: 0,
      doping: false,
      renalAlert: false,
    },
    header: {
      denomination: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}`,
      dci: drug.dci ?? "—",
      forme: drug.form ?? "—",
      dosage: drug.dosage ?? "—",
      titulaire: drug.lab ?? "—",
      amm: drug.regNumber ?? "—",
      liste: drug.liste ?? "—",
      status: drug.status,
      domain: drug.domain ?? "—",
      dateInitial: fmtDate(drug.regDateInitial),
      dateFinal: fmtDate(drug.regDateFinal),
    },
    sections,
    disclaimer:
      "RCP établi uniquement à partir des données réglementaires du registre algérien. Aucune monographie clinique disponible pour cette DCI.",
  };
}

/** Valide/normalise un RCP produit par le LLM et complète avec le registre. */
export function buildAiRcp(
  drug: DrugRow,
  llmSections: unknown,
  llmSummary?: string,
  llmSafety?: unknown
): Rcp | null {
  if (!Array.isArray(llmSections)) return null;
  const clinical: RcpSection[] = [];
  for (const raw of llmSections) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const num = typeof r.num === "string" ? r.num.slice(0, 8) : "";
    const title = typeof r.title === "string" ? r.title.slice(0, 120) : "";
    let texts: unknown = r.items ?? r.texts;
    let parsed: RcpItem[] = [];
    if (Array.isArray(texts)) {
      parsed = (texts as unknown[])
        .map((it) => {
          if (typeof it === "string") return { text: it.slice(0, 1200) };
          if (it && typeof it === "object") {
            const o = it as Record<string, unknown>;
            if (typeof o.text === "string")
              return {
                label: typeof o.label === "string" ? o.label.slice(0, 60) : undefined,
                text: o.text.slice(0, 1200),
              };
          }
          return null;
        })
        .filter((x): x is RcpItem => Boolean(x))
        .slice(0, 25);
    }
    if (num && title && parsed.length && !/^(1|2|3|7|8|9|10)$/.test(num)) {
      clinical.push({ num, title, items: parsed });
    }
  }
  if (clinical.length < 5) return null;

  // identification (registre) + sections cliniques (IA) + réglementaire (registre)
  const sections: RcpSection[] = [
    { num: "1", title: "Dénomination du médicament", items: [{ text: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}` }] },
    {
      num: "2",
      title: "Composition qualitative et quantitative",
      items: [
        { label: "Substance active", text: `${drug.dci ?? "—"}${drug.dosage ? ` — ${drug.dosage}` : ""}` },
        ...(drug.packaging ? [{ label: "Conditionnement", text: drug.packaging }] : []),
      ],
    },
    { num: "3", title: "Forme pharmaceutique", items: [{ text: drug.form ?? "—" }] },
    ...clinical,
    {
      num: "7",
      title: "Titulaire de l'autorisation de mise sur le marché",
      items: [
        { text: drug.lab ?? "—" },
        ...(drug.country ? [{ label: "Pays", text: drug.country }] : []),
      ],
    },
    { num: "8", title: "Numéro d'autorisation de mise sur le marché", items: [{ text: drug.regNumber ?? "—" }] },
    {
      num: "9",
      title: "Date de première autorisation / renouvellement",
      items: [
        { label: "Autorisation initiale", text: fmtDate(drug.regDateInitial) },
        { label: "Dernier renouvellement", text: fmtDate(drug.regDateFinal) },
      ],
    },
    { num: "10", title: "Date de mise à jour du texte", items: [{ text: new Date().toLocaleDateString("fr-FR") }] },
  ];

  // tri: sections numériques (1, 2, 4.1...) puis annexes (A, B, C)
  sections.sort((a, b) => {
    const na = parseFloat(a.num);
    const nb = parseFloat(b.num);
    const aNum = !Number.isNaN(na);
    const bNum = !Number.isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.num.localeCompare(b.num);
  });

  const safety: RcpSafety =
    llmSafety && typeof llmSafety === "object"
      ? (llmSafety as RcpSafety)
      : { pregnancy: "PRECAUTION", breastfeeding: "SURVEILLANCE", driving: 1 };

  return {
    source: "AI",
    sourceLabel: "RCP officiel généré par IA (DzPharm Copilote) — à vérifier",
    generatedAt: new Date().toISOString(),
    summary: typeof llmSummary === "string" && llmSummary.trim() ? llmSummary.trim() : undefined,
    safety,
    header: {
      denomination: `${drug.brand ?? "—"}${drug.dosage ? ` ${drug.dosage}` : ""}`,
      dci: drug.dci ?? "—",
      forme: drug.form ?? "—",
      dosage: drug.dosage ?? "—",
      titulaire: drug.lab ?? "—",
      amm: drug.regNumber ?? "—",
      liste: drug.liste ?? "—",
      status: drug.status,
      domain: drug.domain ?? "—",
      dateInitial: fmtDate(drug.regDateInitial),
      dateFinal: fmtDate(drug.regDateFinal),
    },
    sections,
    disclaimer:
      "Ce RCP a été généré automatiquement par intelligence artificielle à partir du registre algérien et de connaissances pharmacologiques générales. Il ne remplace ni la notice officielle ni l'avis d'un professionnel de santé. Vérifiez les données critiques.",
  };
}

export type { DrugRow };
