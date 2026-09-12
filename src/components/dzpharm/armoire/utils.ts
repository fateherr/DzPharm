/**
 * Armoire familiale — utilitaires locaux (calculs d'organisation,
 * alertes de péremption/stock, regroupements). AUCUNE donnée clinique
 * n'est inventée ici : les messages renvoient vers les outils dédiés
 * (interactions, CRAT, posologies) pour toute décision médicale.
 */
import type {
  AlertKind,
  ArmoireEntry,
  ArmoireKit,
  ArmoireMember,
  CabinetAlert,
  ExpiryReminders,
} from './types'
import { CATEGORY_ORDER, DEFAULT_REMINDERS, KIT_ORDER } from './constants'

/* ------------------------------------------------------------------ */
/* Helpers généraux                                                    */
/* ------------------------------------------------------------------ */

export function normKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function ageLabel(years: number): string {
  if (years < 1) return 'moins d’1 an'
  if (years === 1) return '1 an'
  return `${years} ans`
}

/** Jours restants avant une date ISO (négatif = passée), null si absente. */
export function daysUntil(iso: string): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/* ------------------------------------------------------------------ */
/* Alertes d'inventaire (organisation — aucun contenu clinique)        */
/* ------------------------------------------------------------------ */

const ALERT_PRIORITY: Record<AlertKind, number> = {
  expired: 0,
  withdrawn: 1,
  expiring7: 2,
  nonRenewed: 3,
  lowStock: 4,
  duplicate: 5,
  expiring30: 6,
  pao: 7,
  controle: 8,
  opened: 9,
}

export const ALERT_KIND_META: Record<
  AlertKind,
  { label: string; className: string; short: string }
