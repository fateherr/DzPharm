'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Baby,
  CalendarHeart,
  CreditCard,
  Droplets,
  FileSpreadsheet,
  GitCompareArrows,
  HeartPulse,
  Languages,
  Lock,
  MapPin,
  Moon,
  PiggyBank,
  Receipt,
  Scale,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrdonnanceCheck } from './ordonnance-check'
import { PediatricCalculator } from './pediatric-calculator'
import { ChifaSimulator } from './chifa-simulator'
import { RamadanAdapter } from './ramadan-adapter'
import { DrugComparator } from './drug-comparator'
import { RenalCalculator } from './renal-calculator'
import { PregnancyChecker } from './pregnancy-checker'
import { ShortageCenter } from './shortage-center'
import { PharmacyLocator } from './pharmacy-locator'
import { GenericSimulator } from './generic-simulator'
import { PrescriptionTranslator } from './prescription-translator'
import { FormularySubstitutor } from './formulary-substitutor'
import { HepaticCalculator } from './hepatic-calculator'
import { WarfarinInrCalculator } from './warfarin-inr-calculator'
import { ToxicologyProtocols } from './toxicology-protocols'
import { CounterDispensingWorkflow } from './counter-dispensing'
import { PictographicPosologyGenerator } from './pictographic-posology'
import { CompatibilityChecker } from './compatibility-checker'
import { PsychotropesCoffre } from './psychotropes-coffre'
import { HealthCalendar } from './health-calendar'
import { useDzPharm } from './store'

export interface ToolsViewProps {
  initialTab?: string
}

