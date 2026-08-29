/** Contrats typés des API DzPharm (côté client). */

export type DrugStatus = 'ACTIF' | 'NON_RENOUVELE' | 'RETRIE'

export type InteractionSeverity =
  | 'CONTRE-INDIQUE'
  | 'MAJEURE'
  | 'MODEREE'
  | 'MINEURE'

export type GlobalRisk = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE'

export interface Drug {
  id: number
  regNumber: string
  dci: string
  /** Clé DCI normalisée (sans accents, majuscules) — comparaison d'équivalence. */
  dciKey?: string
  brand: string
  form: string
  dosage: string
  packaging: string
  lab: string
  country: string
  liste: string
  p1: string
  p2: string
  type: string
  statut: string
  status: DrugStatus
  domain: string
  domains: string[]
  regDateInitial: string | null
  regDateFinal: string | null
  /** Prix public (PPA, DA) du produit d'officine correspondant. */
  price?: number | null
  /** Présent sur la liste CNAS => remboursable. */
  refundable?: boolean
  /** RCP issu des livres techniques disponible pour cette DCI. */
  hasBookRcp?: boolean
}

export interface DrugDetail extends Drug {
  code: string
  obs: string | null
  stability: string | null
  withdrawDate: string | null
  withdrawReason: string | null
  classes: string[]
  /** Compteur de consultations (globale, sessions DzPharm). */
  views?: number
  /** Produits d'officine (prix PPA) correspondant à ce médicament. */
  pharmacy?: PharmacyProductDetail[]
  /** BOOK | AI | REGISTRY si un RCP est déjà disponible (cache ou fiche livre). */
  rcpSource?: 'BOOK' | 'AI' | 'REGISTRY' | null
}

/** Ligne de la liste de prix de l'officine, rattachée à un médicament du registre. */
export interface PharmacyProductDetail {
  id: number
  name: string
  ppa: number | null
  cnasId: number | null
  refundable: boolean
  class: string | null
  lab: string | null
}

export interface Equivalent {
  id: number
  brand: string
  lab: string
  country: string
  dosage: string
  form: string
  packaging: string
  status: DrugStatus
  type: string
  /** Prix public (PPA, DA) si le produit figure sur la liste de prix. */
  price?: number | null
  refundable?: boolean
}

