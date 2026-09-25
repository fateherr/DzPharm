'use client'

import React, { useEffect, useState, useTransition } from 'react'
import {
  CloudCheck,
  CloudOff,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { offlineDB } from '@/lib/offline/indexed-db'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface OfflineStats {
  count: number
  lastSync: string | null
}

export function PwaStatusBanner() {
  const { toast } = useToast()
  const [isOnline, setIsOnline] = useState(true)
  const [stats, setStats] = useState<OfflineStats>({ count: 0, lastSync: null })
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  // Rafraîchir les statistiques IndexedDB
  const refreshStats = async () => {
    try {
      const s = await offlineDB.getStats()
      setStats(s)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: 'Connexion rétablie',
        description: 'La synchronisation en temps réel avec le serveur est active.',
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: 'Mode hors-ligne activé',
        description: 'Vous naviguez désormais avec la base locale IndexedDB.',
        variant: 'destructive',
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    refreshStats()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter à Internet pour synchroniser la base.',
        variant: 'destructive',
      })
      return
    }

    setIsSyncing(true)
    setSyncProgress({ loaded: 0, total: 0 })

    const res = await offlineDB.syncFromNetwork((loaded, total) => {
      setSyncProgress({ loaded, total })
    })

    setIsSyncing(false)

    if (res.success) {
      await refreshStats()
      toast({
        title: 'Synchronisation terminée',
        description: `${res.count.toLocaleString('fr-DZ')} spécialités enregistrées dans la base hors-ligne.`,
      })
    } else {
      toast({
        title: 'Échec de synchronisation',
        description: 'Une erreur est survenue lors du téléchargement des données.',
        variant: 'destructive',
      })
    }
  }

  const handleClear = async () => {
    await offlineDB.clearOfflineData()
    await refreshStats()
    toast({
      title: 'Base locale vidée',
      description: 'Le cache hors-ligne a été réinitialisé.',
    })
  }

  const progressPercent =
    syncProgress.total > 0
      ? Math.round((syncProgress.loaded / syncProgress.total) * 100)
      : 0

  return (
    <>
      {/* 1. Bandeau discret en haut lorsque déconnecté */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-14 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-500/50 bg-amber-950/90 text-amber-200 px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md">
            <WifiOff className="size-4 text-amber-400 animate-pulse shrink-0" aria-hidden />
            <span>
              Mode Hors-ligne Actif —{' '}
              {stats.count > 0
                ? `${stats.count.toLocaleString('fr-DZ')} médicaments disponibles dans le cache local.`
                : 'Base locale vide : connectez-vous pour pré-charger le répertoire.'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-6 rounded-full border-amber-400/40 bg-amber-900/50 hover:bg-amber-800 text-amber-200 text-[11px] px-2.5 ml-1"
            >
              Gérer
            </Button>
          </div>
        </div>
      )}

      {/* 2. Dialogue de gestion du mode hors-ligne */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <HardDrive className="size-5 text-primary" />
              Référentiel Hors-Ligne DzPharm (W8-01)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Téléchargez la nomenclature pharmaceutique nationale directement dans la base
              IndexedDB de votre navigateur pour effectuer des recherches instantanées sans connexion Internet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* État de connexion */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                {isOnline ? (
                  <Wifi className="size-4.5 text-emerald-500" />
                ) : (
                  <WifiOff className="size-4.5 text-amber-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {isOnline ? 'Connexion Internet active' : 'Mode Déconnecté (Hors-ligne)'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isOnline
                      ? 'Accès direct aux API temps réel et copilote IA'
                      : 'Recherche locale instantanée via IndexedDB'}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {isOnline ? 'En ligne' : 'Hors-ligne'}
              </span>
            </div>

            {/* Statistiques IndexedDB */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-border/80 bg-card p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Médicaments en cache</p>
                <p className="text-lg font-bold text-primary mt-0.5">
                  {stats.count.toLocaleString('fr-DZ')}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Dernière synchronisation</p>
                <p className="text-xs font-semibold text-foreground mt-1">
                  {stats.lastSync
                    ? new Date(stats.lastSync).toLocaleDateString('fr-DZ', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Aucune'}
                </p>
              </div>
            </div>

            {/* Barre de progression pendant la synchronisation */}
            {isSyncing && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 animate-spin" />
                    Synchronisation de la base…
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {syncProgress.loaded} / {syncProgress.total || '…'} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="default"
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="flex-1 gap-2 font-semibold cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Téléchargement…
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Synchroniser la base locale
                  </>
                )}
              </Button>

              {stats.count > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClear}
                  disabled={isSyncing}
                  title="Vider la base locale"
                  className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
