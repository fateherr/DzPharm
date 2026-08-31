'use client'

/**
 * Armoire — Onglet « Urgence » (plan 3.4.9).
 *
 * Fiche d'urgence lisible en moins de 10 secondes : numéros d'urgence en
 * un appui (SAMU 14, Centre Anti-Poison d'Alger), sélection de la personne
 * concernée, traitements en cours + allergies, partage texte et impression.
 *
 * Aucune donnée clinique n'est calculée ici : uniquement le relevé déclaratif
 * local (allergies, traitements, quantités) à lire au téléphone.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  Ambulance,
  Baby,
  Milk,
  Phone,
  Printer,
  Repeat,
  Share2,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '../status-badge'
import { CATEGORY_META, RELATION_META, memberColor } from './constants'
import { ageLabel, initials } from './utils'
import type { ArmoireEntry, ArmoireMember } from './types'

export interface EmergencyTabProps {
  members: ArmoireMember[]
  entries: ArmoireEntry[]
}

const FOYER_KEY = '__foyer'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Entrées d'un membre (médicaments propres + partagés). */
function memberEntries(entries: ArmoireEntry[], memberId: string): ArmoireEntry[] {
  return entries.filter((e) => e.memberIds.includes(memberId))
}

interface MemberFlag {
  id: string
  label: string
  icon: LucideIcon
  className: string
}

function flagsOf(m: ArmoireMember): MemberFlag[] {
  return [
    m.pregnant
      ? { id: 'preg', label: 'Grossesse', icon: Baby, className: 'border-primary/30 bg-primary/5 text-primary' }
      : null,
    m.breastfeeding
      ? { id: 'bf', label: 'Allaitement', icon: Milk, className: 'border-primary/30 bg-primary/5 text-primary' }
      : null,
    m.renal
      ? {
          id: 'renal',
          label: 'Fonction rénale',
          icon: Activity,
          className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
        }
      : null,
  ].filter((f): f is MemberFlag => f != null)
}

function entryLine(e: ArmoireEntry): string {
  const parts = [e.brand]
  if (e.dci) parts.push(`${e.dci}${e.dosage ? ` ${e.dosage}` : ''}`)
  if (e.form) parts.push(e.form)
  parts.push(CATEGORY_META[e.category].label)
  parts.push(`qté ${e.quantity}`)
  return `- ${parts.join(' — ')}`
}

function buildMemberText(m: ArmoireMember, list: ArmoireEntry[]): string {
  const lines: string[] = []
  lines.push(m.name.toUpperCase())
  lines.push(`Âge : ${ageLabel(m.ageYears)}${m.weightKg != null ? ` · Poids : ${m.weightKg} kg` : ''}`)
  lines.push(
    m.allergies.length > 0
      ? `Allergies : ${m.allergies.join(', ')}`
      : 'Allergies : aucune déclarée'
  )
  const fl = flagsOf(m)
  if (fl.length > 0) lines.push(`Drapeaux : ${fl.map((f) => f.label).join(', ')}`)
  lines.push(`Traitements en cours (${list.length}) :`)
  if (list.length === 0) lines.push('- aucun médicament assigné')
  else list.forEach((e) => lines.push(entryLine(e)))
  return lines.join('\n')
}

