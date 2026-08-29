'use client'

import { useMemo, useState } from 'react'
import {
  Clock,
  MapPin,
  MoonStar,
  Phone,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SafetyNote } from './safety-note'
import {
  PHARMACY_DIRECTORY,
  PHARMACY_WILAYAS,
  type GardeType,
  type PharmacyEntry,
} from '@/lib/pharmacies-data'

/* ------------------------------------------------------------------ */
/* Métadonnées des types de garde                                      */
/* ------------------------------------------------------------------ */

type GardeFilter = 'toutes' | GardeType

const GARDE_META: Record<GardeType, { label: string; icon: typeof Clock; badge: string }> = {
  '24h': {
    label: '24h/24',
    icon: Clock,
    badge: 'border-state-safe/30 bg-state-safe/10 text-state-safe',
  },
  nuit: {
    label: 'Garde de nuit',
    icon: MoonStar,
    badge: 'border-primary/30 bg-primary/10 text-primary',
  },
  jour: {
    label: 'Garde de jour',
    icon: Sun,
    badge: 'border-chifa/30 bg-chifa/10 text-chifa',
  },
  rotation: {
    label: 'Rotation',
    icon: RefreshCw,
    badge: 'border-state-warning/30 bg-state-warning/10 text-state-warning',
  },
}

const GARDE_FILTERS: Array<{ value: GardeFilter; label: string }> = [
  { value: 'toutes', label: 'Toutes' },
  { value: '24h', label: '24h/24' },
  { value: 'nuit', label: 'Nuit' },
  { value: 'jour', label: 'Jour' },
  { value: 'rotation', label: 'Rotation' },
]

function normalizeFr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/* ------------------------------------------------------------------ */
/* Carte pharmacie                                                     */
/* ------------------------------------------------------------------ */

function PharmacyCard({ pharmacy }: { pharmacy: PharmacyEntry }) {
  const meta = GARDE_META[pharmacy.garde]
  const telHref = `tel:${pharmacy.phone.replace(/\s/g, '')}`
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm leading-snug font-bold text-foreground">{pharmacy.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {pharmacy.address}
                <span className="block font-medium text-foreground/70">
                  {pharmacy.commune} · {pharmacy.wilaya}
                </span>
              </span>
            </p>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
              meta.badge
            )}
          >
            <meta.icon className="size-3" aria-hidden />
            {meta.label}
          </span>
        </div>

        {pharmacy.hours ? (
          <p className="text-xs text-muted-foreground">{pharmacy.hours}</p>
        ) : (
          <p className="text-xs text-muted-foreground/80 italic">
            Planning selon l&apos;ordre des pharmaciens de la wilaya
          </p>
        )}

        <Button
          asChild
          size="sm"
          variant="outline"
          className="mt-auto h-9 w-full border-state-safe/30 bg-state-safe/10 text-sm font-semibold text-state-safe transition-colors hover:bg-state-safe/20 hover:text-state-safe"
        >
          <a href={telHref} aria-label={`Appeler la ${pharmacy.name} au ${pharmacy.phone}`}>
            <Phone className="size-4" aria-hidden />
            {pharmacy.phone}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Annuaire des pharmacies de garde                                    */
/* ------------------------------------------------------------------ */

export function PharmacyLocator() {
  const [query, setQuery] = useState('')
  const [wilaya, setWilaya] = useState('toutes')
  const [garde, setGarde] = useState<GardeFilter>('toutes')

  const filtered = useMemo(() => {
    const q = normalizeFr(query)
    return PHARMACY_DIRECTORY.filter((p) => {
      if (wilaya !== 'toutes' && p.wilaya !== wilaya) return false
      if (garde !== 'toutes' && p.garde !== garde) return false
      if (!q) return true
      const haystack = normalizeFr(`${p.name} ${p.commune} ${p.wilaya} ${p.address}`)
      return q.split(/\s+/).every((word) => haystack.includes(word))
    })
  }, [query, wilaya, garde])

  return (
    <div className="space-y-6">
      {/* En-tête + bannière honnêteté */}
      <Card className="border-state-warning/30 bg-gradient-to-br from-state-warning/10 via-state-warning/5 to-transparent">
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
            <span
              className="flex size-9 items-center justify-center rounded-xl bg-state-warning/15"
              aria-hidden
            >
              <MapPin className="size-5 text-state-warning" />
            </span>
            Pharmacies de garde — wilayas couvertes
          </CardTitle>
          <CardDescription className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Annuaire indicatif de {PHARMACY_DIRECTORY.length} pharmacies réparties sur{' '}
            {PHARMACY_WILAYAS.length} wilayas. En cas d&apos;urgence immédiate, appelez le SAMU (14)
            avant tout déplacement.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <p
            role="note"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
          >
            <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              <strong>Annuaire indicatif</strong> — vérifiez par téléphone avant de vous déplacer.
              Les gardes officielles sont publiées chaque semaine par les ordres des pharmaciens de
              wilaya ; ce répertoire n&apos;en est pas le reflet officiel.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="pharmacy-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Rechercher (nom, commune)
              </Label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 transition-colors focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/20">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  id="pharmacy-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex : El Djazaïri, Bab El Oued…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  aria-label="Rechercher une pharmacie par nom ou commune"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pharmacy-wilaya" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Wilaya
              </Label>
              <Select value={wilaya} onValueChange={setWilaya}>
                <SelectTrigger
                  id="pharmacy-wilaya"
                  className="h-11 w-full text-sm"
                  aria-label="Filtrer par wilaya"
                >
                  <SelectValue placeholder="Toutes les wilayas couvertes" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="toutes">
                    Toutes les wilayas couvertes ({PHARMACY_DIRECTORY.length})
                  </SelectItem>
                  {PHARMACY_WILAYAS.map((w) => (
                    <SelectItem key={w.wilaya} value={w.wilaya}>
                      {w.wilaya} ({w.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground" id="garde-filter-label">
              Type de garde
            </p>
            <div
              role="group"
              aria-labelledby="garde-filter-label"
              className="flex flex-wrap gap-2"
            >
              {GARDE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={garde === f.value}
                  onClick={() => setGarde(f.value)}
                  className={cn(
                    'h-9 rounded-full border px-4 text-sm font-medium transition-colors',
                    garde === f.value
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compteur de résultats */}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
        pharmacie{filtered.length !== 1 ? 's' : ''} correspondant à vos critères
      </p>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <MapPin className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Aucune pharmacie trouvée</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Essayez d&apos;élargir vos critères : autre type de garde, « toutes wilayas », ou une
            recherche plus courte. Les wilayas non couvertes par cet annuaire indicatif publient
            leurs gardes via l&apos;ordre local des pharmaciens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PharmacyCard key={p.id} pharmacy={p} />
          ))}
        </div>
      )}

      <SafetyNote>
        Annuaire indicatif — les horaires et numéros peuvent évoluer. Les gardes officielles sont
        publiées par les ordres des pharmaciens de wilaya : vérifiez toujours par téléphone. En cas
        d&apos;urgence : SAMU 14 · Protection Civile 102.
      </SafetyNote>
    </div>
  )
}
