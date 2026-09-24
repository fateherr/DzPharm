import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { LibraryView } from '@/components/dzpharm/library-view'

export const metadata: Metadata = {
  title: 'Bibliothèque Clinique & Monographies Officielles · DzPharm',
  description:
    'Explorateur des 911 monographies cliniques détaillées issues des 24 fascicules de pharmacologie algériens : indications, posologies, contre-indications et pharmacocinétique.',
  openGraph: {
    title: 'Bibliothèque Clinique · DzPharm',
    description: 'Monographies RCP complètes et données cliniques approfondies.',
    url: 'https://dzpharm.dz/bibliotheque',
  },
}

export default function BibliothequePage() {
  return (
    <AppShell>
      <LibraryView />
    </AppShell>
  )
}
