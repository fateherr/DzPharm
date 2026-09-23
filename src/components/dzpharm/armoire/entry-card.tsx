'use client'

/**
 * Armoire — carte d'inventaire d'une entrée (onglet Inventaire).
 *
 * Phase 4 (PAO) : affiche la date d'expiration EFFECTIVE (min(expiry, PAO)),
 * badge PAO quand la limite est imposée par l'ouverture du flacon, et
 * bouton "Ouvrir aujourd'hui" quand le flacon n'est pas encore marqué ouvert.
 */

import { BookOpen, CalendarClock, Droplets, FlaskConical, Pencil, ShoppingBag, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AlertKind, ArmoireEntry, ArmoireMember, CabinetAlert } from './types'
import { CATEGORY_META, KIT_META, memberColor } from './constants'
import { ALERT_KIND_META, daysUntil, effectiveExpiry, fmtDate, initials, isPaoDriven } from './utils'

export interface EntryCardProps {
  entry: ArmoireEntry
  members: ArmoireMember[]
  /** Alertes calculées pour CETTE entrée uniquement. */
  alerts: CabinetAlert[]
  onEdit: (entry: ArmoireEntry) => void
  onRemove: (uid: string) => void
  onOpenSheet: (drugId: number) => void
  onRestock: (entry: ArmoireEntry) => void
  /** Action "Marquer comme ouvert aujourd'hui" (plan 2.6). */
  onMarkOpened?: (uid: string) => void
}

/** Alertes qui justifient un réassort (lien prix & génériques — plan 3.4.14). */
const RESTOCK_KINDS: AlertKind[] = [
  'expired',
  'expiring7',
  'expiring30',
  'lowStock',
  'withdrawn',
  'nonRenewed',
]

const DANGER_KINDS: AlertKind[] = ['expired', 'expiring7', 'withdrawn']
const WARNING_KINDS: AlertKind[] = ['expiring30', 'lowStock', 'nonRenewed']

