'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from '@/components/dzpharm/app-shell'
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
import { useDzPharm } from '@/components/dzpharm/store'

export default function Page() {
  const view = useDzPharm((s) => s.view)

  return (
    <AppShell>
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
    </AppShell>
  )
}
