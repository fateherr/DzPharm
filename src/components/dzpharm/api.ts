import type {
  ChatMessage,
  ChatResponse,
  DrugDetailResponse,
  DrugQueryParams,
  DrugsResponse,
  InteractionsResponse,
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

export function postChat(
  messages: ChatMessage[],
  mode: 'pro' | 'patient'
): Promise<ChatResponse> {
  return postJson<ChatResponse>('/api/ai/chat', { messages, mode })
}

export function postInteractions(
  drugs: string[],
  patientContext?: string
): Promise<InteractionsResponse> {
  return postJson<InteractionsResponse>('/api/ai/interactions', {
    drugs: drugs.map((name) => ({ name })),
    patientContext: patientContext?.trim() || undefined,
  })
}

/** Analyse locale instantanée (moteur de règles, sans IA). */
export function postLocalInteractions(drugs: string[]): Promise<InteractionsResponse> {
  return postJson<InteractionsResponse>('/api/interactions', {
    drugs: drugs.map((name) => ({ name })),
  })
}
