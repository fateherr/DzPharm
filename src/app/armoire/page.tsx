import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { ArmoireView } from '@/components/dzpharm/armoire/armoire-view'

export const metadata: Metadata = {
  title: 'Armoire à Pharmacie Familiale & Sécurité du Foyer · DzPharm',
  description:
    'Gestionnaire d’armoire à pharmacie domestique sécurisé et confidentiel : suivi des péremptions, profils familiaux, analyse croisée des interactions du foyer et trousse d’urgence.',
  openGraph: {
    title: 'Armoire Familiale · DzPharm',
    description: 'Sécurité médicamenteuse pour toute la famille, 100% local et sécurisé.',
    url: 'https://dzpharm.dz/armoire',
  },
}

export default function ArmoirePage() {
  return (
    <AppShell>
      <ArmoireView />
    </AppShell>
  )
}
