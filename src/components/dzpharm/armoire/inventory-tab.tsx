'use client'

/**
 * Armoire — Onglet « Inventaire » (plans 3.4.1/4/6/7/14).
 *
 * Gestion complète des médicaments du foyer : recherche locale, filtres par
 * membre et par statut, regroupement (membre / catégorie / lieu de rangement),
 * tri (péremption / nom / ajout récent) et cartes EntryCard riches.
 *
 * Aucune donnée clinique inventée : les alertes proviennent des calculs
 * locaux (utils), les conseils de tri renvoient vers les recommandations
 * officielles (ANSM / Ministère de la Santé) et la notice.
 */

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Pencil,
  Plus,
  Recycle,
  Search,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AlertKind, ArmoireCategory, ArmoireEntry, ArmoireKit, ArmoireMember } from './types'
import { CATEGORY_META, CATEGORY_ORDER, KIT_META, memberColor } from './constants'
import type { EntryGroup, GroupAxis } from './utils'
import { alertsByEntry, daysUntil, entryMatchesQuery, groupEntries, initials } from './utils'
import { EntryCard } from './entry-card'

export interface InventoryTabProps {
  members: ArmoireMember[]
  entries: ArmoireEntry[]
  onAddEntry: (presetMemberId?: string) => void
  onEdit: (entry: ArmoireEntry) => void
  onRemove: (uid: string) => void
  onOpenSheet: (drugId: number) => void
  onRestock: (entry: ArmoireEntry) => void
  onManageMembers: () => void
}

/* ------------------------------------------------------------------ */
/* Méta locales                                                        */
/* ------------------------------------------------------------------ */

/** Alertes qui font apparaître une entrée dans le filtre « À traiter ». */
const TREAT_KINDS: AlertKind[] = [
  'expired',
  'expiring7',
  'expiring30',
  'withdrawn',
  'nonRenewed',
  'lowStock',
]

type SortMode = 'peremption' | 'nom' | 'ajout'

/** Tri INTRA-groupe (copie, jamais de mutation des props). */
function sortEntries(list: ArmoireEntry[], mode: SortMode): ArmoireEntry[] {
  const copy = [...list]
  if (mode === 'peremption') {
    copy.sort((a, b) => {
      const da = daysUntil(a.expiry)
      const db = daysUntil(b.expiry)
      if (da == null && db == null) return a.brand.localeCompare(b.brand, 'fr')
      if (da == null) return 1
      if (db == null) return -1
      if (da === db) return a.brand.localeCompare(b.brand, 'fr')
      return da - db
    })
  } else if (mode === 'nom') {
    copy.sort((a, b) => a.brand.localeCompare(b.brand, 'fr'))
  } else {
    copy.sort((a, b) => b.addedAt - a.addedAt)
  }
  return copy
}

/* ------------------------------------------------------------------ */
/* Onglet Inventaire                                                   */
/* ------------------------------------------------------------------ */