> = {
  expired: {
    label: 'Périmé',
    short: 'Périmé',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  expiring7: {
    label: 'Expire sous 7 jours',
    short: 'J-7',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  expiring30: {
    label: 'Expire sous 30 jours',
    short: 'J-30',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  withdrawn: {
    label: 'Retiré du marché',
    short: 'Retiré',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  nonRenewed: {
    label: 'Non renouvelé (AMM)',
    short: 'Non renouvelé',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  lowStock: {
    label: 'Stock faible',
    short: 'Stock faible',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  controle: {
    label: 'Liste contrôlée',
    short: 'Contrôlé',
    className: 'border-state-danger/30 bg-state-danger/10 text-state-danger',
  },
  duplicate: {
    label: 'Doublon de DCI',
    short: 'Doublon',
    className: 'border-chifa/40 bg-chifa/10 text-chifa',
  },
  opened: {
    label: 'Suspension/flacon ouvert',
    short: 'Ouvert',
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
  pao: {
    label: 'Durée après ouverture',
    short: 'PAO',
    className: 'border-chifa/40 bg-chifa/10 text-chifa',
  },
}

/**
 * Calcule les alertes d'inventaire d'une liste d'entrées.
 * - Péremption effective (PAO-aware, seuils configurables 7/30/90 j)
 * - Statuts registre (retiré / non renouvelé)
 * - Stock faible (traitements chroniques, estimation déclarée)
 * - Entrée contrôlée (toujours signalée en zone sécurité)
 * - Doublons de DCI pour un même membre
 * - PAO dépassée ou en cours (flacon ouvert)
 */
export function computeCabinetAlerts(
  entries: ArmoireEntry[],
  reminders: ExpiryReminders = DEFAULT_REMINDERS
): CabinetAlert[] {
  const alerts: CabinetAlert[] = []

  // Index des DCI par membre pour détecter les doublons réels
  const seen = new Map<string, Set<string>>() // dciKey -> memberIds

  for (const e of entries) {
    const eff = effectiveExpiry(e)
    const d = daysUntil(eff)
    const paoDriven = isPaoDriven(e)

    if (d != null) {
      if (d < 0) {
        const reason = paoDriven ? 'périmé (durée après ouverture dépassée)' : 'périmé'
        alerts.push({ kind: 'expired', uid: e.uid, message: `${e.brand} est ${reason}.` })
      } else if (d <= 7) {
        const reason = paoDriven ? `expire dans ${d} jour${d > 1 ? 's' : ''} (durée après ouverture)` : `expire dans ${d} jour${d > 1 ? 's' : ''}`
        alerts.push({ kind: 'expiring7', uid: e.uid, message: `${e.brand} ${reason}.` })
      } else if (d <= 30 && reminders.d30) {
        alerts.push({
          kind: 'expiring30',
          uid: e.uid,
          message: `${e.brand} expire dans ${d} jours${paoDriven ? ' (durée après ouverture)' : ''}.`,
        })
      }
    }

    // Alerte PAO spécifique : ouvert et PAO connue mais non encore dépassée
    if (e.openedAt && e.duree_pao_jours != null && d != null && d >= 0 && !paoDriven) {
      // PAO ne limite pas ici (expiry imprimée est plus proche), mais signal l'ouverture
      const openD = daysUntil(e.openedAt)
      if (openD != null && openD <= 0) {
        const isLiquid = /sirop|suspension|solution|goutte|collyre|buvable|ophtalmique/i.test(e.form)
        if (isLiquid) {
          alerts.push({
            kind: 'pao',
            uid: e.uid,
            message: `${e.brand} est ouvert depuis le ${fmtDate(e.openedAt)} — durée max après ouverture : ${e.duree_pao_jours} j (respectez la notice).`,
          })
        }
      }
    }

    if (e.status === 'RETRIE') {
      alerts.push({
        kind: 'withdrawn',
        uid: e.uid,
        message: `${e.brand} est retiré du marché algérien.`,
      })
    } else if (e.status === 'NON_RENOUVELE') {
      alerts.push({
        kind: 'nonRenewed',
        uid: e.uid,
        message: `${e.brand} : enregistrement non renouvelé.`,
      })
    }
    if (e.category === 'chronique' && e.daysLeft != null && e.daysLeft <= 7) {
      alerts.push({
        kind: 'lowStock',
        uid: e.uid,
        message: `${e.brand} : environ ${e.daysLeft} jour${e.daysLeft > 1 ? 's' : ''} de traitement restant${e.daysLeft > 1 ? 's' : ''} — renouvellement à prévoir.`,
      })
    }
    if (e.category === 'controle') {
      alerts.push({
        kind: 'controle',
        uid: e.uid,
        message: `${e.brand} figure sur une liste contrôlée — conserver sous accès restreint.`,
      })
    }
    if (e.openedAt && !e.duree_pao_jours) {
      const openD = daysUntil(e.openedAt)
      if (openD != null && openD >= 0) {
        const isLiquid = /sirop|suspension|solution|goutte|collyre|buvable/i.test(e.form)
        if (isLiquid) {
          alerts.push({
            kind: 'opened',
            uid: e.uid,
            message: `${e.brand} est ouvert depuis le ${fmtDate(e.openedAt)} — respectez la durée de conservation après ouverture indiquée sur la notice.`,
          })
        }
      }
    }
    if (e.dciKey) {
      const members = seen.get(e.dciKey) ?? new Set<string>()
      const overlap = e.memberIds.filter((m) => members.has(m))
      if (overlap.length > 0) {
        alerts.push({
          kind: 'duplicate',
          uid: e.uid,
          message: `${e.brand} et une autre entrée (${e.dci}) concernent ${overlap.length > 1 ? 'plusieurs mêmes membres' : 'le même membre'} — risque de double emploi.`,
        })
      }
      e.memberIds.forEach((m) => members.add(m))
      seen.set(e.dciKey, members)
    }
  }

  return alerts.sort((a, b) => ALERT_PRIORITY[a.kind] - ALERT_PRIORITY[b.kind])
}

/** Alertes groupées par entrée (uid -> alertes). */
export function alertsByEntry(
  entries: ArmoireEntry[],
  reminders: ExpiryReminders = DEFAULT_REMINDERS
): Map<string, CabinetAlert[]> {
  const map = new Map<string, CabinetAlert[]>()
  for (const a of computeCabinetAlerts(entries, reminders)) {
    const list = map.get(a.uid) ?? []
    list.push(a)
    map.set(a.uid, list)
  }
  return map
}

/* ------------------------------------------------------------------ */
/* Score d'organisation (indicatif — jamais un score « clinique »)     */
/* ------------------------------------------------------------------ */

/**
 * Score indicatif 0–100 de l'état ORGANISATIONNEL de l'armoire :
 * périmés, retirés, stocks faibles, doublons et verrous de sécurité.
 * Ce n'est PAS un score clinique — il ne dit rien des interactions
 * (c'est le rôle de l'onglet Analyse).
 */
export function cabinetScore(
  entries: ArmoireEntry[],
  alerts: CabinetAlert[],
  hasPin: boolean
): { score: number; details: { label: string; ok: boolean; hint: string }[] } {
  const weight: Partial<Record<AlertKind, number>> = {
    expired: 12,
    withdrawn: 10,
    expiring7: 6,
    nonRenewed: 4,
    lowStock: 5,
    duplicate: 4,
    expiring30: 2,
    controle: 3,
  }
  let penalty = 0
  for (const a of alerts) penalty += weight[a.kind] ?? 0
  if (entries.length > 0 && !hasPin) penalty += 4
  const score = Math.max(0, Math.min(100, 100 - penalty))

  const byKind = (k: AlertKind) => alerts.some((a) => a.kind === k)
  const details = [
    {
      label: 'Aucun médicament périmé',
      ok: entries.length === 0 || !byKind('expired'),
      hint: 'Retirez et rapportez les périmés en pharmacie.',
    },
    {
      label: 'Aucun produit retiré du marché',
      ok: entries.length === 0 || !byKind('withdrawn'),
      hint: 'Les produits retirés doivent être rapportés en pharmacie.',
    },
    {
      label: 'Stocks chroniques suivis',
      ok: entries.length === 0 || !byKind('lowStock'),
      hint: 'Renseignez « jours restants » sur les traitements chroniques.',
    },
    {
      label: 'Pas de doublons de DCI',
      ok: entries.length === 0 || !byKind('duplicate'),
      hint: 'Deux marques de la même DCI pour un même membre = double emploi.',
    },
    {
      label: 'Verrou PIN activé',
      ok: hasPin,
      hint: 'Protégez l’accès sur un appareil partagé (Réglages).',
    },
  ]
  return { score, details }
}

/* ------------------------------------------------------------------ */
/* Regroupements (3 axes : membre / catégorie / kit)                   */
/* ------------------------------------------------------------------ */

export type GroupAxis = 'membre' | 'categorie' | 'kit'

export interface EntryGroup {
  key: string
  label: string
  entries: ArmoireEntry[]
}

export function groupEntries(
  entries: ArmoireEntry[],
  axis: GroupAxis,
  members: ArmoireMember[]
): EntryGroup[] {
  if (axis === 'categorie') {
    // Ordre canonique des catégories (constants), groupes vides omis.
    return CATEGORY_ORDER.map((cat) => {
      const list = entries.filter((e) => e.category === cat)
      return { key: cat, label: cat, entries: list }
    }).filter((g) => g.entries.length > 0)
  }
  if (axis === 'kit') {
    // Ordre canonique des kits (constants).
    return KIT_ORDER.map((kit) => {
      const list = entries.filter((e) => e.kits.includes(kit as ArmoireKit))
      return { key: kit, label: kit, entries: list }
    }).filter((g) => g.entries.length > 0)
  }
  // Axe membre — inclut un groupe « Partagé » si plusieurs membres, et « Non assigné »
  const memberGroups: EntryGroup[] = []
  for (const m of members) {
    const list = entries.filter((e) => e.memberIds.length === 1 && e.memberIds[0] === m.id)
    if (list.length > 0) memberGroups.push({ key: m.id, label: m.name, entries: list })
  }
  const shared = entries.filter((e) => e.memberIds.length > 1)
  if (shared.length > 0) memberGroups.push({ key: '__shared', label: 'Partagé', entries: shared })
  const unassigned = entries.filter((e) => e.memberIds.length === 0)
  if (unassigned.length > 0)
    memberGroups.push({ key: '__none', label: 'Non assigné', entries: unassigned })
  return memberGroups
}


/* ------------------------------------------------------------------ */
/* PAO — Expiration effective (plan 2.6)                               */
/* ------------------------------------------------------------------ */

/**
 * Calcule la date d'expiration effective en tenant compte de la PAO.
 * - Si openedAt et duree_pao_jours sont renseignés :
 *   effectiveExpiry = min(expiry, openedAt + duree_pao_jours)
 * - Sinon : effectiveExpiry = expiry
 * Retourne une date ISO 'YYYY-MM-DD' ou '' si aucune date disponible.
 */
export function effectiveExpiry(entry: {
  expiry: string
  openedAt: string
  duree_pao_jours?: number | null
}): string {
  const { expiry, openedAt, duree_pao_jours } = entry
  if (openedAt && duree_pao_jours != null && duree_pao_jours > 0) {
    const openDate = new Date(`${openedAt}T00:00:00`)
    if (!Number.isNaN(openDate.getTime())) {
      const paoDate = new Date(openDate)
      paoDate.setDate(paoDate.getDate() + duree_pao_jours)
      const paoIso = paoDate.toISOString().slice(0, 10)
      if (!expiry) return paoIso
      return paoIso < expiry ? paoIso : expiry
    }
  }
  return expiry
}

/** Whether the effective expiry is driven by the PAO (not the printed date). */
export function isPaoDriven(entry: {
  expiry: string
  openedAt: string
  duree_pao_jours?: number | null
}): boolean {
  const eff = effectiveExpiry(entry)
  return eff !== entry.expiry && eff !== ''
}

/* ------------------------------------------------------------------ */
/* Échéancier de péremption (90 jours) — PAO-aware                     */
/* ------------------------------------------------------------------ */

export interface ExpiryBucket {
  label: string
  entries: ArmoireEntry[]
}

/** Regroupe les entrées par période de péremption effective (PAO-aware) : périmé, J-7, J-30, J-90, plus tard. */
export function expiryTimeline(entries: ArmoireEntry[]): ExpiryBucket[] {
  const buckets: { label: string; test: (d: number) => boolean; entries: ArmoireEntry[] }[] = [
    { label: 'Périmés', test: (d) => d < 0, entries: [] },
    { label: 'Sous 7 jours', test: (d) => d >= 0 && d <= 7, entries: [] },
    { label: '8–30 jours', test: (d) => d > 7 && d <= 30, entries: [] },
    { label: '31–90 jours', test: (d) => d > 30 && d <= 90, entries: [] },
    { label: 'Plus de 90 jours', test: (d) => d > 90, entries: [] },
  ]
  for (const e of entries) {
    const eff = effectiveExpiry(e)
    const d = daysUntil(eff)
    if (d == null) continue
    const b = buckets.find((x) => x.test(d))
    if (b) b.entries.push(e)
  }
  return buckets.filter((b) => b.entries.length > 0).map(({ label, entries }) => ({ label, entries }))
}


/* ------------------------------------------------------------------ */
/* Recherche locale (filtre texte insensible aux accents)              */
/* ------------------------------------------------------------------ */

/**
 * Vérifie si une entrée correspond à une requête de recherche.
 * - Insensible aux accents/casse (via normKey)
 * - Multi-champs : marque, DCI, dciKey, forme, dosage, notes, catégorie
 * - Tolérance fautes 1 car. (Levenshtein ≤1) sur les tokens ≥4 chars
 */
export function entryMatchesQuery(
  e: ArmoireEntry,
  q: string,
  memberNames?: string[]
): boolean {
  const t = normKey(q)
  if (!t) return true

  // Champs concaténés pour la recherche
  const fields = [
    normKey(e.brand),
    normKey(e.dci),
    normKey(e.dciKey),
    normKey(e.form),
    normKey(e.dosage),
    normKey(e.notes),
    normKey(e.category),
    ...(memberNames ?? []).map(normKey),
  ]

  // Correspondance exacte d'abord
  if (fields.some((f) => f.includes(t))) return true

  // Tolérance fautes 1 char sur chaque token de la requête (min 4 chars)
  const tokens = t.split(/\s+/).filter((x) => x.length >= 4)
  if (tokens.length === 0) return false
  return tokens.every((tok) =>
    fields.some((f) => {
      if (f.includes(tok)) return true
      // Levenshtein ≤ 1 sur chaque mot du champ
      return f.split(/\s+/).some((word) => levenshtein(word, tok) <= 1)
    })
  )
}

/** Levenshtein distance (capped at 2 for performance). */
function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      if (dp[i][j] > 2) return dp[i][j] // early exit
    }
  }
  return dp[m][n]
}

/* ------------------------------------------------------------------ */
/* Lecture localStorage sûre (rappels d'expiration)                    */
/* ------------------------------------------------------------------ */

export function readReminders(): ExpiryReminders {
  try {
    const raw = localStorage.getItem('armoire.remind.v1')
    if (raw) return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ExpiryReminders>) }
  } catch {
    /* stockage indisponible */
  }
  return { ...DEFAULT_REMINDERS }
}

export function writeReminders(r: ExpiryReminders): void {
  try {
    localStorage.setItem('armoire.remind.v1', JSON.stringify(r))
  } catch {
    /* ignore */
  }
}
