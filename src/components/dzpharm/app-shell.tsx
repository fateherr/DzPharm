'use client'

import React from 'react'
import { EmergencyBar } from '@/components/dzpharm/emergency-bar'
import { Header } from '@/components/dzpharm/header'
import { Footer } from '@/components/dzpharm/footer'
import { DrugSheet } from '@/components/dzpharm/drug-sheet'
import { CommandPalette } from '@/components/dzpharm/command-palette'
import { BarcodeScannerModal } from '@/components/dzpharm/barcode-scanner'
import { AdminBarcodeModal } from '@/components/dzpharm/admin-barcode-modal'
import { MobileBottomNav } from '@/components/dzpharm/mobile-bottom-nav'
import { ShortcutsModal } from '@/components/dzpharm/shortcuts-modal'
import { ShiftContextBar } from '@/components/dzpharm/shift-context-bar'
import { AccessibilitySync } from '@/components/dzpharm/accessibility-sync'

interface AppShellProps {
  children: React.ReactNode
}

/**
 * AppShell unifié pour DzPharm (P0-01 Architecture de Routage)
 * Fournit la barre d'urgence, l'en-tête, la navigation mobile,
 * les modales globales et le pied de page à toutes les routes.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background w-full max-w-full overflow-x-hidden">
      <AccessibilitySync />
      {/* Lien d'évitement accessible pour les utilisateurs clavier / lecteurs d'écran */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Aller au contenu principal
      </a>

      {/* En-tête supérieur unifié (Urgences + Navigation principale + Contexte Patient Épinglé) */}
      <div className="sticky top-0 z-40 w-full max-w-full print:hidden">
        <EmergencyBar />
        <Header />
        <ShiftContextBar />
      </div>

      <main id="contenu" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      <Footer />

      {/* Fiche médicament latérale — accessible depuis toutes les vues */}
      <DrugSheet />

      {/* Palette de commande universelle (Cmd+K) */}
      <CommandPalette />

      {/* Scanner Code Barre / CBM */}
      <BarcodeScannerModal />

      {/* Console Administrateur Codes-Barres Originaux */}
      <AdminBarcodeModal />

      {/* Barre de navigation basse ergonomique mobile */}
      <MobileBottomNav />

      {/* Guide des raccourcis clavier & densité (P2-08 & P2-39) */}
      <ShortcutsModal />
    </div>
  )
}
