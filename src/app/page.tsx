'use client'

import { DzPharmShell } from '@/components/dzpharm/dzpharm-shell'

/**
 * P0-01 — Root route renders the shared DzPharm shell.
 * The shell was extracted from this file (additive, no behaviour change).
 * The 4 deep-link stub routes (/repertoire, /prix-chifa, /interactions, /copilote)
 * reuse the same shell with an `initialView` prop.
 */
export default function Page() {
  return <DzPharmShell />
}