function buildShareText(members: ArmoireMember[], entries: ArmoireEntry[], selection: string): string {
  const header = 'Fiche d’urgence — DzPharm Armoire familiale'
  if (selection !== FOYER_KEY) {
    const m = members.find((x) => x.id === selection)
    if (!m) return header
    const body = buildMemberText(m, memberEntries(entries, m.id))
    return `${header}\n${body}\nCarte d’aide — ne remplace pas une prise en charge médicale. Données déclaratives locales.`
  }
  const sections = members.map((m) => buildMemberText(m, memberEntries(entries, m.id)))
  const totalBoxes = entries.reduce((acc, e) => acc + e.quantity, 0)
  const unassigned = entries.filter((e) => e.memberIds.length === 0)
  const tail =
    unassigned.length > 0
      ? `\nNon assignés (${unassigned.length}) :\n${unassigned.map(entryLine).join('\n')}`
      : ''
  return `${header} — Tout le foyer (${members.length} personnes, ${totalBoxes} boîtes)\n\n${sections.join(
    '\n\n'
  )}${tail}\nCarte d’aide — ne remplace pas une prise en charge médicale. Données déclaratives locales.`
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

function MemberAvatar({
  member,
  className,
}: {
  member: ArmoireMember
  className?: string
}) {
  const c = memberColor(member.color)
  return (
    <span
      role="img"
      aria-label={member.name}
      title={member.name}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        c.chip,
        className
      )}
    >
      {initials(member.name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Fiche membre                                                        */
/* ------------------------------------------------------------------ */

function MemberCard({
  member,
  entries,
}: {
  member: ArmoireMember
  entries: ArmoireEntry[]
}) {
  const list = memberEntries(entries, member.id)
  const flags = flagsOf(member)

  return (
    <Card id={`urgence-fiche-${member.id}`} className="print:border-foreground print:shadow-none">
      <CardContent className="space-y-4 p-4">
        {/* En-tête : identité */}
        <div className="flex items-center gap-3">
          <MemberAvatar member={member} />
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold tracking-tight text-foreground uppercase">
              {member.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {RELATION_META[member.relation].label} · {ageLabel(member.ageYears)}
              {member.weightKg != null ? ` · ${member.weightKg} kg` : ''}
            </p>
          </div>
        </div>

        {/* Allergies — le point critique n°1 */}
        {member.allergies.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border-2 border-state-danger bg-state-danger/15 p-3"
          >
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-state-danger uppercase">
              <ShieldAlert className="size-4 shrink-0" aria-hidden />
              Allergies
            </p>
            <p className="mt-1 text-base font-bold text-state-danger">
              {member.allergies.join(' · ')}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Aucune allergie déclarée
          </p>
        )}

        {/* Drapeaux cliniques */}
        {flags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {flags.map((f) => (
              <Badge key={f.id} variant="outline" className={cn('gap-1.5', f.className)}>
                <f.icon className="size-3.5" aria-hidden />
                {f.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Traitements en cours */}
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Traitements en cours ({list.length})
          </p>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun médicament assigné.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="h-10 text-xs">Médicament</TableHead>
                    <TableHead className="text-xs">DCI · dosage</TableHead>
                    <TableHead className="text-xs">Forme</TableHead>
                    <TableHead className="text-xs">Catégorie</TableHead>
                    <TableHead className="text-right text-xs">Qté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((e) => {
                    const cat = CATEGORY_META[e.category]
                    const isControled = e.category === 'controle'
                    return (
                      <TableRow
                        key={e.uid}
                        className={cn(isControled && 'bg-state-danger/10')}
                      >
                        <TableCell className="py-2.5 align-top text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            {isControled ? (
                              <ShieldAlert
                                className="size-3.5 shrink-0 text-state-danger"
                                aria-label="Liste contrôlée"
                              />
                            ) : null}
                            {e.brand}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {e.status !== 'ACTIF' && e.status !== 'MANUEL' ? (
                              <StatusBadge status={e.status} />
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 align-top text-xs text-muted-foreground">
                          {e.dci || '—'}
                          {e.dosage ? ` · ${e.dosage}` : ''}
                        </TableCell>
                        <TableCell className="py-2.5 align-top text-xs text-muted-foreground">
                          {e.form || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 align-top text-xs">
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-[10px]', cat.badgeClass)}
                          >
                            {e.category === 'chronique' ? (
                              <Repeat className="size-3" aria-hidden />
                            ) : null}
                            {cat.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right align-top text-xs font-semibold tabular-nums text-foreground">
                          {e.quantity}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet Urgence                                                      */
/* ------------------------------------------------------------------ */

export function EmergencyTab({ members, entries }: EmergencyTabProps) {
  const [selected, setSelected] = useState<string>(FOYER_KEY)

  const selectedMember = useMemo(
    () => (selected === FOYER_KEY ? null : (members.find((m) => m.id === selected) ?? null)),
    [members, selected]
  )

  const totalBoxes = useMemo(
    () => entries.reduce((acc, e) => acc + e.quantity, 0),
    [entries]
  )

  async function handleShare() {
    const text = buildShareText(members, entries, selected)
    const title =
      selectedMember != null
        ? `Fiche d’urgence — ${selectedMember.name}`
        : 'Fiche d’urgence — foyer DzPharm'
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text })
        return
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ''
        // Annulation volontaire par l'utilisateur : on reste silencieux.
        if (name === 'AbortError' || name === 'NotAllowedError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Fiche copiée',
        description: 'Le texte de la fiche a été copié dans le presse-papiers.',
      })
    } catch {
      toast({
        title: 'Partage impossible',
        description: 'Copiez manuellement la fiche ou utilisez l’impression.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5">
      {/* Appels d'urgence — un seul geste */}
      <section aria-label="Numéros d’urgence" className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:14"
            className="flex h-16 items-center justify-center gap-2.5 rounded-xl bg-state-danger text-xl font-bold text-white shadow-lg shadow-state-danger/20 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Appeler le SAMU 14"
          >
            <Phone className="size-6" aria-hidden />
            SAMU 14
          </a>
          <a
            href="tel:021713042"
            className="flex h-16 items-center justify-center gap-2 rounded-xl border-2 border-state-danger bg-card text-base font-bold text-state-danger transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Appeler le Centre Anti-Poison d’Alger au 021 71 30 42"
          >
            <Ambulance className="size-5 shrink-0" aria-hidden />
            <span className="leading-tight">
              Anti-Poison
              <span className="block text-xs font-semibold tracking-wide">
                021 71 30 42 (Alger)
              </span>
            </span>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          En cas d&apos;intoxication ou d&apos;urgence vitale.
        </p>
      </section>

      {/* Intro + sélecteur */}
      <section aria-labelledby="urgence-select-title" className="space-y-3">
        <p id="urgence-select-title" className="text-sm text-muted-foreground">
          Fiche d&apos;urgence — lisible en moins de 10 secondes. Sélectionnez la personne
          concernée :
        </p>
        <div role="group" aria-label="Sélection de la personne concernée" className="flex flex-wrap gap-2">
          {members.map((m) => {
            const c = memberColor(m.color)
            const active = selected === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                    c.chip
                  )}
                  aria-hidden
                >
                  {initials(m.name)}
                </span>
                {m.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelected(FOYER_KEY)}
            aria-pressed={selected === FOYER_KEY}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected === FOYER_KEY
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
            )}
          >
            <Users className="size-4" aria-hidden />
            Tout le foyer
          </button>
        </div>
      </section>

      {/* Partage / impression */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleShare()} className="h-11 gap-2">
          <Share2 className="size-4" aria-hidden />
          Partager la fiche
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="h-11 gap-2">
          <Printer className="size-4" aria-hidden />
          Imprimer
        </Button>
      </div>

      {/* Contenu de la fiche */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
              aria-hidden
            >
              <Users className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ajoutez d&apos;abord des membres
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                La fiche d&apos;urgence se construit à partir des personnes du foyer
                (allergies, drapeaux cliniques, traitements). Ajoutez des membres depuis
                l&apos;onglet Réglages.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : selectedMember != null ? (
        <MemberCard member={selectedMember} entries={entries} />
      ) : (
        <Card className="print:border-foreground print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden />
              Tout le foyer
              <Badge variant="outline" className="tabular-nums">
                {members.length} personne{members.length > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                {totalBoxes} boîte{totalBoxes > 1 ? 's' : ''} au total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => {
              const list = memberEntries(entries, m.id)
              return (
                <div key={m.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground uppercase">{m.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {list.length} médicament{list.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-xs font-semibold',
                      m.allergies.length > 0 ? 'text-state-danger' : 'text-muted-foreground'
                    )}
                  >
                    {m.allergies.length > 0
                      ? `Allergies : ${m.allergies.join(' · ')}`
                      : 'Aucune allergie déclarée'}
                  </p>
                  {list.length > 0 ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {list.map((e) => e.brand).join(' · ')}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Aucun médicament assigné
                    </p>
                  )}
                </div>
              )
            })}
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun médicament dans l&apos;armoire — la fiche ne liste que les personnes.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Pied de fiche */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Carte d&apos;aide — ne remplace pas une prise en charge médicale. Données déclaratives
        locales.
      </p>
    </div>
  )
}
