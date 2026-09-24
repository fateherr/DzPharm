import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { StatsView } from '@/components/dzpharm/stats-view'

export const metadata: Metadata = {
  title: 'Observatoire & Statistiques du Marché Pharmaceutique Algérien · DzPharm',
  description:
    'Données statistiques macroéconomiques et épidémiologiques : part de la production nationale vs importations, répartition par classe thérapeutique, retraits de marché et laboratoires leaders.',
  openGraph: {
    title: 'Statistiques du Marché Pharmaceutique Algérien · DzPharm',
    description: 'Tableau de bord macro de la nomenclature et du marché pharmaceutique.',
    url: 'https://dzpharm.dz/stats',
  },
}

export default function StatsPage() {
  return (
    <AppShell>
      <StatsView />
    </AppShell>
  )
}