export function ToolsView({ initialTab }: ToolsViewProps = {}) {
  const toolsTab = useDzPharm((s) => s.toolsTab)
  const clearToolsTab = useDzPharm((s) => s.clearToolsTab)
  const [tab, setTab] = useState(initialTab ?? toolsTab ?? 'pediatrie')

  // Synchronisation avec l'onglet initial issu de la route /outils/[tool]
  useEffect(() => {
    if (initialTab) {
      setTab(initialTab)
    }
  }, [initialTab])

  // When the armoire sends a hub shortcut, auto-select that tab and clear the store flag
  useEffect(() => {
    if (toolsTab) {
      setTab(toolsTab)
      clearToolsTab()
    }
  }, [toolsTab, clearToolsTab])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/outils')) {
      const url = new URL(window.location.href)
      url.pathname = `/outils/${newTab}`
      url.search = ''
      window.history.replaceState(null, '', url.toString())
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Outils cliniques
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculateurs et aides à la dispensation adaptés aux spécificités algériennes —
          posologies pédiatriques, fonction rénale, grossesse &amp; allaitement,
          remboursement Chifa, adaptation Ramadan et comparateur de médicaments.
        </p>
      </div>

      {/* Vérification d'ordonnance — outil phare en pleine largeur (audit 4.3) */}
      <motion.div
        className="mb-6 w-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <OrdonnanceCheck />
      </motion.div>

      <Tabs value={tab} onValueChange={handleTabChange} className="gap-6">
        <TabsList className="scroll-thin h-12 w-full justify-start gap-1 overflow-x-auto rounded-xl p-1.5 sm:w-auto">
          <TabsTrigger
            value="comptoir"
            className="h-9 gap-2 px-4 text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 data-[state=active]:bg-emerald-600 data-[state=active]:text-white shadow-xs"
          >
            <Receipt className="size-4" aria-hidden />
            Comptoir Express (&lt; 15s)
          </TabsTrigger>
          <TabsTrigger
            value="picto"
            className="h-9 gap-2 px-4 text-sm font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 data-[state=active]:bg-amber-600 data-[state=active]:text-white shadow-xs"
          >
            <Sparkles className="size-4" aria-hidden />
            Posologie Pictographique
          </TabsTrigger>
          <TabsTrigger
            value="pediatrie"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Baby className="size-4" aria-hidden />
            Posologies pédiatriques
          </TabsTrigger>
          <TabsTrigger
            value="chifa"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <CreditCard className="size-4" aria-hidden />
            Simulateur Chifa
          </TabsTrigger>
          <TabsTrigger
            value="renal"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Droplets className="size-4" aria-hidden />
            Fonction rénale
          </TabsTrigger>
          <TabsTrigger
            value="hepatique"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Activity className="size-4" aria-hidden />
            Child-Pugh (Foie)
          </TabsTrigger>
          <TabsTrigger
            value="avk-inr"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <HeartPulse className="size-4" aria-hidden />
            AVK &amp; Cible INR
          </TabsTrigger>
          <TabsTrigger
            value="antidotes"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <TriangleAlert className="size-4" aria-hidden />
            Urgences &amp; Antidotes
          </TabsTrigger>
          <TabsTrigger
            value="grossesse"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <HeartPulse className="size-4" aria-hidden />
            Grossesse &amp; allaitement
          </TabsTrigger>
          <TabsTrigger
            value="ramadan"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Moon className="size-4" aria-hidden />
            Adaptateur Ramadan
          </TabsTrigger>
          <TabsTrigger
            value="halal"
            className="h-9 gap-2 px-4 text-sm font-semibold text-teal-800 dark:text-teal-300 bg-teal-500/10 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-xs"
          >
            <Scale className="size-4" aria-hidden />
            Compatibilité Halal
          </TabsTrigger>
          <TabsTrigger
            value="comparateur"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <GitCompareArrows className="size-4" aria-hidden />
            Comparateur
          </TabsTrigger>
          <TabsTrigger
            value="economies"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <PiggyBank className="size-4" aria-hidden />
            Économies génériques
          </TabsTrigger>
          <TabsTrigger
            value="penuries"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <TriangleAlert className="size-4" aria-hidden />
            Pénuries
          </TabsTrigger>
          <TabsTrigger
            value="pharmacies"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <MapPin className="size-4" aria-hidden />
            Pharmacies de garde
          </TabsTrigger>
          <TabsTrigger
            value="traduction"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm font-semibold text-primary"
          >
            <Languages className="size-4 text-primary" aria-hidden />
            Traduction FR→AR (F-05)
          </TabsTrigger>
          <TabsTrigger
            value="livret"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm font-semibold text-primary"
          >
            <FileSpreadsheet className="size-4 text-primary" aria-hidden />
            Livret &amp; Substitutions (F-04)
          </TabsTrigger>
          <TabsTrigger
            value="calendrier"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <CalendarHeart className="size-4" aria-hidden />
            Calendrier santé
          </TabsTrigger>
          <TabsTrigger
            value="psychotropes"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Lock className="size-4" aria-hidden />
            Substances contrôlées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comptoir" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CounterDispensingWorkflow />
          </motion.div>
        </TabsContent>

        <TabsContent value="picto" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PictographicPosologyGenerator />
          </motion.div>
        </TabsContent>

        <TabsContent value="pediatrie" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PediatricCalculator />
          </motion.div>
        </TabsContent>

        <TabsContent value="chifa" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChifaSimulator />
          </motion.div>
        </TabsContent>

        <TabsContent value="renal" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RenalCalculator />
          </motion.div>
        </TabsContent>

        <TabsContent value="hepatique" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <HepaticCalculator />
          </motion.div>
        </TabsContent>

        <TabsContent value="avk-inr" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WarfarinInrCalculator />
          </motion.div>
        </TabsContent>

        <TabsContent value="antidotes" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ToxicologyProtocols />
          </motion.div>
        </TabsContent>

        <TabsContent value="grossesse" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PregnancyChecker />
          </motion.div>
        </TabsContent>

        <TabsContent value="ramadan" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RamadanAdapter />
          </motion.div>
        </TabsContent>

        <TabsContent value="halal" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CompatibilityChecker />
          </motion.div>
        </TabsContent>

        <TabsContent value="comparateur" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <DrugComparator />
          </motion.div>
        </TabsContent>

        <TabsContent value="economies" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <GenericSimulator />
          </motion.div>
        </TabsContent>

        <TabsContent value="penuries" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ShortageCenter />
          </motion.div>
        </TabsContent>

        <TabsContent value="pharmacies" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PharmacyLocator />
          </motion.div>
        </TabsContent>

        <TabsContent value="traduction" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PrescriptionTranslator />
          </motion.div>
        </TabsContent>

        <TabsContent value="livret" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <FormularySubstitutor />
          </motion.div>
        </TabsContent>

        <TabsContent value="calendrier" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <HealthCalendar />
          </motion.div>
        </TabsContent>

        <TabsContent value="psychotropes" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <PsychotropesCoffre />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
