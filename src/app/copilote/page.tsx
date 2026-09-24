import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { CopilotView } from '@/components/dzpharm/copilot-view'

export const metadata: Metadata = {
  title: 'Copilote IA Pharmacie Clinique · DzPharm',
  description:
    'Assistant clinique intelligent pour pharmaciens et médecins : requêtes en français, arabe et darija, vérification de posologies, équivalences et protocoles.',
  openGraph: {
    title: 'Copilote IA Pharmacie Clinique · DzPharm',
    description: 'Intelligence artificielle clinique spécialisée dans la pharmacopée algérienne.',
    url: 'https://dzpharm.dz/copilote',
  },
}

export default function CopilotePage() {
  return (
    <AppShell>
      <CopilotView />
    </AppShell>
  )
}
