'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { syncToolQueryParams, readQueryParams } from '@/lib/clinical/url-sync'
import {
  Activity,
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  FileText,
  Info,
  Layers,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types & Modèles Cliniques Child-Pugh                                */
/* ------------------------------------------------------------------ */

export type ChildPughClass = 'A' | 'B' | 'C'

export interface ChildPughResult {
  score: number
  classification: ChildPughClass
  label: string
  severity: string
  oneYearSurvival: string
  twoYearSurvival: string
  periOpMortality: string
  color: string
  bg: string
  border: string
}

export type HepaticDrugStatus = 'safe' | 'caution' | 'adjust' | 'contraindicated'

export interface HepaticDrugRule {
  dci: string
  brandExamples: string
  class: string
  ruleA: string
  ruleB: string
  ruleC: string
  mechanism: string
  statusByClass: (cls: ChildPughClass) => HepaticDrugStatus
}

/* ------------------------------------------------------------------ */
/* Règles d'adaptation pharmacologique hépatique (25 molécules clés)  */
/* ------------------------------------------------------------------ */

export const HEPATIC_DRUG_RULES: HepaticDrugRule[] = [
  {
    dci: 'Paracétamol',
    brandExamples: 'Doliprane, Panadol, Efferalgan',
    class: 'Antalgique / Antipyrétique',
    ruleA: 'Dose usuelle possible. Préférer max 3 g/24h chez l’adulte en prise espacée.',
    ruleB: 'Posologie maximale réduite à 2 g/24h (500 mg × 4/j max, espacer de 6-8h).',
    ruleC: 'Contre-indiqué en cas d’insuffisance hépatocellulaire sévère ou décompensée.',
    mechanism: 'Métabolisme hépatique (glucuronoconjugaison saturable → métabolite réactif NAPQI détoxifié par glutathion).',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : cls === 'B' ? 'adjust' : 'safe'),
  },
  {
    dci: 'Ibuprofène',
    brandExamples: 'Brufen, Algofen, Advil',
    class: 'AINS (Anti-inflammatoire non stéroïdien)',
    ruleA: 'Utiliser avec précaution à la dose efficace minimale pour une durée très courte.',
    ruleB: 'Contre-indiqué ou formellement déconseillé : risque hémorragique digestif accru et syndrome hépato-rénal.',
    ruleC: 'Contre-indication absolue (décompensation ascitique, hémorragie variqueuse).',
    mechanism: 'Inhibition des prostaglandines rénales → vasoconstriction rénale aiguë + risque de saignement sur varices œsophagiennes.',
    statusByClass: (cls) => (cls === 'A' ? 'caution' : 'contraindicated'),
  },
  {
    dci: 'Morphine',
    brandExamples: 'Sevredol, Moscontin, Morphine Aguettant',
    class: 'Antalgique opioïde fort (Palier III)',
    ruleA: 'Espacer les intervalles de prise (demi-vie augmentée). Débuter à 50% de la dose usuelle.',
    ruleB: 'Réduction de 50 à 75% des doses, surveillance clinique rigoureuse.',
    ruleC: 'Contre-indiqué : risque majeur de précipitation d’une encéphalopathie hépatique et coma.',
    mechanism: 'Biodisponibilité fortement accrue (baisse du premier passage hépatique) et clairance ralentie.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : 'adjust'),
  },
  {
    dci: 'Tramadol',
    brandExamples: 'Tramal, Zaldiar, Topalgic',
    class: 'Antalgique opioïde faible (Palier II)',
    ruleA: 'Dose standard ou espacement des prises à 8-12h selon la réponse clinique.',
    ruleB: 'Max 50 mg toutes les 12h. Éviter les formes à libération prolongée.',
    ruleC: 'Contre-indiqué : risque d’accumulation et d’encéphalopathie.',
    mechanism: 'Métabolisme par CYP2D6 et CYP3A4 diminué, clairance hépatique réduite.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : cls === 'B' ? 'adjust' : 'caution'),
  },
  {
    dci: 'Diazépam',
    brandExamples: 'Valium',
    class: 'Anxiolytique benzodiazépine (longue durée)',
    ruleA: 'Réduire la posologie de 50%. Éviter les traitements prolongés.',
    ruleB: 'Contre-indiqué : demi-vie d’élimination multipliée par 2 à 5 (jusqu’à 100h+).',
    ruleC: 'Contre-indication absolue : déclencheur direct d’encéphalopathie hépatique.',
    mechanism: 'Métabolisme oxydatif microsomal hépatique effondré chez le cirrhotique.',
    statusByClass: (cls) => (cls === 'A' ? 'adjust' : 'contraindicated'),
  },
  {
    dci: 'Oxazépam',
    brandExamples: 'Seresta',
    class: 'Anxiolytique benzodiazépine (durée courte)',
    ruleA: 'Posologie usuelle ou légèrement réduite.',
    ruleB: 'Molécule de choix si anxiolytique indispensable : glucuronoconjugaison préservée plus longtemps.',
    ruleC: 'Prudence extrême, contre-indiqué si encéphalopathie active ou antécédent récent.',
    mechanism: 'Glucuronoconjugaison directe sans métabolites actifs, moindre accumulation.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : cls === 'B' ? 'caution' : 'safe'),
  },
  {
    dci: 'Atorvastatine',
    brandExamples: 'Tahor, Ator, Lipitor',
    class: 'Hypolipémiant inhibiteur de l’HMG-CoA réductase',
    ruleA: 'Dose initiale faible (10 mg), bilan enzymatique ALAT/ASAT régulier.',
    ruleB: 'Contre-indiqué en cas d’affection hépatique évolutive ou élévation persistante des transaminases.',
    ruleC: 'Contre-indication formelle.',
    mechanism: 'Métabolisme hépatique étendu via CYP3A4 et excrétion biliaire prédominante.',
    statusByClass: (cls) => (cls === 'A' ? 'caution' : 'contraindicated'),
  },
  {
    dci: 'Rivaroxaban',
    brandExamples: 'Xarelto',
    class: 'Anticoagulant oral direct (AOD)',
    ruleA: 'Utilisable avec prudence sans adaptation systématique de dose.',
    ruleB: 'Contre-indiqué chez les patients cirrhotiques Child-Pugh B ou C associés à une coagulopathie.',
    ruleC: 'Contre-indication absolue.',
    mechanism: 'Élimination hépatique par CYP3A4/2J2 et risque hémorragique accru lié au déficit en facteurs de coagulation.',
    statusByClass: (cls) => (cls === 'A' ? 'caution' : 'contraindicated'),
  },
  {
    dci: 'Acénocoumarol / Warfarine',
    brandExamples: 'Sintrom, Coumadine',
    class: 'Antivitamine K (AVK)',
    ruleA: 'Sensibilité accrue : débuter à posologie minimale, surveillance INR rapprochée.',
    ruleB: 'Difficulté majeure d’équilibrage de l’INR (déjà élevé spontanément) ; surveillance hématologique.',
    ruleC: 'Déconseillé / contre-indiqué : risque hémorragique spontané majeur.',
    mechanism: 'Déficit endogène de synthèse des facteurs II, VII, IX, X + clairance diminuée.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : 'adjust'),
  },
  {
    dci: 'Métronidazole',
    brandExamples: 'Flagyl, Metrol',
    class: 'Antibactérien / Antiparasitaire nitro-imidazolé',
    ruleA: 'Dose standard.',
    ruleB: 'Réduire la dose quotidienne de 50% en prises espacées.',
    ruleC: 'Réduire d’un tiers (33%) à 50% de la dose usuelle, surveillance neurologique.',
    mechanism: 'Clairance hépatique significativement réduite chez le cirrhotique décompensé.',
    statusByClass: (cls) => (cls === 'A' ? 'safe' : 'adjust'),
  },
  {
    dci: 'Propranolol',
    brandExamples: 'Avlocardyl',
    class: 'Bêta-bloquant non cardiosélectif',
    ruleA: 'Utilisé en prophylaxie de rupture de varices œsophagiennes. Titration prudente (viser FC 55-60 bpm).',
    ruleB: 'Clairance diminuée, premier passage hépatique réduit → débuter à dose très faible (10-20 mg/j).',
    ruleC: 'Surveillance tensionnelle étroite ; suspendre en cas d’hypotension réfractaire ou péritonite.',
    mechanism: 'Métabolisme hépatique de premier passage majeur, biodisponibilité multipliée par 3 à 4.',
    statusByClass: (cls) => (cls === 'C' ? 'caution' : 'adjust'),
  },
  {
    dci: 'Metformine',
    brandExamples: 'Glucophage, Stagid',
    class: 'Antidiabétique biguanide',
    ruleA: 'Utilisable sous réserve d’une fonction rénale conservée.',
    ruleB: 'Contre-indiqué : risque majeur d’acidose lactique par diminution de la clairance du lactate hépatique.',
    ruleC: 'Contre-indication absolue.',
    mechanism: 'Le foie insuffisant ne métabolise plus l’acide lactique produit sous metformine.',
    statusByClass: (cls) => (cls === 'A' ? 'safe' : 'contraindicated'),
  },
  {
    dci: 'Ramipril / Périndopril',
    brandExamples: 'Triatec, Coversyl',
    class: 'Inhibiteur de l’enzyme de conversion (IEC)',
    ruleA: 'Dose initiale très faible, surveillance pression artérielle et créatinine.',
    ruleB: 'Prudence extrême : risque d’effondrement tensionnel et de décompensation ascitique.',
    ruleC: 'Contre-indiqué : déclenchement fréquent de syndrome hépato-rénal.',
    mechanism: 'Blocage du système rénine-angiotensine-aldostérone vital pour la perfusion rénale du cirrhotique.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : cls === 'B' ? 'caution' : 'safe'),
  },
  {
    dci: 'Ciprofloxacine',
    brandExamples: 'Ciflox, Cipro',
    class: 'Antibactérien fluoroquinolone',
    ruleA: 'Dose standard.',
    ruleB: 'Dose standard ou surveillance attentive en traitement prolongé.',
    ruleC: 'Réduire la posologie de 25 à 50% si fonction rénale également altérée.',
    mechanism: 'Métabolisme hépatique partiel (30-40%) avec élimination rénale.',
    statusByClass: (cls) => (cls === 'C' ? 'adjust' : 'safe'),
  },
  {
    dci: 'Fluconazole',
    brandExamples: 'Triflucan',
    class: 'Antifongique azolé',
    ruleA: 'Surveillance des enzymes hépatiques (ALAT/ASAT).',
    ruleB: 'Surveillance hépatique renforcée, réduire si traitement d’entretien prolongé.',
    ruleC: 'Contre-indiqué sauf urgence vitale (mycose invasive) avec adaptation posologique stricte.',
    mechanism: 'Inhibiteur enzymatique hépatique et métabolisme hépatique partiel avec risque d’hépatotoxicité additionnelle.',
    statusByClass: (cls) => (cls === 'C' ? 'contraindicated' : 'caution'),
  },
]

