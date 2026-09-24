import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { ToolsView } from '@/components/dzpharm/tools-view'

export const metadata: Metadata = {
  title: 'Hub d’Outils Médicaux & Calculateurs Cliniques · DzPharm',
  description:
    'Suite d’outils cliniques pour la pratique médicale et pharmaceutique : adaptation rénale (Cockcroft-Gault / MDRD), posologie pédiatrique, vérificateur grossesse CRAT, adaptateur Ramadan et pharmacies de garde.',
  openGraph: {
    title: 'Outils Médicaux & Calculateurs · DzPharm',
    description: 'Calculateurs de posologies, adaptation rénale et outils d’aide à la dispensation.',
    url: 'https://dzpharm.dz/outils',
  },
}

export default function OutilsPage() {
  return (
    <AppShell>
      <ToolsView />
    </AppShell>
  )
}
