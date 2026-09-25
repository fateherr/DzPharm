'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Bug,
  Check,
  Clock,
  Copy,
  Droplet,
  Flame,
  Heart,
  Moon,
  Pill,
  ShieldAlert,
  Sunrise,
  Sunset,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

/* ------------------------------------------------------------------ */
/* Données : villes algériennes (horaires indicatifs Ramadan)           */
/* ------------------------------------------------------------------ */

interface CityTimes {
  city: string
  iftar: string
  suhoor: string
}

/** Horaires indicatifs astronomiques (Ramadan, 58 wilayas d'Algérie) — W3-02 */
const CITIES: CityTimes[] = [
  { city: '01 · Adrar', iftar: '19:18', suhoor: '04:42' },
  { city: '02 · Chlef', iftar: '19:21', suhoor: '04:51' },
  { city: '03 · Laghouat', iftar: '19:12', suhoor: '04:42' },
  { city: '04 · Oum El Bouaghi', iftar: '19:03', suhoor: '04:33' },
  { city: '05 · Batna', iftar: '19:05', suhoor: '04:35' },
  { city: '06 · Béjaïa', iftar: '19:10', suhoor: '04:40' },
  { city: '07 · Biskra', iftar: '19:04', suhoor: '04:34' },
  { city: '08 · Béchar', iftar: '19:35', suhoor: '05:05' },
  { city: '09 · Blida', iftar: '19:16', suhoor: '04:46' },
  { city: '10 · Bouira', iftar: '19:13', suhoor: '04:43' },
  { city: '11 · Tamanrasset', iftar: '18:50', suhoor: '04:25' },
  { city: '12 · Tébessa', iftar: '18:58', suhoor: '04:28' },
  { city: '13 · Tlemcen', iftar: '19:30', suhoor: '05:00' },
  { city: '14 · Tiaret', iftar: '19:22', suhoor: '04:52' },
  { city: '15 · Tizi Ouzou', iftar: '19:12', suhoor: '04:42' },
  { city: '16 · Alger', iftar: '19:15', suhoor: '04:45' },
  { city: '17 · Djelfa', iftar: '19:14', suhoor: '04:44' },
  { city: '18 · Jijel', iftar: '19:07', suhoor: '04:37' },
  { city: '19 · Sétif', iftar: '19:05', suhoor: '04:35' },
  { city: '20 · Saïda', iftar: '19:26', suhoor: '04:56' },
  { city: '21 · Skikda', iftar: '19:03', suhoor: '04:33' },
  { city: '22 · Sidi Bel Abbès', iftar: '19:28', suhoor: '04:58' },
  { city: '23 · Annaba', iftar: '19:00', suhoor: '04:30' },
  { city: '24 · Guelma', iftar: '19:01', suhoor: '04:31' },
  { city: '25 · Constantine', iftar: '19:05', suhoor: '04:35' },
  { city: '26 · Médéa', iftar: '19:16', suhoor: '04:46' },
  { city: '27 · Mostaganem', iftar: '19:24', suhoor: '04:54' },
  { city: "28 · M'Sila", iftar: '19:09', suhoor: '04:39' },
  { city: '29 · Mascara', iftar: '19:25', suhoor: '04:55' },
  { city: '30 · Ouargla', iftar: '18:55', suhoor: '04:25' },
  { city: '31 · Oran', iftar: '19:25', suhoor: '04:55' },
  { city: '32 · El Bayadh', iftar: '19:24', suhoor: '04:54' },
  { city: '33 · Illizi', iftar: '18:42', suhoor: '04:12' },
  { city: '34 · Bordj Bou Arréridj', iftar: '19:07', suhoor: '04:37' },
  { city: '35 · Boumerdès', iftar: '19:14', suhoor: '04:44' },
  { city: '36 · El Tarf', iftar: '18:58', suhoor: '04:28' },
  { city: '37 · Tindouf', iftar: '19:48', suhoor: '05:22' },
  { city: '38 · Tissemsilt', iftar: '19:20', suhoor: '04:50' },
  { city: '39 · El Oued', iftar: '18:56', suhoor: '04:26' },
  { city: '40 · Khenchela', iftar: '19:02', suhoor: '04:32' },
  { city: '41 · Souk Ahras', iftar: '18:59', suhoor: '04:29' },
  { city: '42 · Tipaza', iftar: '19:17', suhoor: '04:47' },
  { city: '43 · Mila', iftar: '19:06', suhoor: '04:36' },
  { city: '44 · Aïn Defla', iftar: '19:19', suhoor: '04:49' },
  { city: '45 · Naâma', iftar: '19:32', suhoor: '05:02' },
  { city: '46 · Aïn Témouchent', iftar: '19:27', suhoor: '04:57' },
  { city: '47 · Ghardaïa', iftar: '19:00', suhoor: '04:25' },
  { city: '48 · Relizane', iftar: '19:23', suhoor: '04:53' },
  { city: '49 · Timimoun', iftar: '19:19', suhoor: '04:45' },
  { city: '50 · Bordj Badji Mokhtar', iftar: '19:05', suhoor: '04:38' },
  { city: '51 · Ouled Djellal', iftar: '19:06', suhoor: '04:36' },
  { city: '52 · Béni Abbès', iftar: '19:38', suhoor: '05:10' },
  { city: '53 · In Salah', iftar: '19:02', suhoor: '04:32' },
  { city: '54 · In Guezzam', iftar: '18:45', suhoor: '04:20' },
  { city: '55 · Touggourt', iftar: '18:57', suhoor: '04:27' },
  { city: '56 · Djanet', iftar: '18:38', suhoor: '04:10' },
  { city: "57 · El M'Ghair", iftar: '18:59', suhoor: '04:29' },
  { city: '58 · El Meniaa', iftar: '19:08', suhoor: '04:38' },
]