/** Statut registre — badge discret (texte + couleur, jamais la couleur seule). */
const REGISTRY_BADGE: Record<string, { label: string; className: string }> = {
  RETRIE: {
    label: 'Retiré',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  NON_RENOUVELE: {
    label: 'Non renouvelé',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  MANUEL: {
    label: 'Manuel',
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
}

/** Formes liquides — même détection que computeCabinetAlerts (utils). */
const LIQUID_FORM = /sirop|suspension|solution|goutte|collyre|buvable|ophtalmique/i

/** DCI « nettoyée » : retire les marqueurs d'association «**». */
function cleanDci(dci: string): string {
  return dci.replace(/\*\*/g, '').trim()
}

export function EntryCard({ entry, members, alerts, onEdit, onRemove, onOpenSheet, onRestock, onMarkOpened }: EntryCardProps) {
  const kinds = alerts.map((a) => a.kind)

  const hasDanger = kinds.some((k) => DANGER_KINDS.includes(k))
  const hasWarning = kinds.some((k) => WARNING_KINDS.includes(k))
  const cardBorder = hasDanger
    ? 'border-state-danger/40 border-l-4 border-l-state-danger'
    : hasWarning
      ? 'border-state-warning/40 border-l-4 border-l-state-warning'
      : 'border-border border-l-4 border-l-border'

  const registryBadge =
    entry.status !== 'ACTIF' ? REGISTRY_BADGE[entry.status] ?? {
      label: 'Manuel',
      className: 'border-border bg-muted/60 text-muted-foreground',
    } : null

  /* ----- Péremption PAO-aware ----- */
  const effExpiry = effectiveExpiry(entry)
  const expiryDays = daysUntil(effExpiry)
  const isExpired = expiryDays != null && expiryDays < 0
  const paoDriven = isPaoDriven(entry)
  const isLiquid = LIQUID_FORM.test(entry.form)

  // "Ouvrir aujourd'hui" button — shown when entry has PAO configured but not yet opened
  const showOpenBtn =
    onMarkOpened &&
    !entry.openedAt &&
    entry.duree_pao_jours != null &&
    isLiquid

  const visibleAlerts = alerts.slice(0, 2)
  const hiddenAlerts = alerts.slice(2)

  /* ----- Membres ----- */
  const assignedMembers = entry.memberIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is ArmoireMember => m != null)
  const shownMembers = assignedMembers.slice(0, 3)
  const extraMembers = assignedMembers.slice(3)

  const catMeta = CATEGORY_META[entry.category] ?? CATEGORY_META.besoin
  const CatIcon = catMeta.icon

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        cardBorder
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Ligne 1 — marque + badges */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className="min-w-0 flex-1 basis-32 truncate text-sm font-semibold text-foreground"
                title={entry.brand}
              >
                {entry.brand}
              </p>
              <Badge variant="outline" className={cn('gap-1', catMeta.badgeClass)}>
                <CatIcon className="size-3" aria-hidden />
                {catMeta.label}
              </Badge>
              {paoDriven ? (
                <Badge variant="outline" className="gap-1 border-chifa/40 bg-chifa/10 text-chifa" title="Expiration limitée par la durée après ouverture (PAO)">
                  <FlaskConical className="size-3" aria-hidden />
                  PAO
                </Badge>
              ) : null}
              {visibleAlerts.map((a) => {
                const meta = ALERT_KIND_META[a.kind]
                return (
                  <Badge
                    key={a.kind}
                    variant="outline"
                    className={cn('gap-1', meta.className)}
                    title={a.message}
                  >
                    {meta.short}
                  </Badge>
                )
              })}
              {hiddenAlerts.length > 0 ? (
                <Badge
                  variant="outline"
                  className="border-border bg-muted/60 text-muted-foreground"
                  title={hiddenAlerts.map((a) => ALERT_KIND_META[a.kind].label).join(' · ')}
                >
                  +{hiddenAlerts.length}
                </Badge>
              ) : null}
              {registryBadge ? (
                <Badge
                  variant="outline"
                  className={cn('gap-1', registryBadge.className)}
                  title="Statut registre DzPharm"
                >
                  {registryBadge.label}
                </Badge>
              ) : null}
            </div>

            {/* Ligne 2 — DCI · forme · dosage */}
            <p className="truncate text-xs text-muted-foreground">
              {[cleanDci(entry.dci), entry.form, entry.dosage].filter(Boolean).join(' · ') ||
                'Détails non renseignés'}
            </p>

            {/* Ligne 3 — membres · kits · quantité */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              {assignedMembers.length === 0 ? (
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden />
                  Non assigné
                </span>
              ) : (
                <span
                  className="flex -space-x-1.5"
                  title={assignedMembers.map((m) => m.name).join(', ')}
                >
                  {shownMembers.map((m) => {
                    const c = memberColor(m.color)
                    return (
                      <span
                        key={m.id}
                        title={m.name}
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-card',
                          c.dot
                        )}
                      >
                        {initials(m.name)}
                      </span>
                    )
                  })}
                  {extraMembers.length > 0 ? (
                    <span
                      title={extraMembers.map((m) => m.name).join(', ')}
                      className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card tabular-nums"
                    >
                      +{extraMembers.length}
                    </span>
                  ) : null}
                </span>
              )}
              {entry.kits.length > 0 ? (
                <span className="flex items-center gap-1.5" aria-label="Kits de rangement">
                  {entry.kits.map((k) => {
                    const meta = KIT_META[k]
                    if (!meta) return null
                    const Icon = meta.icon
                    return (
                      <span
                        key={k}
                        title={meta.label}
                        role="img"
                        aria-label={meta.label}
                        className="text-muted-foreground"
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                    )
                  })}
                </span>
              ) : null}
              <span className="font-medium tabular-nums">×{entry.quantity}</span>
            </div>

            {/* Ligne 4 — péremption effective / PAO / stock / ouverture */}
            {isExpired || expiryDays != null || (entry.category === 'chronique' && entry.daysLeft != null) || (entry.openedAt && isLiquid) ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {isExpired ? (
                  <span className="flex items-center gap-1 font-semibold text-state-danger">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {paoDriven ? 'Périmé (PAO)' : 'Périmé'} depuis {Math.abs(expiryDays!)} j
                  </span>
                ) : expiryDays != null ? (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      expiryDays <= 7
                        ? 'text-state-danger'
                        : expiryDays <= 30
                          ? 'text-state-warning'
                          : 'text-muted-foreground'
                    )}
                  >
                    <CalendarClock className="size-3.5" aria-hidden />
                    {paoDriven ? 'PAO' : 'Expire'} : {fmtDate(effExpiry)}
                    <span className="font-semibold tabular-nums">J-{expiryDays}</span>
                  </span>
                ) : null}

                {entry.category === 'chronique' && entry.daysLeft != null ? (
                  <span
                    className={cn(
                      entry.daysLeft <= 7 ? 'font-semibold text-state-warning' : 'text-muted-foreground'
                    )}
                  >
                    Stock : ~{entry.daysLeft} j
                  </span>
                ) : null}

                {entry.openedAt && isLiquid ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Droplets className="size-3.5" aria-hidden />
                    Ouvert le {fmtDate(entry.openedAt)}
                    {entry.duree_pao_jours ? ` · PAO ${entry.duree_pao_jours} j` : ''}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Ligne 5 — "Ouvrir aujourd'hui" (plan 2.6) */}
            {showOpenBtn ? (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-chifa underline underline-offset-2 hover:text-chifa/80"
                onClick={() => onMarkOpened!(entry.uid)}
              >
                <Droplets className="size-3" aria-hidden />
                Marquer comme ouvert aujourd&apos;hui
              </button>
            ) : null}

            {/* Ligne 6 — notes */}
            {entry.notes ? (
              <p
                className="line-clamp-2 text-xs italic text-muted-foreground/90"
                title={entry.notes}
              >
                {entry.notes}
              </p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-row items-center gap-1 sm:flex-col sm:items-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={`Modifier l'entrée ${entry.brand}`}
              title="Modifier"
              onClick={() => onEdit(entry)}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            {entry.drugId != null ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Voir la fiche médicament ${entry.brand}`}
                title="Voir la fiche médicament"
                onClick={() => onOpenSheet(entry.drugId as number)}
              >
                <BookOpen className="size-4" aria-hidden />
              </Button>
            ) : null}
            {kinds.some((k) => RESTOCK_KINDS.includes(k)) ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-chifa hover:bg-chifa/10 hover:text-chifa"
                aria-label={`Prix et génériques — renouveler ${entry.brand}`}
                title="Prix & génériques (réassort)"
                onClick={() => onRestock(entry)}
              >
                <ShoppingBag className="size-4" aria-hidden />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-state-danger hover:bg-state-danger/10 hover:text-state-danger"
              aria-label={`Retirer ${entry.brand} de l'armoire`}
              title="Retirer de l'armoire"
              onClick={() => onRemove(entry.uid)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
