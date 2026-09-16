import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DrugStatus, GlobalRisk, InteractionSeverity } from './types'

/* ------------------------------------------------------------------ */
/* Statut d'enregistrement : ACTIF / NON_RENOUVELE / RETRIE            */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<DrugStatus, { label: string; className: string; dot: string }> = {
  ACTIF: {
    label: 'Actif',
    className: 'border-state-safe/30 bg-state-safe/10 text-state-safe',
    dot: 'bg-state-safe',
  },
  NON_RENOUVELE: {
    label: 'Non renouvelé',
    className: 'border-state-warning/30 bg-state-warning/10 text-state-warning',
    dot: 'bg-state-warning',
  },
  RETRIE: {
    label: 'Retiré',
    className: 'border-state-danger/30 bg-state-danger/10 text-state-danger',
    dot: 'bg-state-danger',
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: DrugStatus | string
  className?: string
}) {
  const meta = STATUS_META[status as DrugStatus] ?? {
    label: status || 'Inconnu',
    className: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  }
  return (
    <Badge variant="outline" className={cn('gap-1.5', meta.className, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Liste (I / II / Stupéfiant)                                         */
/* ------------------------------------------------------------------ */

export function ListeBadge({ liste, className }: { liste?: string | null; className?: string }) {
  if (!liste) return null
  const normalized = liste.toUpperCase().replace(/\s+/g, ' ').trim()
  const isStup = normalized.includes('STUPE')
  const isListe1 = normalized === 'LISTE I'
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        isStup
          ? 'border-state-danger/40 bg-state-danger/10 text-state-danger font-semibold'
          : isListe1
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border bg-secondary text-secondary-foreground',
        className
      )}
    >
      {isStup
        ? 'Stupéfiant'
        : normalized
            .toLowerCase()
            .replace('liste i', 'Liste I')
            .replace('liste ii', 'Liste II')}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Gravité d'interaction médicamenteuse                                */
/* ------------------------------------------------------------------ */

const SEVERITY_META: Record<InteractionSeverity, { label: string; className: string }> = {
  'CONTRE-INDIQUE': {
    label: 'Contre-indication',
    className: 'border-transparent bg-state-danger text-white font-bold',
  },
  MAJEURE: {
    label: 'Majeure',
    className: 'border-state-danger/40 bg-state-danger/15 text-state-danger font-semibold',
  },
  MODEREE: {
    label: 'Modérée',
    className: 'border-state-warning/40 bg-state-warning/15 text-state-warning',
  },
  MINEURE: {
    label: 'Mineure',
    className: 'border-border bg-secondary text-secondary-foreground',
  },
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: InteractionSeverity
  className?: string
}) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.MINEURE
  return (
    <Badge variant="outline" className={cn('gap-1.5', meta.className, className)}>
      {meta.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Risque global                                                       */
/* ------------------------------------------------------------------ */

export const RISK_META: Record<
  GlobalRisk,
  { label: string; className: string; border: string; icon: string }
> = {
  FAIBLE: {
    label: 'Risque faible',
    className: 'bg-state-safe/10 text-state-safe',
    border: 'border-state-safe/40',
    icon: 'text-state-safe',
  },
  MODERE: {
    label: 'Risque modéré',
    className: 'bg-state-warning/10 text-state-warning',
    border: 'border-state-warning/40',
    icon: 'text-state-warning',
  },
  ELEVE: {
    label: 'Risque élevé',
    className: 'bg-state-warning/20 text-state-warning',
    border: 'border-state-warning/50',
    icon: 'text-state-warning',
  },
  CRITIQUE: {
    label: 'Risque critique',
    className: 'bg-state-danger/15 text-state-danger font-bold',
    border: 'border-state-danger/50',
    icon: 'text-state-danger',
  },
}

/* ------------------------------------------------------------------ */
/* Badges Origine & Remboursement Chifa                               */
/* ------------------------------------------------------------------ */

export function OriginBadge({
  country,
  className,
}: {
  country?: string | null
  className?: string
}) {
  const local = isLocal(country)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        local
          ? 'border-state-safe/30 bg-state-safe/10 text-state-safe'
          : 'border-border/80 bg-muted/60 text-muted-foreground',
        className
      )}
    >
      <span aria-hidden>{local ? '🇩🇿' : '🌐'}</span>
      <span>{local ? 'Produit local' : 'Importé'}</span>
    </span>
  )
}

export function ChifaBadge({
  refundable,
  cnasId,
  className,
}: {
  refundable?: boolean | null
  cnasId?: string | number | null
  className?: string
}) {
  if (refundable) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-chifa/35 bg-chifa/10 px-2 py-0.5 text-xs font-bold text-chifa',
          className
        )}
        title={cnasId ? `Remboursable CNAS (Code: ${cnasId})` : 'Pris en charge par la sécurité sociale (Chifa)'}
      >
        <span className="size-1.5 rounded-full bg-chifa" aria-hidden />
        Chifa CNAS
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground',
        className
      )}
    >
      Non remboursé
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Utilitaires de formatage                                            */
/* ------------------------------------------------------------------ */

