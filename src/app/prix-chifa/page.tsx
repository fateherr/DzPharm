import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { CatalogView } from '@/components/dzpharm/catalog-view'

export const metadata: Metadata = {
  title: 'Catalogue des Prix PPA & Remboursement Chifa · DzPharm',
  description:
    'Catalogue des prix publics en officine (PPA), tarifs de référence Chifa et médicaments remboursables CNAS / CASNOS en Algérie.',
  openGraph: {
    title: 'Catalogue des Prix PPA & Chifa · DzPharm',
    description: 'Tarifs officiels, comparateur de génériques et simulation de remboursement Chifa.',
    url: 'https://dzpharm.dz/prix-chifa',
  },
}

export default function PrixChifaPage() {
  return (
    <AppShell>
      <CatalogView />
    </AppShell>
  )
}
