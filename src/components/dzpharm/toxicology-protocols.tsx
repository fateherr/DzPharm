'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  HeartPulse,
  Info,
  PhoneCall,
  Pill,
  Search,
  ShieldAlert,
  Skull,
  Stethoscope,
  Volume2,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

export interface ToxicologyProtocol {
  id: string
  title: string
  toxicAgent: string
  category: 'medicaments' | 'produits_menagers' | 'gaz' | 'agricole'
  dangerLevel: 'EXTREME' | 'ELEVE' | 'MODERE'
  toxicDose: string
  clinicalSigns: string[]
  firstFiveMinutes: string[]
  absoluteContraindications: string[]
  antidote: {
    name: string
    protocol: string
    alternative?: string
  }
  algerianContext: string
}

export const TOXICOLOGY_PROTOCOLS: ToxicologyProtocol[] = [
  {
    id: 'paracetamol',
    title: 'Surdosage Aigu en Paracétamol',
    toxicAgent: 'Paracétamol (Doliprane, Panadol, Efferalgan)',
    category: 'medicaments',
    dangerLevel: 'EXTREME',
    toxicDose: 'Adulte : > 8 à 10 g (ou > 125 mg/kg) en prise unique. Enfant : > 150 mg/kg.',
    clinicalSigns: [
      'H0-H24 : Asymptomatique ou simples nausées, vomissements, pâleur, sueurs.',
      'H24-H72 : Fausse accalmie clinique, mais cytolyse hépatique majeure (ALAT/ASAT > 1000 UI/L), douleur de l’hypochondre droit.',
      'H72-H96 : Insuffisance hépatocellulaire fulminante, ictère, encéphalopathie, coagulopathie (TP effondré), insuffisance rénale aiguë.',
    ],
    firstFiveMinutes: [
      'Noter immédiatement l’heure exacte de l’ingestion et estimer la dose totale ingérée.',
      'Charbon activé (50 g adulte, 1 g/kg enfant) si ingestion < 2 heures et patient conscient.',
      'Alerter le SAMU (14) ou le Centre Anti-Poison d’Alger (021 97 98 98).',
      'Hospitalisation systématique en soins intensifs pour dosage de la paracétamolémie à partir de H4.',
    ],
    absoluteContraindications: [
      'NE JAMAIS faire vomir le patient.',
      'NE PAS attendre l’apparition de symptômes hépatiques pour initier l’antidote.',
    ],
    antidote: {
      name: 'N-Acétylcystéine (NAC / Mucomyst / Fluimucil)',
      protocol:
        'Protocole IV classique 21h : Dose de charge 150 mg/kg dans 200 ml G5% en 60 min, puis 50 mg/kg dans 500 ml G5% en 4h, puis 100 mg/kg dans 1000 ml G5% en 16h. Efficacité maximale si débuté avant la 8ème heure.',
      alternative: 'Si IV impossible : Voie orale 140 mg/kg dose de charge puis 70 mg/kg toutes les 4h pendant 72h.',
    },
    algerianContext:
      'L’automédication par paracétamol est omniprésente en Algérie (doses cumulatives non déclarées sous plusieurs marques commerciales).',
  },
  {
    id: 'organophosphates',
    title: 'Intoxication aux Organophosphorés & Pesticides',
    toxicAgent: 'Insecticides organophosphorés & carbamates agricoles',
    category: 'agricole',
    dangerLevel: 'EXTREME',
    toxicDose: 'Variable selon la formulation. Extrêmement toxique par voie orale, cutanée ou respiratoire.',
    clinicalSigns: [
      'Syndrome muscarinique : Myosis serré punctiforme, hypersialorrhée, encombrement bronchique massif, bradycardie, sueurs profuses, diarrhée.',
      'Syndrome nicotinique : Fasciculations musculaires, crampes, faiblesse musculaire, tachycardie initiale, paralysie des muscles respiratoires.',
      'Syndrome central : Céphalées, confusion, convulsions, coma avec dépression respiratoire.',
    ],
    firstFiveMinutes: [
      'PROTÉGER LES SOIGNANTS : Port de gants et blouse (pénétration transcutanée majeure).',
      'Déshabiller entièrement le patient et laver abondamment la peau à l’eau et au savon.',
      'Liberté des voies aériennes, aspiration des sécrétions bronchiques abondantes, oxygénation au masque.',
      'Contacter immédiatement le SAMU (14) et le Centre Anti-Poison.',
    ],
    absoluteContraindications: [
      'NE JAMAIS faire vomir (risque d’inhalation de solvants pétroliers hydrocarbonés).',
      'NE PAS toucher le patient sans équipement de protection étanche.',
    ],
    antidote: {
      name: 'Sulfate d’Atropine + Pralidoxime (Contrathion)',
      protocol:
        'Atropine IV : 1 à 2 mg IV directe chez l’adulte (0.02 à 0.05 mg/kg enfant), renouvelée toutes les 5 à 10 minutes jusqu’à « atropinisation » (assèchement des sécrétions bronchiques, peau sèche, mydriase). Pralidoxime (Contrathion) : 30 mg/kg IV en 30 min pour réactiver l’acétylcholinestérase.',
    },
    algerianContext:
      'Urgence toxicologique fréquente dans les zones rurales et agricoles d’Algérie (Mitidja, Biskra, Sétif, Mascara).',
  },
  {
    id: 'co',
    title: 'Intoxication au Monoxyde de Carbone (CO)',
    toxicAgent: 'Monoxyde de carbone (gaz inodore et incolore)',
    category: 'gaz',
    dangerLevel: 'EXTREME',
    toxicDose: 'Gaz anoxiant asphyxiant. Affinité pour l’hémoglobine 230 fois supérieure à l’oxygène.',
    clinicalSigns: [
      'Intoxication légère : Céphalées bitemporales pulsatiles, nausées, vertiges, fatigue inexpliquée, impotence fonctionnelle des membres inférieurs.',
      'Intoxication modérée à sévère : Confusion, obnubilation, convulsions, troubles visuels, coma calme avec hypertonie.',
      'Coloration « rouge coccinelle » des téguments (tardive et inconstante). Risque d’arrêt cardio-respiratoire immédiat.',
    ],
    firstFiveMinutes: [
      'Évacuer immédiatement la victime de l’atmosphère viciée vers l’air libre (aérer la pièce).',
      'Oxygénothérapie à 100 % au masque à haute concentration avec réservoir (débit 12 à 15 L/min).',
      'Contacter la Protection Civile (1021 / 14) et le SAMU.',
      'Dépister systématiquement les autres occupants du logement ou de l’immeuble.',
    ],
    absoluteContraindications: [
      'NE PAS allumer d’interrupteur électrique ou de flamme dans la pièce polluée.',
      'NE PAS arrêter l’oxygène précocement même si la victime semble récupérer.',
    ],
    antidote: {
      name: 'Oxygène normobare 100 % ou Caisson hyperbare',
      protocol:
        'O2 normobare 100 % pendant 6 à 12 heures consécutives. Caisson hyperbare (OHB) indiqué en urgence en cas de : perte de connaissance initiale, femme enceinte (fœtotoxicité majeure), signes neurologiques ou anomalie ECG.',
    },
    algerianContext:
      'Fléau national hivernal causant des centaines de décès chaque année en Algérie (appareils de chauffage défectueux, chauffe-eaux sans évacuation).',
  },
  {
    id: 'opioids',
    title: 'Surdosage Aigu en Opioïdes / Stupéfiants',
    toxicAgent: 'Morphine, Fentanyl, Méthadone, Tramadol à forte dose, Héroïne',
    category: 'medicaments',
    dangerLevel: 'EXTREME',
    toxicDose: 'Variable selon tolérance. Dépression respiratoire dès dépassement posologique.',
    clinicalSigns: [
      'Triade toxidromique caractéristique : Dépression respiratoire (fréquence < 10/min) + Myosis punctiforme bilatéral + Coma calme.',
      'Cyanose, encombrement bronchique, hypotension, bradycardie.',
    ],
    firstFiveMinutes: [
      'Ventilation immédiate au ballon autoremplisseur (Ambu) avec O2 100 % si bradypnée sévère ou apnée.',
      'Appel SAMU 14.',
      'Administration immédiate de l’antidote par voie IV ou intra-nasale.',
    ],
    absoluteContraindications: [
      'NE PAS administrer de surdose brutale de naloxone chez le toxicomane sevré (risque de syndrome de sevrage violent avec convulsions et crise hypertensive).',
    ],
    antidote: {
      name: 'Chlorhydrate de Naloxone (Narcan / Naloxone Aguettant)',
      protocol:
        'Titration IV progressive : 0.04 à 0.1 mg IV toutes les 2 minutes jusqu’à reprise d’une fréquence respiratoire ≥ 12/min. Surveiller la durée d’action (30-45 min), bien plus courte que celle des opioïdes (risque de rechute en coma).',
      alternative: 'Spray intra-nasal (Nyxoid) 1.8 mg dans une narine si accès veineux impossible.',
    },
    algerianContext:
      'Surdosages accidentels fréquents chez les patients cancéreux traités par patches de Fentanyl ou prescriptions mal adaptées de Tramadol/Morphine.',
  },
  {
    id: 'beta_blockers',
    title: 'Surdosage en Bêta-Bloquants',
    toxicAgent: 'Propranolol, Aténolol, Bisoprolol, Carvédilol, Métoprolol',
    category: 'medicaments',
    dangerLevel: 'EXTREME',
    toxicDose: 'Dépassement de la dose quotidienne maximale (ex : > 160-240 mg propranolol).',
    clinicalSigns: [
      'Cardiovasculaire : Bradycardie sinusale sévère (< 40 bpm), bloc auriculo-ventriculaire (BAV), hypotension artérielle majeure, choc cardiogénique.',
      'Neurologique (molécules lipophiles type propranolol) : Coma, convulsions précoces.',
      'Métabolique : Hypoglycémie sévère (surtout chez l’enfant), bronchospasme.',
    ],
    firstFiveMinutes: [
      'Pose de voie veineuse de gros calibre, monitoring ECG continu.',
      'Oxygénothérapie, position allongée jambes surélevées en cas d’hypotension.',
      'Appel d’urgence SAMU (14) pour transfert en réanimation.',
    ],
    absoluteContraindications: [
      'NE JAMAIS faire vomir (risque d’arrêt cardiaque réflexe vagal foudroyant).',
    ],
    antidote: {
      name: 'Glucagon + Insuline-Glucose à forte dose (HIET)',
      protocol:
        'Atropine 1 mg IV (inefficace seule mais tentée). Glucagon IV : Bolus de 5 à 10 mg en 1 min, puis perfusion de 2 à 5 mg/h. Protocole d’insulinothérapie euglycémique à haute dose (HIET) en unité de soins intensifs.',
    },
    algerianContext:
      'Molécules couramment stockées dans les armoires familiales algériennes pour HTA et cardiopathies.',
  },
  {
    id: 'caustics',
    title: 'Ingestion de Produits Caustiques & Eau de Javel',
    toxicAgent: 'Eau de Javel concentrée, Déboucheurs (Soude caustique NaOH), Acide chlorhydrique (Esprit de sel)',
    category: 'produits_menagers',
    dangerLevel: 'EXTREME',
    toxicDose: 'Toute quantité de base forte (pH > 11.5) ou d’acide fort (pH < 2) entraîne des brûlures chimiques immédiates.',
    clinicalSigns: [
      'Douleurs buccopharyngées intenses, hypersialorrhée avec impossibilité de déglutir la salive.',
      'Brûlures blanchâtres ou nécrotiques de la cavité buccale, dysphonie, stridor respiratoire (œdème laryngé).',
      'Douleurs thoraciques ou abdominales aiguës signalant une perforation œsophagienne ou gastrique.',
    ],
    firstFiveMinutes: [
      'Mettre le patient STRICTEMENT À JEUN (zéro ingestion solide ou liquide).',
      'Laver abondamment le visage et les lèvres à l’eau tiède si projection externe.',
      'Garder le patient en position demi-assise pour éviter les fausses routes.',
      'Appel immédiat du SAMU (14) et de la Protection Civile (1021 / 14).',
      'Rapporter le récipient d’origine pour identification précise de la concentration.',
    ],
    absoluteContraindications: [
      'NE JAMAIS FAIRE VOMIR (deuxième brûlure caustique à la remontée + risque de rupture de l’œsophage).',
      'NE JAMAIS DONNER À BOIRE DE LAIT OU D’EAU (risque de réaction thermique exothermique et de fausse route).',
      'NE JAMAIS TENTER DE NEUTRALISER par un acide ou une base.',
      'NE JAMAIS POSER DE SONDE GASTRIQUE à l’aveugle.',
    ],
    antidote: {
      name: 'Aucun antidote chimique — Prise en charge chirurgicale & fibroscopique',
      protocol:
        'Fibroscopie œsogastrique d’urgence (FOGD) entre la 6ème et la 24ème heure pour stadification selon la classification de Zargar. Antalgiques majeurs IV et protection muqueuse.',
    },
    algerianContext:
      'Accident pédiatrique dramatique extrêmement fréquent en Algérie suite au reconditionnement domestique de produits d’entretien dans des bouteilles d’eau minérale ou de soda.',
  },
]