const frNumber = new Intl.NumberFormat('fr-FR')

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return frNumber.format(n)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Prix en dinars algériens : « 1 234,56 DA » (décimales masquées si entières). */
const frPrice = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${frPrice.format(n)} DA`
}

/** Code pays ISO sur 2 lettres (affiché en texte, sans emoji). */
export function countryCode(country: string | null | undefined): string {
  if (!country) return ''
  const c = country.toUpperCase().trim()
  const map: Record<string, string> = {
    ALGERIE: 'DZ',
    FRANCE: 'FR',
    INDE: 'IN',
    JORDANIE: 'JO',
    ALLEMAGNE: 'DE',
    SUISSE: 'CH',
    ITALIE: 'IT',
    ESPAGNE: 'ES',
    TUNISIE: 'TN',
    MAROC: 'MA',
    EGYPTE: 'EG',
    TURQUIE: 'TR',
    CHINE: 'CN',
    ROYAUME_UNI: 'GB',
    'ROYAUME-UNI': 'GB',
    BELGIQUE: 'BE',
    PAYS_BAS: 'NL',
    DANEMARK: 'DK',
    USA: 'US',
    'ETATS-UNIS': 'US',
    "ETATS-UNIS D'AMERIQUE": 'US',
    GRECE: 'GR',
    PORTUGAL: 'PT',
    CHYPRE: 'CY',
    MALTE: 'MT',
    HONGRIE: 'HU',
    POLOGNE: 'PL',
    REPUBLIQUE_TCHEQUE: 'CZ',
    'REPUBLIQUE TCHEQUE': 'CZ',
    COREE: 'KR',
    'COREE DU SUD': 'KR',
    JAPON: 'JP',
    CANADA: 'CA',
    ARABIE_SAOUDITE: 'SA',
    'ARABIE SAOUDITE': 'SA',
    EMIRATS: 'AE',
    'EMIRATS ARABES UNIS': 'AE',
    SYRIE: 'SY',
    LIBAN: 'LB',
    LIBYE: 'LY',
    MAURITANIE: 'MR',
    SENEGAL: 'SN',
    KOWEIT: 'KW',
    QATAR: 'QA',
    BAHREIN: 'BH',
    OM: 'OM',
    SUEDE: 'SE',
    IRLANDE: 'IE',
    AUTRICHE: 'AT',
    FINLANDE: 'FI',
    NORVEGE: 'NO',
    AUSTRALIE: 'AU',
    BRESIL: 'BR',
    MEXIQUE: 'MX',
    ARGENTINE: 'AR',
    INDONESIE: 'ID',
    MALAISIE: 'MY',
    THAILANDE: 'TH',
    VIETNAM: 'VN',
    PAKISTAN: 'PK',
    BANGLADESH: 'BD',
    NIGERIA: 'NG',
    KENYA: 'KE',
    GHANA: 'GH',
    COTE_D_IVOIRE: 'CI',
    "COTE D'IVOIRE": 'CI',
    CAMEROUN: 'CM',
  }
  return map[c] ?? ''
}

export function isLocal(country: string | null | undefined): boolean {
  return !!country && country.toUpperCase().includes('ALGERIE')
}
