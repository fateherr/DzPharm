'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { EmergencyBar } from '@/components/dzpharm/emergency-bar'
import { Header } from '@/components/dzpharm/header'
import { Footer } from '@/components/dzpharm/footer'
import { HomeView } from '@/components/dzpharm/home-view'
import { DirectoryView } from '@/components/dzpharm/directory-view'
import { CatalogView } from '@/components/dzpharm/catalog-view'
import { LibraryView } from '@/components/dzpharm/library-view'
import { InteractionsView } from '@/components/dzpharm/interactions-view'
import { ArmoireView } from '@/components/dzpharm/armoire/armoire-view'
import { CopilotView } from '@/components/dzpharm/copilot-view'
import { ToolsView } from '@/components/dzpharm/tools-view'
import { StatsView } from '@/components/dzpharm/stats-view'
import { AboutView } from '@/components/dzpharm/about-view'
import { DrugSheet } from '@/components/dzpharm/drug-sheet'
import { CommandPalette } from '@/components/dzpharm/command-palette'
import { MobileBottomNav } from '@/components/dzpharm/mobile-bottom-nav'
import { useDzPharm } from '@/components/dzpharm/store'

export default function Page() {
  const view = useDzPharm((s) => s.view)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <EmergencyBar />
      <Header />
      <main id="contenu" className="flex-1 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {view === 'accueil' ? <HomeView /> : null}
            {view === 'repertoire' ? <DirectoryView /> : null}
            {view === 'catalogue' ? <CatalogView /> : null}
            {view === 'bibliotheque' ? <LibraryView /> : null}
            {view === 'interactions' ? <InteractionsView /> : null}
            {view === 'armoire' ? <ArmoireView /> : null}
            {view === 'outils' ? <ToolsView /> : null}
            {view === 'copilote' ? <CopilotView /> : null}
            {view === 'stats' ? <StatsView /> : null}
            {view === 'apropos' ? <AboutView /> : null}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {/* Fiche médicament — accessible depuis toutes les vues */}
      <DrugSheet />
      {/* Palette de commande universelle (Cmd+K) */}
      <CommandPalette />
      {/* Barre de navigation basse ergonomique mobile */}
      <MobileBottomNav />
    </div>
  )
}
