'use client'

import { DzPharmShell } from '@/components/dzpharm/dzpharm-shell'

/**
 * P0-01 — /prix-chifa deep-link route (foundation). View = 'catalogue'.
 * @see src/app/repertoire/page.tsx for the migration notes.
 */
export default function PrixChifaPage() {
  return <DzPharmShell initialView="catalogue" />
}
