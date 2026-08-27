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
}

export interface DrugDetail extends Drug {
  code: string
  obs: string | null
  stability: string | null
  withdrawDate: string | null
  withdrawReason: string | null
  classes: string[]
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
  topLabs: KeyCount[]
  topDci: KeyCount[]
  topForms: KeyCount[]
  domains: KeyCount[]
  countries: KeyCount[]
  listes: KeyCount[]
  generatedAt: string
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
