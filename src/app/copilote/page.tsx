'use client'

import { DzPharmShell } from '@/components/dzpharm/dzpharm-shell'

/**
 * P0-01 — /copilote deep-link route (foundation). View = 'copilote'.
 * @see src/app/repertoire/page.tsx for the migration notes.
 */
export default function CopilotePage() {
  return <DzPharmShell initialView="copilote" />
}