/* ------------------------------------------------------------------ */
/* Guidance par classe médicamenteuse                                   */
/* ------------------------------------------------------------------ */

type RiskLevel = 'ELEVE' | 'MODERE' | 'FAIBLE'

interface ClassGuidance {
  key: string
  label: string
  icon: LucideIcon
  risk: RiskLevel
  summary: string
  points: string[]
}

const GUIDANCE: ClassGuidance[] = [
  {
    key: 'antidiabetiques',
    label: 'Antidiabétiques',
    icon: Droplet,
    risk: 'ELEVE',
    summary:
      'Risque majeur d\u2019hypoglycémie pendant le jeûne — adaptation souvent nécessaire.',
    points: [
      'Metformine : généralement maintenue, prises à l\u2019Iftar et/ou au Suhoor.',
      'Sulfamides hypoglycémiants (gliclazide…) et insuline : réévaluation médicale indispensable avant le jeûne — risque d\u2019hypoglycémie diurne.',
      'Rompre le jeûne si glycémie < 0,70 g/L ou > 2,50 g/L ; multiplier les contrôles (Sutura/Gluco).',
    ],
  },
  {
    key: 'antihypertenseurs',
    label: 'Antihypertenseurs',
    icon: Heart,
    risk: 'MODERE',
    summary: 'Maintien du traitement avec bascule des prises vers Iftar / Suhoor.',
    points: [
      'Dose unique matinale → déplacer au Suhoor ; 2 prises/jour → Iftar + Suhoor.',
      'IEC / ARA2 / inhibiteurs calciques : surveiller la tension en fin de jeûne (après-midi), risque d\u2019hypotension si déshydratation.',
      'Bêtabloquants : attention aux hypotensions orthostatiques à la rupture du jeûne.',
    ],
  },
  {
    key: 'diuretiques',
    label: 'Diurétiques',
    icon: Waves,
    risk: 'ELEVE',
    summary: 'Déshydratation et troubles hydro-électrolytiques pendant le jeûne.',
    points: [
      'Prise préférentiellement à l\u2019Iftar (effet nocturne, pendant la fenêtre d\u2019hydratation).',
      'Surveiller poids, œdèmes des chevilles, vertiges ; compenser les pertes hydriques la nuit.',
      'Associer diurétique + IEC : contrôle tensionnel rapproché.',
    ],
  },
  {
    key: 'antibiotiques',
    label: 'Antibiotiques',
    icon: Bug,
    risk: 'ELEVE',
    summary:
      'L\u2019espacement des prises est le point critique — l\u2019intervalle ne doit pas être arbitrairement réduit.',
    points: [
      'Privilégier avec le médecin les schémas à 1 ou 2 prises/jour (ex. amoxicilline/clavulanate 2×/j).',
      'Schéma 3×/j : Iftar, ~4 h après (vers 23 h), Suhoor — intervalle minimal à respecter selon la molécule.',
      'Ne jamais interrompre un antibiothérapie pour le jeûne : poursuivre sur la fenêtre nocturne.',
    ],
  },
  {
    key: 'anticoagulants',
    label: 'Anticoagulants & AAP',
    icon: ShieldAlert,
    risk: 'MODERE',
    summary: 'Dose unique → Suhoor ; aspirine/Plavix → à l\u2019Iftar avec le repas.',
    points: [
      'AVK (warfarine, acénocoumarol) : horaire fixe au Suhoor, INR à surveiller (alimentation modifiée pendant le Ramadan).',
      'AOD (rivaroxaban…) : respecter la prise au cours du repas → Iftar.',
      'Ne jamais doubler une prise manquée pendant le jeûne.',
    ],
  },
  {
    key: 'corticoides',
    label: 'Corticoïdes',
    icon: Flame,
    risk: 'MODERE',
    summary: 'Dose unique matinale → Suhoor pour respecter le rythme circadien.',
    points: [
      'Prednisone/prednisolone 1×/j matin : prise au Suhoor conserve l\u2019effet anti-inflammatoire et épargne l\u2019axe corticotrope.',
      'Forms à 2 prises : Iftar + Suhoor.',
      'Attention au renforcement de l\u2019hyperglycémie chez le diabétique jeûneur.',
    ],
  },
  {
    key: 'ipp',
    label: 'IPP (antiulcéreux)',
    icon: Pill,
    risk: 'FAIBLE',
    summary: 'Optimiser l\u2019effet : 30 minutes avant le repas de l\u2019Iftar.',
    points: [
      'Oméprazole, pantoprazole… : la prise doit précéder le repas — la caler ~30 min avant l\u2019Iftar.',
      'L\u2019hyperacidité post-Iftar (repas gras, copieux) justifie parfois un renforcement ponctuel — avis médical.',
    ],
  },
  {
    key: 'levothyroxine',
    label: 'Levothyroxine',
    icon: Wind,
    risk: 'FAIBLE',
    summary: 'À jeun absolu → prise au Suhoor, à distance de la nourriture.',
    points: [
      'Prise au Suhoor avec un grand verre d\u2019eau, idéalement 30 à 60 min avant le repas de l\u2019aube.',
      'Maintenir un horaire constant sur tout le mois ; TSH à vérifier après Ramadan si ajustement.',
    ],
  },
  {
    key: 'antiepileptiques',
    label: 'Antiépileptiques',
    icon: Zap,
    risk: 'ELEVE',
    summary: 'Régularité des intervalles critique — risque de crise en cas de décalage.',
    points: [
      'Répartir les prises Iftar / Suhoor en conservant l\u2019intervalle le plus régulier possible.',
      'Le jeûne (déshydratation, privation de sommeil) abaisse le seuil épileptique : vigilance renforcée.',
      'Certains patients ne doivent pas jeûner — décision médicale préalable indispensable.',
    ],
  },
]

