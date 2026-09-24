import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { DirectoryView } from '@/components/dzpharm/directory-view'

import { PLATFORM_STATS, formatAmmCount } from '@/lib/constants/stats'

export const metadata: Metadata = {
  title: `Répertoire Officiel des ${formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} Médicaments AMM · DzPharm`,
  description:
    `Référentiel national des médicaments enregistrés en Algérie : ${formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} AMM, prix PPA, DCI, laboratoires, formes galéniques, statuts et alertes de retrait.`,
  openGraph: {
    title: 'Répertoire des Médicaments · DzPharm',
    description: 'Nomenclature officielle des médicaments enregistrés en Algérie.',
    url: 'https://dzpharm.dz/repertoire',
  },
}

export default function RepertoirePage() {
  return (
    <AppShell>
      <DirectoryView />
    </AppShell>
  )
}