/* ------------------------------------------------------------------ */
/* Calculateur Child-Pugh                                              */
/* ------------------------------------------------------------------ */

export function calculateChildPugh(
  bilirubinUmol: number,
  albuminGL: number,
  inr: number,
  ascitesScore: 1 | 2 | 3,
  encephalopathyScore: 1 | 2 | 3,
  isPbc: boolean = false
): ChildPughResult {
  // Score Bilirubine
  let biliPts = 1
  if (isPbc) {
    if (bilirubinUmol > 170) biliPts = 3
    else if (bilirubinUmol >= 68) biliPts = 2
  } else {
    if (bilirubinUmol > 50) biliPts = 3
    else if (bilirubinUmol >= 34) biliPts = 2
  }

  // Score Albumine
  let albPts = 1
  if (albuminGL < 28) albPts = 3
  else if (albuminGL <= 35) albPts = 2

  // Score INR
  let inrPts = 1
  if (inr > 2.3) inrPts = 3
  else if (inr >= 1.7) inrPts = 2

  const total = biliPts + albPts + inrPts + ascitesScore + encephalopathyScore

  if (total <= 6) {
    return {
      score: total,
      classification: 'A',
      label: 'Classe A · Maladie bien compensée',
      severity: 'Légère',
      oneYearSurvival: '100 %',
      twoYearSurvival: '85 %',
      periOpMortality: '~10 %',
      color: 'text-state-safe',
      bg: 'bg-state-safe/10',
      border: 'border-state-safe/30',
    }
  }

  if (total <= 9) {
    return {
      score: total,
      classification: 'B',
      label: 'Classe B · Atteinte fonctionnelle significative',
      severity: 'Modérée',
      oneYearSurvival: '80 %',
      twoYearSurvival: '60 %',
      periOpMortality: '~30 %',
      color: 'text-state-warning',
      bg: 'bg-state-warning/10',
      border: 'border-state-warning/30',
    }
  }

  return {
    score: total,
    classification: 'C',
    label: 'Classe C · Maladie décompensée sévère',
    severity: 'Sévère',
    oneYearSurvival: '45 %',
    twoYearSurvival: '35 %',
    periOpMortality: '~75 - 80 %',
    color: 'text-state-danger',
    bg: 'bg-state-danger/10',
    border: 'border-state-danger/30',
  }
}

