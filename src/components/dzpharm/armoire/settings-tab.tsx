'use client'

/**
 * Armoire — Onglet « Réglages » (plans 3.4.6, 3.6 et audit 4.1).
 *
 * Gestion des membres du foyer, rappels d'expiration configurables (7/30/90 j),
 * checklist trousse de secours, confidentialité (stockage local, consentement,
 * verrou PIN, export JSON, effacement) et sources des données.
 *
 * Aucune donnée clinique — uniquement de l'organisation domestique et des
 * réglages de confidentialité.
 */

import { useState, useSyncExternalStore } from 'react'
import {
  Activity,
  Baby,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  CloudOff,
  Download,
  HardDrive,
  Info,
  Lock,
  Milk,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_REMINDERS, FIRST_AID_ITEMS, FIRST_AID_KEY, RELATION_META, REMINDERS_KEY, memberColor } from './constants'
import { ageLabel, initials } from './utils'
import type { ArmoireEntry, ArmoireJournalEntry, ArmoireMember, ExpiryReminders } from './types'

export interface SettingsTabProps {
  consentAt: string | null
  pinEnabled: boolean
  onEnablePin: (pin: string) => void
  onDisablePin: () => void
  onExport: () => void
  onWipe: () => void
  members: ArmoireMember[]
  entries: ArmoireEntry[]
  journal: ArmoireJournalEntry[]
  onAddMember: () => void
  onEditMember: (m: ArmoireMember) => void
  onDeleteMember: (m: ArmoireMember) => void
  onRemindersChange: (r: ExpiryReminders) => void
}

/* ------------------------------------------------------------------ */
/* Petit store localStorage abonné (hydratation sans effet de montage) */
/* ------------------------------------------------------------------ */

interface LocalStore<T> {
  subscribe: (cb: () => void) => () => void
  getSnapshot: () => T
  getServerSnapshot: () => T
  write: (next: T) => void
}

function createLocalStore<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T
): LocalStore<T> {
  let cached: T = fallback
  let hasCache = false
  const listeners = new Set<() => void>()

  function read(): T {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return fallback
      return parse(raw)
    } catch {
      return fallback
    }
  }

  function invalidate() {
    hasCache = false
  }

  return {
    subscribe(cb: () => void) {
      const onChange = () => {
        invalidate()
        cb()
      }
      listeners.add(onChange)
      window.addEventListener('storage', onChange)
      return () => {
        listeners.delete(onChange)
        window.removeEventListener('storage', onChange)
      }
    },
    getSnapshot(): T {
      if (!hasCache) {
        cached = read()
        hasCache = true
      }
      return cached
    },
    getServerSnapshot: () => fallback,
    write(next: T) {
      cached = next
      hasCache = true
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* stockage indisponible */
      }
      listeners.forEach((l) => l())
    },
  }
}

const remindersStore = createLocalStore<ExpiryReminders>(
  REMINDERS_KEY,
  DEFAULT_REMINDERS,
  (raw) => {
    try {
      return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ExpiryReminders>) }
    } catch {
      return { ...DEFAULT_REMINDERS }
    }
  }
)

const firstAidStore = createLocalStore<string[]>(FIRST_AID_KEY, [], (raw) => {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : []
  } catch {
    return []
  }
})

/* ------------------------------------------------------------------ */
/* Onglet Réglages                                                     */
/* ------------------------------------------------------------------ */

