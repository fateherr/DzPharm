'use client'

import React, { Suspense, useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics'

function AnalyticsRouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
    analytics.track('pageview', { path: url })
  }, [pathname, searchParams])

  return null
}

/**
 * P2-25 — Fournisseur de télémétrie et statistiques respectant la vie privée.
 * Intègre Plausible Analytics via variable d'environnement NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
 * Active le tracking des pages vues sans cookie ni stockage d'IP.
 */
export function AnalyticsProvider() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'dzpharm.dz'
  const plausibleApiHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io'

  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsRouteTracker />
      </Suspense>
      {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
        <Script
          defer
          data-domain={plausibleDomain}
          src={`${plausibleApiHost}/js/script.js`}
          strategy="afterInteractive"
        />
      )}
    </>
  )
}
