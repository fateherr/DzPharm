'use client'

import { useMemo, useState } from 'react'
import {
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  MoonStar,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Sun,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { SafetyNote } from './safety-note'
import {
  PHARMACY_DIRECTORY,
  PHARMACY_WILAYAS,
  isPharmacyOpen,
  calculateDistanceKm,
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

function PharmacyCard({
  pharmacy,
  userCoords,
}: {
  pharmacy: PharmacyEntry
  userCoords?: { lat: number; lng: number } | null
}) {
  const meta = GARDE_META[pharmacy.garde]
  const telHref = `tel:${pharmacy.phone.replace(/\s/g, '')}`
  const isOpen = isPharmacyOpen(pharmacy)
  const distance =
    userCoords && pharmacy.lat && pharmacy.lng
      ? calculateDistanceKm(userCoords.lat, userCoords.lng, pharmacy.lat, pharmacy.lng)
      : null

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 border-muted-foreground/30">
                {pharmacy.wilayaCode}
              </Badge>
              <h3 className="text-sm leading-snug font-bold text-foreground">{pharmacy.name}</h3>
            </div>
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

        {/* Statuts en temps réel et distance */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border',
              isOpen
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-muted bg-muted/30 text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              )}
            />
            {isOpen ? 'Ouvert maintenant' : 'Fermé actuellement'}
          </span>

          {distance !== null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Navigation className="size-3 shrink-0" aria-hidden />
              {distance} km
            </span>
          )}
        </div>

        {pharmacy.hours ? (
          <p className="text-xs text-muted-foreground">{pharmacy.hours}</p>
        ) : (
          <p className="text-xs text-muted-foreground/80 italic">
            Planning selon l&apos;ordre des pharmaciens de la wilaya
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 w-full border-state-safe/30 bg-state-safe/10 text-xs font-semibold text-state-safe transition-colors hover:bg-state-safe/20 hover:text-state-safe"
          >
            <a href={telHref} aria-label={`Appeler la ${pharmacy.name} au ${pharmacy.phone}`}>
              <Phone className="size-3.5 mr-1" aria-hidden />
              Appeler
            </a>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 w-full border-primary/30 bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Itinéraire Google Maps vers la ${pharmacy.name}`}
            >
              <Navigation className="size-3.5 mr-1" aria-hidden />
              Itinéraire
            </a>
          </Button>
        </div>
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
  const [openOnly, setOpenOnly] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [sortByProximity, setSortByProximity] = useState(false)

  const handleGeolocate = () => {
    if (!('geolocation' in navigator)) {
      toast.error('La géolocalisation n’est pas supportée par votre navigateur.')
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setSortByProximity(true)
        setGeoLoading(false)
        toast.success('Position GPS acquise — pharmacies triées par proximité.')
      },
      (err) => {
        setGeoLoading(false)
        toast.error('Impossible d’obtenir votre position GPS : ' + err.message)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const filtered = useMemo(() => {
    const q = normalizeFr(query)
    const list = PHARMACY_DIRECTORY.filter((p) => {
      if (wilaya !== 'toutes' && p.wilaya !== wilaya) return false
      if (garde !== 'toutes' && p.garde !== garde) return false
      if (openOnly && !isPharmacyOpen(p)) return false
      if (!q) return true
      const haystack = normalizeFr(`${p.name} ${p.commune} ${p.wilaya} ${p.wilayaCode} ${p.address}`)
      return q.split(/\s+/).every((word) => haystack.includes(word))
    })

    if (sortByProximity && userCoords) {
      return [...list].sort((a, b) => {
        const distA = calculateDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng)
        const distB = calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)
        return distA - distB
      })
    }

    return list
  }, [query, wilaya, garde, openOnly, sortByProximity, userCoords])

  return (
    <div className="space-y-6">
      {/* En-tête + bannière honnêteté */}
      <Card className="border-state-warning/30 bg-gradient-to-br from-state-warning/10 via-state-warning/5 to-transparent">
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
                <span
                  className="flex size-9 items-center justify-center rounded-xl bg-state-warning/15"
                  aria-hidden
                >
                  <MapPin className="size-5 text-state-warning" />
                </span>
                Pharmacies de garde — Réseau 58 Wilayas (W6-01)
              </CardTitle>
              <CardDescription className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Réseau complet des {PHARMACY_DIRECTORY.length} officines de garde couvrant l’intégralité
                des 58 wilayas d&apos;Algérie avec calcul de distance GPS et vérification d’ouverture en direct.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant={userCoords ? 'default' : 'outline'}
              size="sm"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="shrink-0 h-10 gap-2 font-semibold"
            >
              {geoLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Compass className="size-4 text-emerald-500" aria-hidden />
              )}
              {userCoords ? 'GPS Actif (Autour de moi)' : 'Autour de moi (GPS)'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <p
            role="note"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
          >
            <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              <strong>Répertoire d’urgence</strong> — Vérifiez toujours par téléphone avant de vous déplacer.
              Les gardes officielles sont validées par les Sections Ordinales Régionales (SORP) et les DSP de wilaya.
              En cas d&apos;urgence vitale : <strong>SAMU 14</strong> ou <strong>Protection Civile 102</strong>.
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
                Rechercher (nom, commune, wilaya)
              </Label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 transition-colors focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/20">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  id="pharmacy-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex : Didouche Mourad, Constantine, 16…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  aria-label="Rechercher une pharmacie par nom, commune ou code wilaya"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pharmacy-wilaya" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Wilaya (58 Wilayas)
              </Label>
              <Select value={wilaya} onValueChange={setWilaya}>
                <SelectTrigger
                  id="pharmacy-wilaya"
                  className="h-11 w-full text-sm"
                  aria-label="Filtrer par wilaya"
                >
                  <SelectValue placeholder="Toutes les wilayas (58/58)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="toutes">
                    Toutes les 58 wilayas ({PHARMACY_DIRECTORY.length} officines)
                  </SelectItem>
                  {PHARMACY_WILAYAS.map((w) => (
                    <SelectItem key={w.wilayaCode} value={w.wilaya}>
                      {w.wilayaCode} - {w.wilaya} ({w.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
                      'h-9 rounded-full border px-4 text-sm font-medium transition-colors cursor-pointer',
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

            {/* Filtre Ouvert maintenant */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenOnly((prev) => !prev)}
                className={cn(
                  'h-9 rounded-full border px-4 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer',
                  openOnly
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    openOnly ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                  )}
                />
                Ouvert maintenant
              </button>

              {userCoords && (
                <button
                  type="button"
                  onClick={() => setSortByProximity((prev) => !prev)}
                  className={cn(
                    'h-9 rounded-full border px-3 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                    sortByProximity
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  )}
                >
                  <Navigation className="size-3" />
                  Tri par distance
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compteur de résultats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground" role="status" aria-live="polite">
        <p>
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
          pharmacie{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          {openOnly ? ' (ouvertes en ce moment)' : ''}
        </p>

        {userCoords && sortByProximity && (
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <Compass className="size-3.5" />
            Classées de la plus proche à la plus éloignée
          </p>
        )}
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <MapPin className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Aucune pharmacie trouvée</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Essayez d&apos;élargir vos critères ou de désactiver le filtre « Ouvert maintenant ».
            Le réseau couvre l’ensemble des 58 wilayas du pays.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PharmacyCard key={p.id} pharmacy={p} userCoords={userCoords} />
          ))}
        </div>
      )}

      <SafetyNote>
        Annuaire indicatif des 58 wilayas d&apos;Algérie — les horaires et numéros de téléphone sont vérifiés
        régulièrement. Pour toute urgence chirurgicale ou intoxications : appelez le 14 (SAMU) ou le Centre
        Antipoison au 021 97 98 98.
      </SafetyNote>
    </div>
  )
}