export function SettingsTab(props: SettingsTabProps) {
  const {
    consentAt,
    pinEnabled,
    onEnablePin,
    onDisablePin,
    onExport,
    onWipe,
    members,
    entries,
    journal,
    onAddMember,
    onEditMember,
    onDeleteMember,
    onRemindersChange,
  } = props

  /* ------------- Rappels d'expiration (7/30/90 j) ------------------ */
  const reminders = useSyncExternalStore(
    remindersStore.subscribe,
    remindersStore.getSnapshot,
    remindersStore.getServerSnapshot
  )

  function toggleReminder(key: keyof ExpiryReminders, value: boolean) {
    const next = { ...reminders, [key]: value }
    remindersStore.write(next)
    onRemindersChange(next)
  }

  /* ------------- Trousse de secours (audit 4.1) -------------------- */
  const firstAid = useSyncExternalStore(
    firstAidStore.subscribe,
    firstAidStore.getSnapshot,
    firstAidStore.getServerSnapshot
  )

  function toggleFirstAid(id: string, checked: boolean) {
    const next = checked
      ? [...firstAid, id]
      : firstAid.filter((x) => x !== id)
    firstAidStore.write(next)
  }

  const firstAidCount = FIRST_AID_ITEMS.filter((i) => firstAid.includes(i.id)).length

  /* ------------- PIN (verrou de confort local) --------------------- */
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  function submitPin() {
    if (/^\d{4}$/.test(pin)) {
      onEnablePin(pin)
      setPin('')
      setPinError(false)
    } else {
      setPinError(true)
    }
  }

  const consentLabel = consentAt
    ? `Consentement enregistré le ${new Date(consentAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`
    : 'Consentement non enregistré'

  return (
    <div className="space-y-5">
      {/* ---------------- Membres du foyer ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" aria-hidden />
            Membres du foyer
            <Badge variant="outline" className="tabular-nums">
              {members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-sm font-medium text-foreground">Aucun membre enregistré</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez les personnes du foyer pour attribuer les médicaments, suivre les
                allergies et activer les contrôles grossesse et posologies enfant.
              </p>
              <Button onClick={onAddMember} className="mt-3 h-11 gap-2">
                <UserPlus className="size-4" aria-hidden />
                Ajouter un membre
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {members.map((m) => {
                  const c = memberColor(m.color)
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <span
                        role="img"
                        aria-label={m.name}
                        className={cn(
                          'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          c.chip
                        )}
                      >
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {m.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {RELATION_META[m.relation].label} · {ageLabel(m.ageYears)}
                          {m.weightKg != null ? ` · ${m.weightKg} kg` : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {m.pregnant ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-primary/30 bg-primary/5 text-primary"
                            >
                              <Baby className="size-3" aria-hidden />
                              Grossesse
                            </Badge>
                          ) : null}
                          {m.breastfeeding ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-primary/30 bg-primary/5 text-primary"
                            >
                              <Milk className="size-3" aria-hidden />
                              Allaitement
                            </Badge>
                          ) : null}
                          {m.renal ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-state-warning/40 bg-state-warning/10 text-state-warning"
                            >
                              <Activity className="size-3" aria-hidden />
                              Rénal
                            </Badge>
                          ) : null}
                          {m.allergies.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-state-danger/40 bg-state-danger/10 text-state-danger"
                            >
                              <ShieldAlert className="size-3" aria-hidden />
                              {m.allergies.length} allergie{m.allergies.length > 1 ? 's' : ''}
                            </Badge>
                          ) : null}
                          {m.restricted ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-border bg-muted/60 text-muted-foreground"
                            >
                              <Lock className="size-3" aria-hidden />
                              Accès restreint
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditMember(m)}
                          aria-label={`Modifier ${m.name}`}
                          className="size-11"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteMember(m)}
                          aria-label={`Supprimer ${m.name}`}
                          className="size-11 text-state-danger hover:text-state-danger"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Button variant="outline" onClick={onAddMember} className="h-11 w-full gap-2">
                <UserPlus className="size-4" aria-hidden />
                Ajouter un membre
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Rappels d'expiration ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-primary" aria-hidden />
            Rappels d&apos;expiration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(
            [
              { key: 'd7', label: 'Alerte à 7 jours' },
              { key: 'd30', label: 'Alerte à 30 jours' },
              { key: 'd90', label: 'Alerte à 90 jours' },
            ] as { key: keyof ExpiryReminders; label: string }[]
          ).map(({ key, label }) => (
            <div
              key={key}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1.5"
            >
              <Label htmlFor={`reminder-${key}`} className="cursor-pointer text-sm">
                {label}
              </Label>
              <Switch
                id={`reminder-${key}`}
                checked={reminders[key]}
                onCheckedChange={(v) => toggleReminder(key, v)}
                aria-label={label}
              />
            </div>
          ))}
          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            Les rappels s&apos;affichent dans l&apos;inventaire — aucune notification push
            n&apos;est envoyée (PWA hors ligne).
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Trousse de secours ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="size-4 text-primary" aria-hidden />
            Trousse de secours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Équipement déclaré</span>
              <span className="font-semibold tabular-nums text-foreground">
                {firstAidCount}/{FIRST_AID_ITEMS.length}
              </span>
            </div>
            <Progress
              value={(firstAidCount / FIRST_AID_ITEMS.length) * 100}
              aria-label={`${firstAidCount} éléments sur ${FIRST_AID_ITEMS.length} cochés`}
            />
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {FIRST_AID_ITEMS.map((item) => (
              <li key={item.id}>
                <Label
                  htmlFor={`firstaid-${item.id}`}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-muted/50"
                >
                  <Checkbox
                    id={`firstaid-${item.id}`}
                    checked={firstAid.includes(item.id)}
                    onCheckedChange={(v) => toggleFirstAid(item.id, v === true)}
                  />
                  {item.label}
                </Label>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Liste indicative à adapter — suivez les recommandations officielles (Ministère de
            la Santé). DzPharm ne vend ni ne recommande de marques.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Confidentialité & données ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4 text-primary" aria-hidden />
            Confidentialité & données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Faits */}
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <HardDrive className="mt-0.5 size-4 shrink-0 text-state-safe" aria-hidden />
              <span className="text-foreground/90">Stockage 100 % local (localStorage)</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CloudOff className="mt-0.5 size-4 shrink-0 text-state-safe" aria-hidden />
              <span className="text-foreground/90">
                Aucune donnée nominative envoyée en ligne — seuls les noms de médicaments
                transitent lors de l&apos;analyse
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-state-safe" aria-hidden />
              <span className="text-foreground/90">
                Aucune donnée de santé utilisée à des fins d&apos;analyse ou de publicité
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-foreground/90">{consentLabel}</span>
            </li>
          </ul>

          {/* Résumé des données locales */}
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Données enregistrées sur cet appareil : {members.length} membre
            {members.length > 1 ? 's' : ''} · {entries.length} médicament
            {entries.length > 1 ? 's' : ''} · {journal.length} contrôle
            {journal.length > 1 ? 's' : ''} journalisé{journal.length > 1 ? 's' : ''}.
          </p>

          {/* Verrou PIN */}
          {pinEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2.5">
                <Lock className="size-4 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">Verrou PIN actif</p>
                  <p className="text-xs text-muted-foreground">
                    Demandé à chaque ouverture de l&apos;armoire.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={onDisablePin} className="h-11">
                Désactiver
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">Verrou PIN</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    setPinError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitPin()
                  }}
                  placeholder="••••"
                  aria-label="Code PIN à 4 chiffres"
                  className="h-11 w-28 text-center text-lg tracking-[0.4em]"
                />
                <Button onClick={submitPin} className="h-11">
                  Activer le verrou
                </Button>
              </div>
              {pinError ? (
                <p role="alert" className="text-xs text-state-danger">
                  Le code doit comporter exactement 4 chiffres.
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Verrou de confort local — ne remplace pas une sécurité forte. Recommandé sur
                appareil partagé.
              </p>
            </div>
          )}

          {/* Droits : export / effacement */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onExport} className="h-11 gap-2">
              <Download className="size-4" aria-hidden />
              Exporter mes données (JSON)
            </Button>
            <Button variant="destructive" onClick={onWipe} className="h-11 gap-2">
              <Trash2 className="size-4" aria-hidden />
              Tout effacer
            </Button>
          </div>

          {/* Cadre juridique */}
          <p className="flex items-start gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 p-3 text-xs leading-relaxed text-state-warning">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Loi 18-07 (modifiée 25-11) : les données de santé sont sensibles ; révision
            juridique recommandée avant tout usage professionnel.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Sources des données ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-primary" aria-hidden />
            Sources des données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            Répertoire officiel algérien (9 555 AMM — nomenclature, dernière vérification
            Juin 2026) ; moteur d&apos;interactions local v2 ; base grossesse/allaitement
            (CRAT + livres techniques) ; posologies pédiatriques pondérées (référentiels
            usuels adaptés aux spécialités locales). Outil d&apos;aide — ne remplace pas
            l&apos;avis d&apos;un professionnel de santé.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