export function InventoryTab({
  members,
  entries,
  onAddEntry,
  onEdit,
  onRemove,
  onOpenSheet,
  onRestock,
  onManageMembers,
}: InventoryTabProps) {
  /* ------------- Contrôles ----------------------------------------- */
  const [query, setQuery] = useState('')
  const [axis, setAxis] = useState<GroupAxis>('membre')
  const [sort, setSort] = useState<SortMode>('peremption')
  const [statusFilter, setStatusFilter] = useState<'alertes' | 'tous'>('tous')
  const [memberFilter, setMemberFilter] = useState<string>('all')

  /* ------------- Alertes par entrée (calcul local) ----------------- */
  const perEntry = useMemo(() => alertsByEntry(entries), [entries])

  /* ------------- Filtres ------------------------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim()
    return entries.filter((e) => {
      if (q && !entryMatchesQuery(e, q)) return false
      if (memberFilter !== 'all' && !e.memberIds.includes(memberFilter)) return false
      if (statusFilter === 'alertes') {
        const list = perEntry.get(e.uid)
        const treat = list != null && list.some((a) => TREAT_KINDS.includes(a.kind))
        if (!treat) return false
      }
      return true
    })
  }, [entries, query, memberFilter, statusFilter, perEntry])

  /* ------------- Groupes + tri intra-groupe ------------------------ */
  const groups = useMemo(() => {
    // groupEntries gère les 3 axes (membre / catégorie / kit) dans
    // l'ordre canonique des constantes.
    const base = groupEntries(filtered, axis, members)
    return base.map((g) => ({
      ...g,
      entries: sortEntries(g.entries, sort),
    }))
  }, [filtered, axis, members, sort])

  /** Libellé de groupe — l'axe membre est déjà libellé (groupEntries). */
  function groupLabel(g: EntryGroup): string {
    if (axis === 'membre') return g.label
    return (
      CATEGORY_META[g.key as ArmoireCategory]?.label ??
      KIT_META[g.key as ArmoireKit]?.label ??
      g.key
    )
  }

  /** Icône de groupe (catégorie / kit ; l'axe membre utilise un avatar). */
  function groupIcon(key: string): LucideIcon | null {
    const cat = CATEGORY_META[key as ArmoireCategory]
    if (cat) return cat.icon
    const kit = KIT_META[key as ArmoireKit]
    if (kit) return kit.icon
    return null
  }

  const memberCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) for (const id of e.memberIds) map.set(id, (map.get(id) ?? 0) + 1)
    return map
  }, [entries])

  const treatCount = useMemo(
    () =>
      entries.filter((e) => {
        const list = perEntry.get(e.uid)
        return list != null && list.some((a) => TREAT_KINDS.includes(a.kind))
      }).length,
    [entries, perEntry]
  )

  const visibleAlertCount = useMemo(
    () => filtered.reduce((n, e) => n + (perEntry.get(e.uid)?.length ?? 0), 0),
    [filtered, perEntry]
  )

  const hasExpiredVisible = useMemo(
    () => filtered.some((e) => daysUntil(e.expiry) != null && (daysUntil(e.expiry) as number) < 0),
    [filtered]
  )

  const hasFilters = query.trim() !== '' || memberFilter !== 'all' || statusFilter !== 'tous'

  function resetFilters() {
    setQuery('')
    setMemberFilter('all')
    setStatusFilter('tous')
  }

  /* --------------------------- Rendu -------------------------------- */

  if (entries.length === 0) {
    /* ------------- État vide -------------------------------------- */
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-8 text-center sm:py-10">
            <span
              className="flex size-16 items-center justify-center rounded-full bg-primary/10"
              aria-hidden
            >
              <Search className="size-8 text-primary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Aucun médicament dans l’armoire
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Ajoutez les médicaments présents à la maison pour suivre les péremptions,
              les stocks et les interactions du foyer.
            </p>
            <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onAddEntry()}
                className="flex min-h-11 flex-col items-start gap-2 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpen className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">
                  Ajouter depuis le répertoire
                </span>
                <span className="text-xs text-muted-foreground">
                  Recherche parmi 9 555 AMM, pré-remplissage automatique.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAddEntry()}
                className="flex min-h-11 flex-col items-start gap-2 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">Saisie manuelle</span>
                <span className="text-xs text-muted-foreground">
                  OTC et parapharmacie hors répertoire.
                </span>
              </button>
              <button
                type="button"
                onClick={onManageMembers}
                className="flex min-h-11 flex-col items-start gap-2 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Users className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">
                  Gérer les membres
                </span>
                <span className="text-xs text-muted-foreground">
                  Attribuez chaque médicament à qui le prend.
                </span>
              </button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Aucune donnée envoyée en ligne hors analyse (les noms de personnes restent sur
              cet appareil).
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ---------------- Barre de contrôle (sticky) ---------------- */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 py-3 backdrop-blur print:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un médicament, une DCI…"
              aria-label="Rechercher un médicament, une DCI"
              className="h-11 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={axis} onValueChange={(v) => setAxis(v as GroupAxis)}>
              <SelectTrigger
                aria-label="Regrouper par"
                className="h-11 min-w-0 flex-1 sm:w-44"
              >
                <span className="hidden shrink-0 text-muted-foreground sm:inline">
                  Regrouper :
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membre">Membre</SelectItem>
                <SelectItem value="categorie">Catégorie</SelectItem>
                <SelectItem value="kit">Lieu de rangement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger aria-label="Trier par" className="h-11 min-w-0 flex-1 sm:w-40">
                <span className="hidden shrink-0 text-muted-foreground sm:inline">
                  Trier :
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peremption">Péremption</SelectItem>
                <SelectItem value="nom">Nom</SelectItem>
                <SelectItem value="ajout">Ajout récent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2" role="group" aria-label="Filtrer par statut">
          <button
            type="button"
            aria-pressed={statusFilter === 'alertes'}
            onClick={() => setStatusFilter('alertes')}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusFilter === 'alertes'
                ? 'border-state-warning/40 bg-state-warning/10 text-state-warning'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            )}
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            À traiter
            <span className="tabular-nums">({treatCount})</span>
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'tous'}
            onClick={() => setStatusFilter('tous')}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusFilter === 'tous'
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            )}
          >
            Tous
          </button>
        </div>
      </div>

      {/* ---------------- Filtres par membre ---------------- */}
      {members.length > 0 ? (
        <div
          className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 print:hidden"
          role="group"
          aria-label="Filtrer par membre"
        >
          <button
            type="button"
            aria-pressed={memberFilter === 'all'}
            onClick={() => setMemberFilter('all')}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              memberFilter === 'all'
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Users className="size-3.5" aria-hidden />
            Tout le foyer
            <span className="tabular-nums opacity-70">{entries.length}</span>
          </button>
          {members.map((m) => {
            const c = memberColor(m.color)
            const count = memberCount.get(m.id) ?? 0
            const selected = memberFilter === m.id
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMemberFilter(selected ? 'all' : m.id)}
                className={cn(
                  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                )}
              >
                <span className={cn('size-3 shrink-0 rounded-full', c.dot)} aria-hidden />
                <span className="truncate">{m.name}</span>
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* ---------------- Groupes d'entrées ---------------- */}
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucun médicament ne correspond à votre recherche ou aux filtres actifs.
          {hasFilters ? (
            <>
              {' '}
              <button
                type="button"
                onClick={resetFilters}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Réinitialiser les filtres
              </button>
            </>
          ) : null}
        </p>
      ) : (
        groups.map((g) => {
          const member = axis === 'membre' ? members.find((m) => m.id === g.key) : undefined
          const Icon = axis === 'membre' ? null : groupIcon(g.key)
          return (
            <section
              key={`${axis}-${g.key}`}
              aria-labelledby={`group-${axis}-${g.key}`}
              className="space-y-3"
            >
              {/* En-tête de groupe */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {member ? (
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      memberColor(member.color).chip
                    )}
                  >
                    {initials(member.name)}
                  </span>
                ) : axis === 'membre' ? (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    {g.key === '__none' ? (
                      <UserX className="size-4" aria-hidden />
                    ) : (
                      <Users className="size-4" aria-hidden />
                    )}
                  </span>
                ) : Icon ? (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                ) : null}
                <h3
                  id={`group-${axis}-${g.key}`}
                  className="text-sm font-semibold text-foreground"
                >
                  {groupLabel(g)}
                </h3>
                <Badge variant="outline" className="tabular-nums">
                  {g.entries.length}
                </Badge>
                {member ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddEntry(member.id)}
                    aria-label={`Ajouter un médicament pour ${member.name}`}
                    className="ml-auto h-11 gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Plus className="size-4" aria-hidden />
                    Ajouter pour {member.name}
                  </Button>
                ) : null}
              </div>

              {/* Cartes */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {g.entries.map((e) => (
                  <EntryCard
                    key={e.uid}
                    entry={e}
                    members={members}
                    alerts={perEntry.get(e.uid) ?? []}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    onOpenSheet={onOpenSheet}
                    onRestock={onRestock}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {/* ---------------- Produits périmés : que faire ? ---------------- */}
      {hasExpiredVisible ? (
        <Card className="border-state-warning/40">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-state-warning/10"
                aria-hidden
              >
                <Recycle className="size-5 text-state-warning" />
              </span>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Produits périmés — que faire ?
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  Rapportez vos médicaments périmés ou inutilisés en pharmacie (circuit de
                  collecte) — ne les jetez ni à la poubelle ni aux toilettes.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Consigne générale de bon usage (recommandations type ANSM / Ministère de la
                  Santé) — suivez avant tout les mentions de la notice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Pied de liste ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
        <p className="text-xs text-muted-foreground">
          {filtered.length} médicament{filtered.length > 1 ? 's' : ''} affiché
          {filtered.length > 1 ? 's' : ''} / {entries.length} au total
          {visibleAlertCount > 0 ? (
            <>
              {' '}
              · <span className="text-state-warning">{visibleAlertCount} alerte{visibleAlertCount > 1 ? 's' : ''}</span>
            </>
          ) : null}
        </p>
        <Button variant="outline" onClick={() => onAddEntry()} className="h-11 gap-1.5">
          <Plus className="size-4" aria-hidden />
          Ajouter un médicament
        </Button>
      </div>
    </div>
  )
}