const RISK_STYLES: Record<RiskLevel, { label: string; badge: string; border: string; icon: string }> = {
  ELEVE: {
    label: 'Risque élevé',
    badge: 'bg-state-danger/10 text-state-danger border-state-danger/30',
    border: 'hover:border-state-danger/40',
    icon: 'text-state-danger',
  },
  MODERE: {
    label: 'Risque modéré',
    badge: 'bg-state-warning/10 text-state-warning border-state-warning/30',
    border: 'hover:border-state-warning/40',
    icon: 'text-state-warning',
  },
  FAIBLE: {
    label: 'Risque faible',
    badge: 'bg-state-safe/10 text-state-safe border-state-safe/30',
    border: 'hover:border-state-safe/40',
    icon: 'text-state-safe',
  },
}

/* ------------------------------------------------------------------ */
/* Utilitaires temps                                                    */
/* ------------------------------------------------------------------ */

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function toHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.abs(m) % 60).padStart(2, '0')}`
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

interface Dose {
  min: number // minutes depuis 00:00 (peut dépasser 1440 — après minuit)
  label: string
  anchor: 'iftar' | 'suhoor' | 'middle'
}

function computeDoses(iftar: string, suhoor: string, freq: 1 | 2 | 3 | 4, singleAt: 'iftar' | 'suhoor'): Dose[] {
  const iftarMin = toMin(iftar)
  const suhoorMin = toMin(suhoor)
  // fenêtre d'alimentation : Iftar → Suhoor (lendemain)
  const start = iftarMin + 30 // après le repas de rupture
  const end = suhoorMin + 1440 // fin de la fenêtre = Suhoor

  if (freq === 1) {
    return singleAt === 'iftar'
      ? [{ min: iftarMin + 15, label: 'Prise unique — à l\u2019Iftar', anchor: 'iftar' }]
      : [{ min: end - 15, label: 'Prise unique — au Suhoor', anchor: 'suhoor' }]
  }

  const span = Math.max(60, end - start)
  const doses: Dose[] = []
  for (let i = 0; i < freq; i++) {
    const min = start + (span * i) / (freq - 1)
    const isFirst = i === 0
    const isLast = i === freq - 1
    doses.push({
      min,
      label: isFirst
        ? `Prise 1 — Iftar (${toHHMM(min)})`
        : isLast
          ? `Prise ${freq} — Suhoor (${toHHMM(min)})`
          : `Prise ${i + 1} — ${toHHMM(min)}`,
      anchor: isFirst ? 'iftar' : isLast ? 'suhoor' : 'middle',
    })
  }
  return doses
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */

const FREQ_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '1 prise / jour',
  2: '2 prises / jour',
  3: '3 prises / jour',
  4: '4 prises / jour',
}

export function RamadanAdapter() {
  const { toast } = useToast()
  const [city, setCity] = useState('16 · Alger')
  const [iftar, setIftar] = useState('19:15')
  const [suhoor, setSuhoor] = useState('04:45')
  const [freq, setFreq] = useState<1 | 2 | 3 | 4>(2)
  const [singleAt, setSingleAt] = useState<'iftar' | 'suhoor'>('suhoor')
  const [copied, setCopied] = useState(false)

  function handleCity(value: string) {
    setCity(value)
    const c = CITIES.find((x) => x.city === value)
    if (c) {
      setIftar(c.iftar)
      setSuhoor(c.suhoor)
    }
  }

  const { doses, fastLength, eatLength, interval } = useMemo(() => {
    let iftarMin = toMin(iftar)
    let suhoorMin = toMin(suhoor)
    // Normalisation : le Suhoor précède toujours l'Iftar dans la journée
    if (suhoorMin >= iftarMin) {
      // interprète le suhoor comme étant le lendemain → impossible ; on échange
      const tmp = iftarMin
      iftarMin = suhoorMin
      suhoorMin = tmp
    }
    const fast = iftarMin - suhoorMin
    const eat = 1440 - fast
    const d = computeDoses(iftar, suhoor, freq, singleAt)
    const intervalMin =
      d.length > 1 ? (d[d.length - 1].min - d[0].min) / (d.length - 1) : 0
    return { doses: d, fastLength: fast, eatLength: eat, interval: intervalMin }
  }, [iftar, suhoor, freq, singleAt])

  async function handleCopy() {
    const lines = [
      `Plan de prise — Ramadan (DzPharm)`,
      `Wilaya : ${city} · Iftar ${iftar} · Suhoor ${suhoor}`,
      `Jeûne : ${formatDuration(fastLength)} · Fenêtre d'alimentation : ${formatDuration(eatLength)}`,
      '',
      ...doses.map((d) => `• ${d.label}`),
      '',
      interval > 0 ? `Intervalle entre prises : ${formatDuration(interval)}` : '',
      'Ajustement à valider par le médecin traitant.',
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Plan copié', description: 'Le plan de prise est dans le presse-papier.' })
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Alerte sécurité */}
      <div
        className="flex items-start gap-3 rounded-xl border border-state-warning/40 bg-state-warning/10 p-4"
        role="note"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-state-warning" aria-hidden />
        <div className="text-sm leading-relaxed text-foreground/90">
          <p className="font-semibold text-state-warning">Avertissement médical</p>
          <p className="mt-1">
            L&apos;adaptation posologique pendant le Ramadan relève d&apos;une décision médicale
            individualisée. Cet outil propose une répartition horaire de référence — il ne
            remplace pas l&apos;avis du médecin traitant, en particulier pour le diabète,
            l&apos;épilepsie et les anticoagulants.
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="size-4 text-chifa" aria-hidden />
            Configuration du jeûne
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="ramadan-city" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Wilaya (horaires indicatifs)
            </label>
            <Select value={city} onValueChange={handleCity}>
              <SelectTrigger id="ramadan-city" className="h-10 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.city} value={c.city}>
                    {c.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="ramadan-iftar" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <Sunset className="mr-1 inline size-3.5 text-chifa" aria-hidden />
              Iftar (rupture du jeûne)
            </label>
            <input
              id="ramadan-iftar"
              type="time"
              value={iftar}
              onChange={(e) => setIftar(e.target.value || '19:15')}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="ramadan-suhoor" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <Sunrise className="mr-1 inline size-3.5 text-primary" aria-hidden />
              Suhoor (dernier repas)
            </label>
            <input
              id="ramadan-suhoor"
              type="time"
              value={suhoor}
              onChange={(e) => setSuhoor(e.target.value || '04:45')}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="ramadan-freq" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rythme du traitement
            </label>
            <Select value={String(freq)} onValueChange={(v) => setFreq(Number(v) as 1 | 2 | 3 | 4)}>
              <SelectTrigger id="ramadan-freq" className="h-10 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3, 4] as const).map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    {FREQ_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {freq === 1 ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Prise unique — horaire conseillé</p>
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                {(['suhoor', 'iftar'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSingleAt(opt)}
                    aria-pressed={singleAt === opt}
                    className={cn(
                      'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                      singleAt === opt
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt === 'suhoor' ? 'Au Suhoor (le plus courant)' : 'À l\u2019Iftar'}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Plan de prise */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-primary" aria-hidden />
              Plan de prise adapté
            </span>
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
              {copied ? <Check className="size-3.5 text-state-safe" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? 'Copié' : 'Copier le plan'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-chifa/30 bg-chifa/5 p-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase">
                <Moon className="size-3 text-chifa" aria-hidden />
                Jeûne
              </p>
              <p className="mt-1 text-lg font-bold text-chifa tabular-nums">{formatDuration(fastLength)}</p>
            </div>
            <div className="rounded-lg border border-state-safe/30 bg-state-safe/5 p-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase">
                <Sunset className="size-3 text-state-safe" aria-hidden />
                Fenêtre d&apos;alimentation
              </p>
              <p className="mt-1 text-lg font-bold text-state-safe tabular-nums">{formatDuration(eatLength)}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase">
                <Clock className="size-3 text-primary" aria-hidden />
                {doses.length > 1 ? 'Intervalle' : 'Prises'}
              </p>
              <p className="mt-1 text-lg font-bold text-primary tabular-nums">
                {doses.length > 1 ? formatDuration(interval) : `${doses.length}`}
              </p>
            </div>
          </div>

          {/* Timeline 24 h */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Cycle 24 heures
            </p>
            <div className="relative h-20 overflow-hidden rounded-xl border border-border bg-muted/30">
              {/* Segments */}
              {(() => {
                const iftarMin = toMin(iftar)
                const suhoorMin = toMin(suhoor)
                const fastLeft = (suhoorMin / 1440) * 100
                const fastWidth = ((iftarMin - suhoorMin) / 1440) * 100
                const eat1Width = ((1440 - iftarMin) / 1440) * 100
                const eat2Width = (suhoorMin / 1440) * 100
                return (
                  <>
                    {/* Fenêtre d'alimentation — partie 1 : Iftar → minuit */}
                    <div
                      className="absolute inset-y-0 bg-state-safe/15"
                      style={{ left: `${100 - eat1Width}%`, width: `${eat1Width}%` }}
                      aria-hidden
                    />
                    {/* Fenêtre d'alimentation — partie 2 : minuit → Suhoor */}
                    <div
                      className="absolute inset-y-0 left-0 bg-state-safe/15"
                      style={{ width: `${eat2Width}%` }}
                      aria-hidden
                    />
                    {/* Jeûne : Suhoor → Iftar */}
                    <div
                      className="absolute inset-y-0 bg-gradient-to-b from-chifa/20 to-chifa/10"
                      style={{ left: `${fastLeft}%`, width: `${fastWidth}%` }}
                      aria-hidden
                    />
                    {/* Repères horaires */}
                    {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                      <div
                        key={h}
                        className="absolute inset-y-0 w-px bg-border/60"
                        style={{ left: `${(h / 24) * 100}%` }}
                        aria-hidden
                      />
                    ))}
                    {/* Étiquettes zones */}
                    <span
                      className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wider text-chifa/90 uppercase"
                      style={{ left: `${(fastLeft + fastWidth / 2) / 1}%`, transform: 'translateX(-50%)' }}
                    >
                      Jeûne
                    </span>
                    {/* Épingles des prises */}
                    {doses.map((d, i) => {
                      // Clamp pour éviter le rognage aux bords du conteneur
                      const pct = Math.max(3, Math.min(97, ((((d.min % 1440) + 1440) % 1440) / 1440) * 100))
                      const top = i % 2 === 0
                      return (
                        <div
                          key={i}
                          className="absolute flex flex-col items-center"
                          style={{
                            left: `${pct * 100}%`,
                            top: top ? '18%' : '52%',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <span
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full border-2 shadow-md',
                              d.anchor === 'middle'
                                ? 'border-primary bg-primary/15 text-primary'
                                : d.anchor === 'iftar'
                                  ? 'border-state-safe bg-state-safe/20 text-state-safe'
                                  : 'border-primary bg-primary/20 text-primary'
                            )}
                          >
                            <Pill className="size-3.5" aria-hidden />
                          </span>
                          <span className="mt-0.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-bold text-foreground tabular-nums shadow-sm">
                            {toHHMM(d.min)}
                          </span>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
              {/* Graduation basse */}
              <div className="absolute inset-x-0 bottom-0 flex justify-between px-0 text-[9px] font-medium text-muted-foreground/70">
                {['00', '03', '06', '09', '12', '15', '18', '21', '24'].map((h) => (
                  <span key={h} className="px-0.5 py-0.5">
                    {h}h
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-chifa/40" aria-hidden />
                Période de jeûne
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-state-safe/30" aria-hidden />
                Fenêtre d&apos;alimentation (prises possibles)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex size-2.5 items-center justify-center rounded-full border border-primary bg-primary/20" aria-hidden />
                Prise conseillée
              </span>
            </div>
          </div>

          {/* Détail des prises */}
          <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {doses.map((d, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
                className={cn(
                  'rounded-lg border p-3',
                  d.anchor === 'iftar'
                    ? 'border-state-safe/30 bg-state-safe/5'
                    : d.anchor === 'suhoor'
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-muted/30'
                )}
              >
                <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {toHHMM(d.min)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{d.label.split('—')[0].trim()}</p>
                <p className="mt-1 text-[11px] font-medium text-foreground/80">
                  {d.anchor === 'iftar'
                    ? 'Après la rupture du jeûne'
                    : d.anchor === 'suhoor'
                      ? 'Avant l\u2019aube, avec de l\u2019eau'
                      : 'Prise intermédiaire nocturne'}
                </p>
              </motion.li>
            ))}
          </ol>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-state-warning" aria-hidden />
            {doses.length > 1
              ? `Intervalle de ${formatDuration(interval)} entre les prises — certains antibiotiques et antiépileptiques exigent un intervalle régulier : validez le décalage avec le médecin ou le pharmacien.`
              : 'La prise unique est calée sur la fenêtre d\u2019alimentation — à ajuster selon la pharmacocinétique de la molécule.'}
          </p>
        </CardContent>
      </Card>

      {/* Guidance par classe */}
      <div>
        <h3 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
          Repères par classe médicamenteuse
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Principes de chronopharmacologie appliqués au jeûne du Ramadan — synthèse indicative.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GUIDANCE.map((g, i) => {
            const styles = RISK_STYLES[g.risk]
            return (
              <motion.div
                key={g.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
              >
                <Card className={cn('h-full transition-colors', styles.border)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <g.icon className={cn('size-4', styles.icon)} aria-hidden />
                        {g.label}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                          styles.badge
                        )}
                      >
                        {styles.label}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed font-medium text-foreground/90">{g.summary}</p>
                    <ul className="mt-2.5 space-y-1.5">
                      {g.points.map((p, j) => (
                        <li key={j} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span
                            className={cn('mt-1 size-1.5 shrink-0 rounded-full', g.risk === 'ELEVE' ? 'bg-state-danger/70' : g.risk === 'MODERE' ? 'bg-state-warning/70' : 'bg-state-safe/70')}
                            aria-hidden
                          />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* W3-02 · Convertisseur Chronopharmacologique 3 Prises → 2 Prises */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            Chronopharmacologie : Algorithmes de Re-timing 3 Prises → 2 Prises (W3-02)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Résolution du conflit pharmacocinétique (fenêtre de jeûne 14-16h vs fenêtre nocturne 8-10h)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Stratégie LP (Libération Prolongée)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Substitution prioritaire de la forme standard par une présentation à libération prolongée en <strong>prise unique à l&apos;Iftar</strong>. Évite les pics toxiques nocturnes.
              </p>
              <div className="bg-background/80 p-2 rounded text-[11px] space-y-1 border border-border/40">
                <span className="font-semibold block text-primary">Exemples de conversion :</span>
                <div>• Metformine 500mg 3x/j → <strong>Metformine LP 1000mg</strong> Iftar</div>
                <div>• Kétoprofène 50mg 3x/j → <strong>Kétoprofène LP 100/200mg</strong> Iftar</div>
                <div>• Diltiazem standard → <strong>Diltiazem LP 200/300mg</strong> Iftar</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Répartition Asymétrique (2/3 + 1/3)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Si la molécule ne possède pas d&apos;équivalent LP, regrouper les prises de manière asymétrique : <strong>2/3 de la dose à l&apos;Iftar</strong> et <strong>1/3 au Suhoor</strong>.
              </p>
              <div className="bg-background/80 p-2 rounded text-[11px] space-y-1 border border-border/40">
                <span className="font-semibold block text-emerald-700 dark:text-emerald-400">Règle pharmacocinétique :</span>
                <div>• Iftar : absorption favorisée par le repas copieux</div>
                <div>• Suhoor : dose plus faible pour limiter l&apos;irritation gastrique à jeun</div>
                <div>• Ne jamais comprimer 3 prises sur moins de 6 heures</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="size-5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Marge Thérapeutique Étroite</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Médicaments critiques (AVK, Théophylline, Antiépileptiques, Lithium) : <strong>interdiction de modifier arbitrairement l&apos;intervalle</strong>.
              </p>
              <div className="bg-background/80 p-2 rounded text-[11px] space-y-1 border border-border/40">
                <span className="font-semibold block text-rose-700 dark:text-rose-400">Vigilance vitale :</span>
                <div>• Valproate / Carbamazépine : dosage sérique nécessaire</div>
                <div>• Sintrom : contrôle INR à J+7 du début du jeûne</div>
                <div>• Rokhsa médicale obligatoire si risque de décompensation</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Horaires indicatifs — vérifiez le calendrier officiel du Ministère des Affaires Religieuses
        pour votre wilaya, puis ajustez les champs Iftar / Suhoor.
      </p>
    </div>
  )
}
