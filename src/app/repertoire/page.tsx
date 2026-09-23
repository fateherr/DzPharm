'use client'

import { DzPharmShell } from '@/components/dzpharm/dzpharm-shell'

/**
 * P0-01 — /repertoire deep-link route (foundation).
 * Renders the DzPharm shell with the view pre-set to 'repertoire' (the drug
 * directory). This is the additive stub for the 2-week routing migration; the
 * full URL-driven state (URL params for filters, intercepting medication modal)
 * is deferred to a follow-up sprint — flagged NEEDS HUMAN REVIEW in worklog.
 *
 * Works whether NEXT_PUBLIC_FEATURE_APP_ROUTER is on or off. When the flag is
 * off, the header still navigates via setView() (legacy SPA), and this route
 * is reachable only via direct URL / Cmd-K hotkey — it does not break anything.
 */
export default function RepertoirePage() {
  return <DzPharmShell initialView="repertoire" />
}