export interface DrugsResponse {
  drugs: Drug[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DrugDetailResponse {
  drug: DrugDetail
  equivalents: Equivalent[]
}

export interface KeyCount {
  key: string
  count: number
}

export interface Stats {
  total: number
  actifs: number
  nonRenew: number
  retires: number
  local: number
  imported: number
  /** Monographies DCI issues des 17 livres techniques. */
  monographs?: number
  topLabs: KeyCount[]
  topDci: KeyCount[]
  topForms: KeyCount[]
  domains: KeyCount[]
  countries: KeyCount[]
  listes: KeyCount[]
  /** Statistiques du catalogue des prix (officine). */
  prices?: PriceStats
  generatedAt: string
}

/* ------------------------------------------------------------------ */
/* Catalogue & prix — liste officine                                   */
/* ------------------------------------------------------------------ */

export type CatalogSort = 'name' | 'priceAsc' | 'priceDesc'
export type CatalogCategory = 'all' | 'drug' | 'parapharma'

export interface CatalogProduct {
  id: number
  name: string
  lab: string | null
  ppa: number | null
  cnasId: number | null
  refundable: boolean
  class: string | null
  drug: {
    id: number
    dci: string | null
    status: DrugStatus | null
    domain: string | null
    form: string | null
    dosage: string | null
  } | null
}

export interface CatalogResponse {
  products: CatalogProduct[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  priceStats: { avg: number | null; min: number | null; max: number | null }
}

export interface CatalogFacets {
  classes: KeyCount[]
  labs: KeyCount[]
  total: number
  linked: number
  parapharma: number
  refundable: number
}

export interface CatalogQueryParams {
  q?: string
  class?: string
  category?: CatalogCategory
  refundable?: boolean
  lab?: string
  minPrice?: number
  maxPrice?: number
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface PriceStats {
  productsTotal: number
  linked: number
  parapharma: number
  refundable: number
  avgPpa: number | null
  minPpa: number | null
  maxPpa: number | null
  ranges: { label: string; count: number }[]
  byClass: { key: string; count: number; avg: number | null }[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  mode: 'pro' | 'patient'
}

export interface EnrichedDrug {
  input: string
  dci: string
  brand: string
  status: DrugStatus | string
  lab: string
  forme: string
}

export interface InteractionPair {
  drugs: [string, string]
  severity: InteractionSeverity
  mechanism: string
  management: string
}

export interface InteractionsResponse {
  enriched: EnrichedDrug[]
  globalRisk: GlobalRisk
  summary: string
  pairs: InteractionPair[]
  advice: string[]
  monitoring: string[]
  /** Source de l'analyse : moteur local de règles ou IA. */
  source?: 'local' | 'ai'
}

/* ------------------------------------------------------------------ */
/* Outils cliniques — posologies pédiatriques                          */
/* ------------------------------------------------------------------ */

export interface PediatricForm {
  label: string
  /** Concentration en mg pour `perVolumeMl` mL (ex. 250 mg / 5 mL). */
  mg: number
  perVolumeMl: number
  /** Exemples de marques locales. */
  brands: string
}

export interface PediatricDosing {
  dci: string
  /** Jeton de recherche dans le registre (dciKey). */
  dciKey: string
  category: string
  /** Dose par prise en mg/kg (null si posologie fixe par tranche d'âge). */
  mgPerKgPerDose?: number | null
  /** Intervalle minimal entre deux prises (heures). */
  intervalH?: number | null
  /** Nombre de prises par jour si posologie fixe. */
  dosesPerDay?: number | null
  /** Plafond par prise en mg (dose adulte). */
  maxSingleMg?: number | null
  /** Maximum par 24 h en mg/kg. */
  maxDailyMgPerKg?: number | null
  /** Plafond par 24 h en mg (dose adulte). */
  maxDailyMg?: number | null
  minAgeMonths?: number | null
  minWeightKg?: number | null
  /** Posologies fixes par tranche d'âge (cétirizine, vitamine D…). */
  bands?: PediatricBand[] | null
  forms: PediatricForm[]
  warnings: string[]
  note?: string
}

export interface PediatricBand {
  /** Âge minimal en mois inclus. */
  minMonths: number
  /** Âge maximal en mois inclus (null = sans limite). */
  maxMonths: number | null
  doseMg: number
  perDay: number
  label: string
}

/* ------------------------------------------------------------------ */
/* Simulateur Chifa                                                    */
/* ------------------------------------------------------------------ */

export type ChifaCardType = 'standard' | 'ald' | 'casnos' | 'aucune'

export interface ChifaLine {
  uid: string
  brand: string
  dci: string
  price: number
  /** Taux de remboursement applicable au produit (0, 40, 80, 100 %). */
  rate: number
}

export interface ChifaTotals {
  total: number
  reimbursed: number
  patientPays: number
  effectiveRate: number
}

export interface DrugQueryParams {
  q?: string
  status?: string
  domain?: string
  form?: string
  liste?: string
  country?: string
  lab?: string
  page?: number
  pageSize?: number
  sort?: 'relevance' | 'brand' | 'dci' | 'lab' | 'dateInitial' | 'dateFinal'
}

/* ------------------------------------------------------------------ */
/* RCP — Résumé Caractéristiques du Produit                            */
/* ------------------------------------------------------------------ */

export type RcpSource = 'BOOK' | 'AI' | 'REGISTRY'

export interface RcpItem {
  label?: string
  text: string
}

export interface RcpSection {
  num: string
  title: string
  items: RcpItem[]
}

export interface Rcp {
  source: RcpSource
  sourceLabel: string
  generatedAt: string
  header: {
    denomination: string
    dci: string
    forme: string
    dosage: string
    titulaire: string
    amm: string
    liste: string
    status: string
    domain: string
    dateInitial: string
    dateFinal: string
  }
  sections: RcpSection[]
  disclaimer: string
}

/* ------------------------------------------------------------------ */
/* Bibliothèque — monographies des 17 livres techniques                */
/* ------------------------------------------------------------------ */

export interface MonographSummary {
  dciKey: string
  dci: string
  domain: string
  book: string
  itemCount: number
  hasPregnancy: boolean
  summary: string
}

export interface MonographsResponse {
  items: MonographSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  domains: { name: string; count: number }[]
}

export interface MonoItem {
  label?: string
  text: string
}

export interface MonographDetail {
  dciKey: string
  dci: string
  domain: string
  book: string
  context: string | null
  alias: string | null
  sections: {
    categories: MonoItem[]
    available: MonoItem[]
    mechanism: MonoItem[]
    indications: MonoItem[]
    contraindications: MonoItem[]
    adverse: MonoItem[]
    management: MonoItem[]
    interactions: MonoItem[]
    pregnancy: MonoItem[]
    posology: MonoItem[]
    galenic: MonoItem[]
    advice: MonoItem[]
    pk: MonoItem[]
    notes: MonoItem[]
  }
  registry: {
    id: number
    brand: string
    dosage: string
    form: string
    lab: string
    status: DrugStatus
    domain: string | null
  }[]
  registryTotal: number
}

/* ------------------------------------------------------------------ */
/* Grossesse & Allaitement — vérificateur CRAT                        */
/* ------------------------------------------------------------------ */

export type PregnancyRisk = 'SURE' | 'PRUDENCE' | 'DECONSEILLE' | 'CONTRE_INDIQUE' | 'NEUTRE'

export interface PregnancyCheckResponse {
  found: boolean
  message?: string
  drug?: {
    id: number
    brand: string
    dci: string
    form: string
    dosage: string
    status: DrugStatus
    domain: string
    activesCount: number
  }
  riskLevel?: PregnancyRisk | null
  breastfeedingLevel?: PregnancyRisk | null
  rule?: {
    pregnancy: PregnancyRisk
    trimesters?: { t1?: PregnancyRisk; t2?: PregnancyRisk; t3?: PregnancyRisk } | null
    breastfeeding: PregnancyRisk
    pregnancyNote: string
    breastfeedingNote: string
    alternatives: string[]
  } | null
  book?: {
    dci: string
    domain: string
    pregnancyItems: MonoItem[]
    breastfeedingItems: MonoItem[]
    detailItems: MonoItem[]
  } | null
  source?: 'RULE+BOOK' | 'RULE' | 'BOOK' | 'NONE'
}

export interface TopViewedDrug {
  id: number
  brand: string
  dci: string
  form: string
  dosage: string
  lab: string
  status: DrugStatus
  domain: string
  views: number
  hasBookRcp: boolean
}