export function ToxicologyProtocols() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredProtocols = TOXICOLOGY_PROTOCOLS.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.toxicAgent.toLowerCase().includes(q) ||
      p.antidote.name.toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (selectedCategory === 'all') return true
    return p.category === selectedCategory
  })

  return (
    <div className="space-y-6">
      {/* Bannière d'urgence avec numéros d'appel direct Algérie */}
      <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/15 via-red-500/10 to-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow">
              <Skull className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Urgences Toxicologiques · Protocoles « Premières 5 Minutes »
              </h2>
              <p className="text-xs text-muted-foreground">
                Arbres décisionnels d’urgence immédiate pour intoxications aiguës en officine et milieu de soins.
              </p>
            </div>
          </div>

          {/* Raccourcis d'appel d'urgence */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="tel:021979898"
              className="flex items-center gap-1.5 rounded-lg border border-red-600/40 bg-background px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm transition-transform active:scale-95 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <PhoneCall className="size-3.5" />
              CAPM Alger : 021 97 98 98
            </a>

            <a
              href="tel:14"
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow transition-transform active:scale-95 hover:bg-red-700"
            >
              <PhoneCall className="size-3.5" />
              SAMU 14
            </a>

            <a
              href="tel:1021"
              className="flex items-center gap-1.5 rounded-lg border border-muted bg-background px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <PhoneCall className="size-3.5" />
              Protection Civile 1021
            </a>
          </div>
        </div>

        {/* Indicateur de disponibilité hors-ligne */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t pt-2">
          <CheckCircle2 className="size-3 text-state-safe" />
          <span>Protocoles disponibles hors-ligne à tout moment (cache local certifié).</span>
        </div>
      </div>

      {/* Barre de recherche et filtres de catégorie */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher toxique, produit, antidote (ex : paracétamol, javel, naloxone)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="h-7 text-xs px-2.5"
          >
            Tous ({TOXICOLOGY_PROTOCOLS.length})
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'medicaments' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('medicaments')}
            className="h-7 text-xs px-2.5"
          >
            Médicaments
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'gaz' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('gaz')}
            className="h-7 text-xs px-2.5"
          >
            Gaz (CO)
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'produits_menagers' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('produits_menagers')}
            className="h-7 text-xs px-2.5"
          >
            Caustiques
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'agricole' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('agricole')}
            className="h-7 text-xs px-2.5"
          >
            Pesticides
          </Button>
        </div>
      </div>

      {/* Accordéon des Protocoles */}
      <div className="space-y-4">
        {filteredProtocols.map((p) => (
          <Card key={p.id} className="overflow-hidden border-2 transition-all hover:border-primary/40">
            <CardHeader className="p-4 pb-2 bg-muted/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 font-bold">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      {p.title}
                    </CardTitle>
                    <p className="text-xs font-medium text-muted-foreground">{p.toxicAgent}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-500/40 text-red-600 bg-red-500/5 text-[10px] font-bold">
                    {p.dangerLevel}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Dose toxique : {p.toxicDose}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-4">
              {/* Grille : Premiers gestes vs Ce qu'il ne faut PAS faire */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. Les 5 Premières minutes */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    GESTES D’URGENCE (&lt; 5 MINUTES)
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/90 list-disc pl-4">
                    {p.firstFiveMinutes.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Ce qu'il ne faut JAMAIS faire (Red Flags) */}
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3.5 space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                    <XCircle className="size-4" />
                    INTERDICTIONS FORMELLES (DANGER)
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/90 list-disc pl-4">
                    {p.absoluteContraindications.map((contra, idx) => (
                      <li key={idx} className="font-semibold text-red-600 dark:text-red-400 leading-relaxed">
                        {contra}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Antidote & Posologie */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Stethoscope className="size-4" />
                    ANTIDOTE DE RÉFÉRENCE : {p.antidote.name}
                  </h4>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Protocole Hospitalier / Officinal
                  </span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-mono">
                  {p.antidote.protocol}
                </p>
                {p.antidote.alternative && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Alternative : {p.antidote.alternative}
                  </p>
                )}
              </div>

              {/* Signes cliniques et spécificité algérienne */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-muted-foreground pt-1 border-t">
                <div>
                  <span className="font-semibold text-foreground">Signes cliniques : </span>
                  {p.clinicalSigns.join(' — ')}
                </div>
              </div>

              <div className="rounded bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground italic">
                <span className="font-semibold not-italic text-foreground">Contexte épidémiologique algérien : </span>
                {p.algerianContext}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
