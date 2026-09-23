'use client'

import { DzPharmShell } from '@/components/dzpharm/dzpharm-shell'

/**
 * P0-01 — /interactions deep-link route (foundation). View = 'interactions'.
 * @see src/app/repertoire/page.tsx for the migration notes.
 */
export default function InteractionsPage() {
  return <DzPharmShell initialView="interactions" />
}
