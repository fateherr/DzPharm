'use client'

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDzPharm } from '@/components/dzpharm/store'
import { APP_ROUTER_ENABLED } from '@/lib/route-map'

/**
 * P1-12 — Persist the interactions drug list in URL params (shareable links).
 * Audit: docs/audit/06_tool_deep_dives/DzPharm_Tool02_StateManagement_TechnicalDesign.pdf §05
 *
 * Two layers:
 * 1. ALWAYS: the Zustand `basket` is now in the persist `partialize` list
 *    (store.ts) — survives refresh via localStorage, 24h TTL implicit.
 * 2. WHEN the App Router flag is ON: this hook ALSO syncs the basket to
 *    `?drugs=8421,1523` in the URL search params. This unlocks shareable
 *    links (email a colleague a specific drug pair) + SEO.
 *
 * The hook is additive — it reads the URL on mount (hydrating the basket
 * if the URL has `?drugs=` and the basket is empty) and writes to the URL
 * whenever the basket changes. It NEVER replaces the Zustand basket as the
 * source of truth; the URL is a secondary projection.
 *
 * Feature flag: NEXT_PUBLIC_FEATURE_INTERACTIONS_URL (gated on
 * NEXT_PUBLIC_FEATURE_APP_ROUTER). When off, only layer 1 (localStorage
 * persist) is active.
 */
const DRUGS_PARAM = 'drugs'
const INTERACTIONS_URL_FLAG =
  process.env.NEXT_PUBLIC_FEATURE_INTERACTIONS_URL === 'true'

export function useInteractionListState() {
  const basket = useDzPharm((s) => s.basket)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const clearBasket = useDzPharm((s) => s.clearBasket)
  const setBasket = useDzPharm((s) => s.setBasket)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const urlEnabled = APP_ROUTER_ENABLED && INTERACTIONS_URL_FLAG

  // On mount (or when searchParams change): if the URL has ?drugs= and the
  // basket is empty, hydrate the basket from the URL. This is the "open a
  // shared link" path.
  useEffect(() => {
    if (!urlEnabled) return
    const drugsParam = searchParams.get(DRUGS_PARAM)
    if (!drugsParam) return
    const urlIds = drugsParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0)
    if (urlIds.length === 0) return
    // Only hydrate if the basket is empty (don't clobber an active session).
    if (basket.length > 0) return
    // We only have IDs from the URL; fetch the full drug details.
    // For now, add minimal stub items — the interactions-view will refetch
    // details by id when rendering. This keeps the hook pure (no fetch here).
    setBasket(
      urlIds.map((id) => ({
        id,
        brand: '',
        dci: '',
        status: '',
      })),
    )
  }, [searchParams])

  // When the basket changes: update the URL to reflect the current list.
  // Uses replace (not push) to avoid polluting the browser history.
  useEffect(() => {
    if (!urlEnabled) return
    const params = new URLSearchParams(searchParams.toString())
    if (basket.length === 0) {
      params.delete(DRUGS_PARAM)
    } else {
      const ids = basket.map((b) => b.id).join(',')
      params.set(DRUGS_PARAM, ids)
    }
    const queryString = params.toString()
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [basket, pathname])

  /** Convenience: clear both the basket and the URL param. */
  const clearAll = useCallback(() => {
    clearBasket()
  }, [clearBasket])

  return {
    basket,
    addToBasket,
    clearBasket: clearAll,
    urlEnabled,
  }
}