/* ------------------------------------------------------------------ */
/* Composant Principal HepaticCalculator                               */
/* ------------------------------------------------------------------ */

export function HepaticCalculator() {
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const updatePinnedPatient = useDzPharm((s) => s.updatePinnedPatient)

  // Paramètres cliniques
  const [biliInput, setBiliInput] = useState<string>('24')
  const [biliUnit, setBiliUnit] = useState<'umol' | 'mgdl'>('umol')
  const [albInput, setAlbInput] = useState<string>('38')
  const [inrInput, setInrInput] = useState<string>('1.1')
  const [ascites, setAscites] = useState<1 | 2 | 3>(1)
  const [encephalopathy, setEncephalopathy] = useState<1 | 2 | 3>(1)
  const [isPbc, setIsPbc] = useState<boolean>(false)

  // Recherche dans les règles médicamenteuses
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  // Initialisation via paramètres URL
  useEffect(() => {
    const params = readQueryParams()
    if (!params) return
    const pBili = params.get('bili')
    const pUnit = params.get('unit')
    const pAlb = params.get('alb')
    const pInr = params.get('inr')
    const pAscites = params.get('ascites')
    const pEnceph = params.get('enceph')
    const pPbc = params.get('pbc')
    const pQ = params.get('q')

    if (pBili) setBiliInput(pBili)
    if (pUnit === 'mgdl' || pUnit === 'umol') setBiliUnit(pUnit)
    if (pAlb) setAlbInput(pAlb)
    if (pInr) setInrInput(pInr)
    if (pAscites && ['1', '2', '3'].includes(pAscites)) setAscites(Number(pAscites) as 1 | 2 | 3)
    if (pEnceph && ['1', '2', '3'].includes(pEnceph)) setEncephalopathy(Number(pEnceph) as 1 | 2 | 3)
    if (pPbc) setIsPbc(pPbc === '1' || pPbc === 'true')
    if (pQ) setSearchQuery(pQ)
  }, [])

  // Synchronisation continue vers l'URL
  useEffect(() => {
    syncToolQueryParams('hepatique', {
      bili: biliInput,
      unit: biliUnit === 'mgdl' ? 'mgdl' : undefined,
      alb: albInput,
      inr: inrInput,
      ascites: ascites !== 1 ? ascites : undefined,
      enceph: encephalopathy !== 1 ? encephalopathy : undefined,
      pbc: isPbc ? '1' : undefined,
      q: searchQuery || undefined,
    })
  }, [biliInput, biliUnit, albInput, inrInput, ascites, encephalopathy, isPbc, searchQuery])

  // Conversions numériques
  const biliUmol = useMemo(() => {
    const val = parseFloat(biliInput) || 0
    return biliUnit === 'mgdl' ? val * 17.1 : val
  }, [biliInput, biliUnit])

  const albGL = useMemo(() => {
    return parseFloat(albInput) || 0
  }, [albInput])

  const inrVal = useMemo(() => {
    return parseFloat(inrInput) || 1.0
  }, [inrInput])

  // Calcul du score Child-Pugh
  const result = useMemo(() => {
    return calculateChildPugh(biliUmol, albGL, inrVal, ascites, encephalopathy, isPbc)
  }, [biliUmol, albGL, inrVal, ascites, encephalopathy, isPbc])

  // Synchronisation avec le patient épinglé
  const handlePinHepaticClass = () => {
    updatePinnedPatient({
      childPughClass: result.classification,
    })
    toast.success(`Profil hépatique Classe ${result.classification} épinglé au patient actif.`)
  }

  // Filtrage des médicaments
  const filteredDrugs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return HEPATIC_DRUG_RULES.filter((rule) => {
      const matchesSearch =
        !q ||
        rule.dci.toLowerCase().includes(q) ||
        rule.brandExamples.toLowerCase().includes(q) ||
        rule.class.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (selectedStatusFilter === 'all') return true
      const status = rule.statusByClass(result.classification)
      return status === selectedStatusFilter
    })
  }, [searchQuery, selectedStatusFilter, result.classification])

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Activity className="size-5 text-primary" aria-hidden />
            Score de Child-Pugh &amp; Adaptation Hépatique
          </h2>
          <p className="text-sm text-muted-foreground">
            Stadification pronostique de la cirrhose et guide d’ajustement posologique des médicaments à métabolisme hépatique.
          </p>
        </div>

        {/* Bouton synchronisation patient épinglé */}
        <div className="flex items-center gap-2">
          {pinnedPatient?.childPughClass && (
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
              <UserCheck className="size-3.5" />
              Patient : Classe {pinnedPatient.childPughClass}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePinHepaticClass}
            className="gap-1.5 text-xs font-semibold"
          >
            <BookmarkCheck className="size-3.5" />
            Épingler Classe {result.classification}
          </Button>
        </div>
      </div>

      {/* Grille principale : Formulaire + Résultat */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulaire des 5 critères (7 colonnes) */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Critères biologiques et cliniques
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  id="pbc-switch"
                  checked={isPbc}
                  onCheckedChange={setIsPbc}
                />
                <Label htmlFor="pbc-switch" className="cursor-pointer">
                  Cirrhose Biliaire Primitive (CBP)
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 1. Bilirubine */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bili-input" className="text-sm font-medium">
                  1. Bilirubine Totale
                </Label>
                <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setBiliUnit('umol')}
                    className={cn(
                      'rounded px-2 py-0.5 font-medium transition-colors',
                      biliUnit === 'umol'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    µmol/L
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiliUnit('mgdl')}
                    className={cn(
                      'rounded px-2 py-0.5 font-medium transition-colors',
                      biliUnit === 'mgdl'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    mg/dL
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="bili-input"
                  type="number"
                  min="1"
                  max="1000"
                  step="0.1"
                  value={biliInput}
                  onChange={(e) => setBiliInput(e.target.value)}
                  className="font-mono text-base"
                />
                <span className="text-xs text-muted-foreground min-w-[120px]">
                  {isPbc
                    ? 'Normale: < 68 µmol/L'
                    : '1 pt: < 34 · 2 pts: 34-50 · 3 pts: > 50'}
                </span>
              </div>
            </div>

            <Separator />

            {/* 2. Albumine sérique */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="alb-input" className="text-sm font-medium">
                  2. Albumine Sérique (g/L)
                </Label>
                <span className="text-xs text-muted-foreground">
                  1 pt: &gt; 35 · 2 pts: 28-35 · 3 pts: &lt; 28
                </span>
              </div>
              <Input
                id="alb-input"
                type="number"
                min="5"
                max="70"
                step="0.1"
                value={albInput}
                onChange={(e) => setAlbInput(e.target.value)}
                className="font-mono text-base"
              />
            </div>

            <Separator />

            {/* 3. INR (Temps de Prothrombine) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="inr-input" className="text-sm font-medium">
                  3. Coagulation : INR (ou TP)
                </Label>
                <span className="text-xs text-muted-foreground">
                  1 pt: &lt; 1.7 · 2 pts: 1.7-2.3 · 3 pts: &gt; 2.3
                </span>
              </div>
              <Input
                id="inr-input"
                type="number"
                min="0.5"
                max="10"
                step="0.05"
                value={inrInput}
                onChange={(e) => setInrInput(e.target.value)}
                className="font-mono text-base"
              />
            </div>

            <Separator />

            {/* 4. Ascite */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">4. Ascite clinique</Label>
              <RadioGroup
                value={String(ascites)}
                onValueChange={(v) => setAscites(parseInt(v) as 1 | 2 | 3)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <Label
                  htmlFor="ascites-1"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    ascites === 1 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="ascites-1" />
                    <span>Absente</span>
                  </div>
                  <span className="font-mono text-muted-foreground">1 pt</span>
                </Label>

                <Label
                  htmlFor="ascites-2"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    ascites === 2 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="2" id="ascites-2" />
                    <span>Modérée / traitée</span>
                  </div>
                  <span className="font-mono text-muted-foreground">2 pts</span>
                </Label>

                <Label
                  htmlFor="ascites-3"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    ascites === 3 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="3" id="ascites-3" />
                    <span>Abondante / réfractaire</span>
                  </div>
                  <span className="font-mono text-muted-foreground">3 pts</span>
                </Label>
              </RadioGroup>
            </div>

            <Separator />

            {/* 5. Encéphalopathie hépatique */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">5. Encéphalopathie hépatique</Label>
              <RadioGroup
                value={String(encephalopathy)}
                onValueChange={(v) => setEncephalopathy(parseInt(v) as 1 | 2 | 3)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <Label
                  htmlFor="enceph-1"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    encephalopathy === 1 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="enceph-1" />
                    <span>Absente (Grade 0)</span>
                  </div>
                  <span className="font-mono text-muted-foreground">1 pt</span>
                </Label>

                <Label
                  htmlFor="enceph-2"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    encephalopathy === 2 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="2" id="enceph-2" />
                    <span>Grade I - II (Confusion)</span>
                  </div>
                  <span className="font-mono text-muted-foreground">2 pts</span>
                </Label>

                <Label
                  htmlFor="enceph-3"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    encephalopathy === 3 ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="3" id="enceph-3" />
                    <span>Grade III - IV (Coma)</span>
                  </div>
                  <span className="font-mono text-muted-foreground">3 pts</span>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Résultat & Pronostic (5 colonnes) */}
        <div className="space-y-4 lg:col-span-5">
          <Card className={cn('border-2 transition-all', result.border, result.bg)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Score de Child-Pugh
                </span>
                <span className={cn('font-mono text-2xl font-black', result.color)}>
                  {result.score} / 15
                </span>
              </div>
              <CardTitle className={cn('text-2xl font-black', result.color)}>
                Classe {result.classification}
              </CardTitle>
              <p className="text-sm font-medium text-foreground/80">{result.label}</p>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <div className="rounded-lg bg-background/80 p-3.5 shadow-sm space-y-2 text-xs">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Survie estimée à 1 an :</span>
                  <span className="font-bold">{result.oneYearSurvival}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Survie estimée à 2 ans :</span>
                  <span className="font-bold">{result.twoYearSurvival}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mortalité péri-opératoire :</span>
                  <span className="font-bold text-state-danger">{result.periOpMortality}</span>
                </div>
              </div>

              {/* Règle générale posologique */}
              <div className="rounded-lg border bg-background/60 p-3 text-xs leading-relaxed">
                <p className="font-bold text-foreground mb-1">
                  Recommandation pharmacologique générale :
                </p>
                {result.classification === 'A' && (
                  <p className="text-muted-foreground">
                    Fonction hépatique globale préservée. Posologies usuelles pour la majorité des molécules. Surveillance recommandée pour les médicaments à marge thérapeutique étroite ou forte extraction hépatique.
                  </p>
                )}
                {result.classification === 'B' && (
                  <p className="text-state-warning">
                    Altération hépatique significative. Réduction posologique de 25 à 50% sur les médicaments à métabolisme hépatique élevé. Éviter formellement les sédatifs à demi-vie longue et les AINS.
                  </p>
                )}
                {result.classification === 'C' && (
                  <p className="text-state-danger font-medium">
                    Décompensation sévère. Contre-indication pour la majorité des médicaments métabolisés par le foie ou hautement liés aux protéines. Risque majeur d’encéphalopathie hépatique et d’hémorragie.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Note de sécurité */}
          <div className="rounded-xl border border-muted bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="size-3.5 text-primary" />
              Précision clinique
            </div>
            <p>
              Le score de Child-Turcotte-Pugh est le référentiel validé par l’ANSM, l’EMA et la FDA pour l’adaptation posologique en hépatologie. Pour l’évaluation pré-greffe hépatique aiguë, le score MELD est également requis.
            </p>
          </div>
        </div>
      </div>

      {/* Guide d'adaptation des médicaments pour la classe active */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Layers className="size-4 text-primary" />
                Tableau d’adaptation posologique pour la Classe {result.classification}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Règles de prescription officielles adaptées à la sévérité Child-Pugh active.
              </p>
            </div>

            {/* Filtres de statut */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher molécule ou classe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2.5 text-xs font-medium"
              >
                <option value="all">Tous les statuts ({HEPATIC_DRUG_RULES.length})</option>
                <option value="safe">Dose standard</option>
                <option value="caution">Prudence</option>
                <option value="adjust">À adapter / réduire</option>
                <option value="contraindicated">Contre-indiqué</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="divide-y rounded-lg border">
            {filteredDrugs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucun médicament ne correspond aux critères de recherche.
              </div>
            ) : (
              filteredDrugs.map((drug) => {
                const status = drug.statusByClass(result.classification)
                const currentRule =
                  result.classification === 'A'
                    ? drug.ruleA
                    : result.classification === 'B'
                    ? drug.ruleB
                    : drug.ruleC

                return (
                  <div
                    key={drug.dci}
                    className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{drug.dci}</span>
                        <span className="text-xs text-muted-foreground">
                          ({drug.brandExamples})
                        </span>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {drug.class}
                        </Badge>
                      </div>

                      <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                        {currentRule}
                      </p>

                      <p className="text-[11px] text-muted-foreground italic">
                        Mécanisme : {drug.mechanism}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      {status === 'safe' && (
                        <Badge className="border-state-safe/30 bg-state-safe/10 text-state-safe hover:bg-state-safe/20 gap-1 text-[11px]">
                          <CheckCircle2 className="size-3" />
                          Dose standard
                        </Badge>
                      )}
                      {status === 'caution' && (
                        <Badge className="border-state-warning/30 bg-state-warning/10 text-state-warning hover:bg-state-warning/20 gap-1 text-[11px]">
                          <AlertTriangle className="size-3" />
                          Prudence
                        </Badge>
                      )}
                      {status === 'adjust' && (
                        <Badge className="border-chifa/40 bg-chifa/10 text-chifa hover:bg-chifa/20 gap-1 text-[11px]">
                          <Activity className="size-3" />
                          À adapter
                        </Badge>
                      )}
                      {status === 'contraindicated' && (
                        <Badge className="border-state-danger/40 bg-state-danger/10 text-state-danger hover:bg-state-danger/20 gap-1 text-[11px]">
                          <ShieldAlert className="size-3" />
                          Contre-indiqué
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
