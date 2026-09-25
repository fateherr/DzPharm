import type {
  CatalogFacets,
  CatalogQueryParams,
  CatalogResponse,
  ChatMessage,
  ChatResponse,
  DrugDetailResponse,
  DrugQueryParams,
  DrugsResponse,
  InteractionsResponse,
  MonographDetail,
  MonographsResponse,
  PregnancyCheckResponse,
  Rcp,
  Stats,
  TopViewedDrug,
} from './types'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status})`)
  }
  return (await res.json()) as T
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status})`)
  }
  return (await res.json()) as T
}

function buildQuery(params: DrugQueryParams): string {
  const search = new URLSearchParams()
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.status) search.set('status', params.status)
  if (params.domain) search.set('domain', params.domain)
  if (params.form) search.set('form', params.form)
  if (params.liste) search.set('liste', params.liste)
  if (params.country) search.set('country', params.country)
  if (params.lab) search.set('lab', params.lab)
  if (params.scope) search.set('scope', params.scope)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.sort) search.set('sort', params.sort)
  const qs = search.toString()
  return qs ? `/api/drugs?${qs}` : '/api/drugs'
}

export function fetchDrugs(
  params: DrugQueryParams,
  signal?: AbortSignal
): Promise<DrugsResponse> {
  return getJson<DrugsResponse>(buildQuery(params), signal)
}

export function fetchDrugDetail(
  id: number,
  signal?: AbortSignal
): Promise<DrugDetailResponse> {
  return getJson<DrugDetailResponse>(`/api/drugs/${id}`, signal)
}

/** Incrémente le compteur de consultations — fire-and-forget. */
export function postDrugView(id: number): void {
  fetch(`/api/drugs/${id}/view`, { method: 'POST' }).catch(() => {
    /* silencieux */
  })
}

/** RCP du produit (cache serveur > livre > IA > registre). */
export function fetchRcp(
  id: number,
  signal?: AbortSignal,
  refresh = false
): Promise<Rcp> {
  return getJson<Rcp>(`/api/drugs/${id}/rcp${refresh ? '?refresh=1' : ''}`, signal)
}

/** Médicaments les plus consultés. */
export function fetchTopViewed(
  limit = 8,
  signal?: AbortSignal
): Promise<{ top: TopViewedDrug[] }> {
  return getJson<{ top: TopViewedDrug[] }>(`/api/drugs/top-views?limit=${limit}`, signal)
}

export function fetchStats(signal?: AbortSignal): Promise<Stats> {
  return getJson<Stats>('/api/stats', signal)
}

/** Catalogue officine — recherche produits & prix PPA. */
export function fetchCatalog(
  params: CatalogQueryParams,
  signal?: AbortSignal
): Promise<CatalogResponse> {
  const search = new URLSearchParams()
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.class) search.set('class', params.class)
  if (params.category && params.category !== 'all') search.set('category', params.category)
  if (params.refundable) search.set('refundable', '1')
  if (params.lab) search.set('lab', params.lab)
  if (typeof params.minPrice === 'number' && !Number.isNaN(params.minPrice))
    search.set('minPrice', String(params.minPrice))
  if (typeof params.maxPrice === 'number' && !Number.isNaN(params.maxPrice))
    search.set('maxPrice', String(params.maxPrice))
  if (params.sort) search.set('sort', params.sort)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return getJson<CatalogResponse>(`/api/products${qs ? `?${qs}` : ''}`, signal)
}

/** Facettes du catalogue (classes, laboratoires, compteurs). */
export function fetchCatalogFacets(signal?: AbortSignal): Promise<CatalogFacets> {
  return getJson<CatalogFacets>('/api/products/facets', signal)
}

export function postChat(
  messages: ChatMessage[],
  mode: 'pro' | 'patient' | 'enfant',
  secondOpinion = false
): Promise<ChatResponse> {
  return postJson<ChatResponse>('/api/ai/chat', { messages, mode, secondOpinion })
}

export function postInteractions(
  drugs: { name: string; dci?: string }[],
  patientContext?: string
): Promise<InteractionsResponse> {
  return postJson<InteractionsResponse>('/api/ai/interactions', {
    drugs,
    patientContext: patientContext?.trim() || undefined,
  })
}

/** Analyse locale instantanée (moteur de règles, sans IA). */
export function postLocalInteractions(
  drugs: { name: string; dci?: string }[]
): Promise<InteractionsResponse> {
  return postJson<InteractionsResponse>('/api/interactions', {
    drugs,
  })
}

/* ------------------------------------------------------------------ */
/* Bibliothèque & grossesse                                            */
/* ------------------------------------------------------------------ */

/** Bibliothèque des monographies DCI (recherche + filtre domaine + pagination). */
export function fetchMonographs(
  params: { q?: string; domain?: string; page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<MonographsResponse> {
  const search = new URLSearchParams()
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.domain) search.set('domain', params.domain)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return getJson<MonographsResponse>(`/api/monographs${qs ? `?${qs}` : ''}`, signal)
}

/** Fiche monographie complète (12 sections + registre lié). */
export function fetchMonograph(
  dciKey: string,
  signal?: AbortSignal
): Promise<MonographDetail> {
  return getJson<MonographDetail>(
    `/api/monographs/${encodeURIComponent(dciKey)}`,
    signal
  )
}

/** Vérificateur grossesse & allaitement (règles CRAT + livres). */
export function checkPregnancy(
  q: string,
  signal?: AbortSignal
): Promise<PregnancyCheckResponse> {
  return getJson<PregnancyCheckResponse>(
    `/api/pregnancy?q=${encodeURIComponent(q.trim())}`,
    signal
  )
}
