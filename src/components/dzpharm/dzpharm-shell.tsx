'use client'

import { useEffect } from 'react'
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
import { BarcodeScannerModal } from '@/components/dzpharm/barcode-scanner'
import { AdminBarcodeModal } from '@/components/dzpharm/admin-barcode-modal'
import { MobileBottomNav } from '@/components/dzpharm/mobile-bottom-nav'
import { useDzPharm, type ViewId } from '@/components/dzpharm/store'

/**
 * P0-01 — DzPharm shell (extracted from src/app/page.tsx).
 * The shell renders the full app (EmergencyBar + Header + active view + Footer
 * + global modals). Accepts an optional `initialView` so deep-link routes
 * (e.g. /repertoire) can pre-set the Zustand view on mount.
 *
 * This extraction is ADDITIVE (no behaviour change to /). It enables the 4
 * stub routes registered in src/app/{repertoire,prix-chifa,interactions,copilote}/page.tsx
 * to share the same shell and set their view via the URL.
 */
export function DzPharmShell({ initialView }: { initialView?: ViewId }) {
  const view = useDzPharm((s) => s.view)
  const setView = useDzPharm((s) => s.setView)

  // Deep-link: when a stub route mounts with initialView, sync the store.
  useEffect(() => {
    if (initialView && initialView !== view) {
      setView(initialView)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView])

  return (
    <div className="flex min-h-screen flex-col bg-background w-full max-w-full overflow-x-hidden">
      {/* Lien d'évitement accessible pour les utilisateurs clavier / lecteurs d'écran */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Aller au contenu principal
      </a>

      {/* En-tête supérieur unifié (Urgences + Navigation principale) */}
      <div className="sticky top-0 z-40 w-full max-w-full print:hidden">
        <EmergencyBar />
        <Header />
      </div>
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
      {/* Scanner Code Barre / CBM (Phase 3.6) */}
      <BarcodeScannerModal />
      {/* Console Administrateur Codes-Barres Originaux */}
      <AdminBarcodeModal />
      {/* Barre de navigation basse ergonomique mobile */}
      <MobileBottomNav />
    </div>
  )
}
