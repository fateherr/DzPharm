import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { InteractionsView } from '@/components/dzpharm/interactions-view'

export const metadata: Metadata = {
  title: 'Vérificateur d’Interactions Médicamenteuses & Matrice Heatmap · DzPharm',
  description:
    'Contrôle clinique automatisé des interactions médicamenteuses : détection par DCI, matrice heatmap N×N, niveaux de sévérité (CI, Majeure, Modérée, Mineure) et recommandations ANSM.',
  openGraph: {
    title: 'Vérificateur d’Interactions Médicamenteuses · DzPharm',
    description: 'Analyse instantanée des associations à risque et matrice d’interactions.',
    url: 'https://dzpharm.dz/interactions',
  },
}

export default function InteractionsPage() {
  return (
    <AppShell>
      <InteractionsView />
    </AppShell>
  )
}
