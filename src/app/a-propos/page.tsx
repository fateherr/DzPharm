import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { AboutView } from '@/components/dzpharm/about-view'

import { PLATFORM_STATS, formatAmmCount } from '@/lib/constants/stats'

export const metadata: Metadata = {
  title: 'À Propos, Sources Officielles & Méthodologie · DzPharm',
  description:
    `Présentation de DzPharm : méthodologie d’agrégation des ${formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} AMM officielles, sources institutionnelles algériennes (MSPRH, CNAS, ANSM, CRAT) et engagements déontologiques.`,
  openGraph: {
    title: 'À Propos de DzPharm · Méthodologie & Sources',
    description: 'Plateforme indépendante de référence pharmaceutique algérienne.',
    url: 'https://dzpharm.dz/a-propos',
  },
}

export default function AProposPage() {
  return (
    <AppShell>
      <AboutView />
    </AppShell>
  )
}
