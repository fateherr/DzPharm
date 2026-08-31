'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Baby,
  CreditCard,
  Droplets,
  GitCompareArrows,
  HeartPulse,
  MapPin,
  Moon,
  PiggyBank,
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

export function ToolsView() {
  const [tab, setTab] = useState('pediatrie')

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

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="scroll-thin h-12 w-full justify-start gap-1 overflow-x-auto rounded-xl p-1.5 sm:w-auto">
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
        </TabsList>

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
      </Tabs>
    </div>
  )
}
