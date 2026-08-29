'use client'

import { useEffect, useState } from 'react'
import { CloudOff, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Enregistrement du service worker DzPharm (PWA offline)
 * + indicateur d'état hors ligne discret.
 */
export function PwaProvider() {
  const [offline, setOffline] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // État en ligne / hors ligne
    const updateOnline = () => setOffline(!navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)

    // Enregistrement du service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          setRegistration(reg)
          // Nouvelle version disponible (waiting worker)
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (!installing) return
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setUpdateReady(true)
              }
            })
          })
        })
        .catch(() => {
          /* SW indisponible (contexte non sécurisé) — silencieux */
        })
    }

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  const applyUpdate = () => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      window.location.reload()
    })
    // Repli : recharge directe si pas de controllerchange
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <>
      {offline && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4"
        >
          <span className="pointer-events-auto flex items-center gap-2 rounded-full border border-state-warning/40 bg-state-warning/15 px-4 py-1.5 text-xs font-semibold text-state-warning shadow-lg backdrop-blur-sm">
            <WifiOff className="size-3.5" aria-hidden />
            Hors ligne — fiches consultées disponibles en cache
          </span>
        </div>
      )}
      {updateReady && (
        <div
          role="alert"
          className={cn(
            'fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-primary/40',
            'bg-card/95 px-4 py-3 shadow-xl backdrop-blur'
          )}
        >
          <CloudOff className="size-4 text-primary" aria-hidden />
          <p className="text-xs font-medium text-foreground">
            Nouvelle version disponible
          </p>
          <Button size="sm" variant="default" className="h-7 px-3 text-xs" onClick={applyUpdate}>
            Mettre à jour
          </Button>
        </div>
      )}
    </>
  )
}
