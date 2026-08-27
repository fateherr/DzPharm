'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Baby, CreditCard } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PediatricCalculator } from './pediatric-calculator'
import { ChifaSimulator } from './chifa-simulator'

export function ToolsView() {
  const [tab, setTab] = useState('pediatrie')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Outils cliniques
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculateurs d&apos;aide à la dispensation adaptés aux spécificités algériennes —
          posologies pédiatriques pondérées et estimation du reste à charge Chifa.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-12 w-full justify-start gap-1 overflow-x-auto rounded-xl p-1.5 sm:w-auto">
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
      </Tabs>
    </div>
  )
}
