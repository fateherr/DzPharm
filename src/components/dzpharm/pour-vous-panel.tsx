'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Info,
  PackageX,
  Pill,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  UserCheck,
  X,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDzPharm } from './store'
import { computeCabinetAlerts, daysUntil } from './armoire/utils'

interface ShortageItem {
  id: number
  brand: string
  dci: string | null
  status: string
  wilaya: string | null
  createdAt: string
}

interface ShortageResponse {
  reports: ShortageItem[]
}

export type ProactiveCategory = 'tous' | 'cabinet' | 'penuries' | 'securite' | 'patient'

export function PourVousPanel() {
  const setView = useDzPharm((s) => s.setView)
  const openDrug = useDzPharm((s) => s.openDrug)
  const openTool = useDzPharm((s) => s.openTool)
  const armoireEntries = useDzPharm((s) => s.armoireEntries)
  const favorites = useDzPharm((s) => s.favorites)
  const recentlyViewed = useDzPharm((s) => s.recentlyViewed)
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)

  const [activeFilter, setActiveFilter] = useState<ProactiveCategory>('tous')
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // 1. Alertes d'armoire familiale
  const cabinetAlerts = useMemo(() => {
    return computeCabinetAlerts(armoireEntries)
  }, [armoireEntries])

  // 2. Alertes pénuries & retraits
  const { data: shortagesData } = useQuery<ShortageResponse>({
    queryKey: ['shortages-pour-vous'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/shortages', { signal })
      if (!res.ok) return { reports: [] }
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  // Croisement des alertes proactives personnalisées
  const notifications = useMemo(() => {
    const list: Array<{
      id: string
      category: 'cabinet' | 'penuries' | 'securite' | 'patient'
      level: 'critique' | 'warning' | 'info' | 'succes'
      title: string
      description: string
      dateLabel: string
      actionLabel?: string
      onAction?: () => void
    }> = []

    // A. Éléments périmés ou critiques dans l'armoire
    cabinetAlerts.forEach((alert) => {
      const entry = armoireEntries.find((e) => e.uid === alert.uid)
      const name = entry?.brand || 'Produit'
      if (alert.kind === 'expired') {
        list.push({
          id: `cabinet-expired-${alert.uid}`,
          category: 'cabinet',
          level: 'critique',
          title: `Médicament périmé : ${name}`,
          description: `Ce produit est périmé dans votre armoire. Ne pas dispenser ni administrer. Élimination sécurisée requise.`,
          dateLabel: 'Périmé',
          actionLabel: 'Gérer dans l’armoire',
          onAction: () => setView('armoire'),
        })
      } else if (alert.kind === 'expiring7') {
        list.push({
          id: `cabinet-exp7-${alert.uid}`,
          category: 'cabinet',
          level: 'warning',
          title: `Péremption imminente (J-7) : ${name}`,
          description: `Date limite de consommation dans moins de 7 jours. Prévoir renouvellement ou priorisation.`,
          dateLabel: 'J-7',
          actionLabel: 'Consulter l’armoire',
          onAction: () => setView('armoire'),
        })
      }
    })

    // B. Alerte Patient Épinglé (Wave 1 Shift Context)
    if (pinnedPatient) {
      if (pinnedPatient.clcr && pinnedPatient.clcr < 50) {
        list.push({
          id: 'patient-clcr-alert',
          category: 'patient',
          level: 'critique',
          title: `Patient épinglé : Insuffisance Rénale (ClCr ${pinnedPatient.clcr} mL/min)`,
          description: `Le patient actif (${pinnedPatient.ageYears ?? '—'} ans, ${pinnedPatient.weightKg ?? '—'} kg) nécessite un ajustement posologique strict pour tout médicament à élimination rénale.`,
          dateLabel: 'Contexte actif',
          actionLabel: 'Calculateur Rénal',
          onAction: () => openTool('renal'),
        })
      }
      if (pinnedPatient.allergies && pinnedPatient.allergies.length > 0) {
        list.push({
          id: 'patient-allergy-alert',
          category: 'patient',
          level: 'warning',
          title: `Allergies déclarées : ${pinnedPatient.allergies.join(', ')}`,
          description: `Vérification systématique d’excipients à effet notoire et réactivité croisée pour toute dispensation.`,
          dateLabel: 'Profil patient',
          actionLabel: 'Vérifier Ordonnance',
          onAction: () => openTool('pediatrie'),
        })
      }
    }

    // C. Pénuries croisées avec les favoris ou récemment consultés
    if (shortagesData?.reports) {
      const activeReports = shortagesData.reports.filter((r) => r.status === 'EN_COURS')
      const trackedNames = new Set([
        ...favorites.map((f) => f.brand?.toUpperCase().trim()),
        ...recentlyViewed.map((r) => r.brand?.toUpperCase().trim()),
      ])

      activeReports.forEach((rep) => {
        if (trackedNames.has(rep.brand?.toUpperCase().trim())) {
          list.push({
            id: `shortage-${rep.id}`,
            category: 'penuries',
            level: 'warning',
            title: `Signalement de rupture : ${rep.brand}`,
            description: `Tension ou rupture signalée en officine (${rep.wilaya ?? 'National'}). Consultez les bioéquivalents disponibles.`,
            dateLabel: 'Tension stock',
            actionLabel: 'Voir alternatives',
            onAction: () => openTool('livret'),
          })
        }
      })
    }

    // D. Alerte Sécurité ANPP & Rappels
    recentlyViewed.slice(0, 5).forEach((drug) => {
      if (drug.status === 'RETRIE') {
        list.push({
          id: `recall-${drug.id}`,
          category: 'securite',
          level: 'critique',
          title: `Spécialité retirée du marché : ${drug.brand}`,
          description: `Cette spécialité (${drug.dci ?? ''}) a fait l'objet d'un retrait d'AMM officiel par l'ANPP. Ne plus délivrer.`,
          dateLabel: 'Retrait ANPP',
          actionLabel: 'Fiche spécialité',
          onAction: () => openDrug(drug.id),
        })
      }
    })

    // E. Notification chronopharmacologique Ramadan active
    list.push({
      id: 'ramadan-chrono-notice',
      category: 'securite',
      level: 'info',
      title: 'Adaptateur Ramadan 58 Wilayas disponible',
      description: 'Synchronisation astronomique Iftar / Suhoor et convertisseur chronopharmacologique 3 prises → 2 prises prêt pour le comptoir.',
      dateLabel: 'Officine Dz',
      actionLabel: 'Ouvrir l’outil',
      onAction: () => openTool('ramadan'),
    })

    return list
  }, [cabinetAlerts, pinnedPatient, shortagesData, favorites, recentlyViewed, setView, openTool, openDrug])

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => !dismissedIds.includes(n.id))
      .filter((n) => activeFilter === 'tous' || n.category === activeFilter)
  }, [notifications, dismissedIds, activeFilter])

  const dismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id])
  }

  if (notifications.length === 0) return null

  return (
    <section aria-labelledby="pour-vous-title" className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6">
      <Card className="border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle id="pour-vous-title" className="text-base font-bold flex items-center gap-2 text-foreground">
                  <span>Pour Vous — Vigie Officinale Proactive</span>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-semibold px-2">
                    {filteredNotifications.length} {filteredNotifications.length > 1 ? 'alertes' : 'alerte'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Surveillance continue de votre armoire, pénuries croisées, contexte patient et vigilances ANPP
                </CardDescription>
              </div>
            </div>

            {/* Filtres de catégorie */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('tous')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeFilter === 'tous'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Tous ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('cabinet')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeFilter === 'cabinet'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Armoire
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('penuries')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeFilter === 'penuries'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Pénuries
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('securite')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeFilter === 'securite'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Sécurité & ANPP
              </button>
              {pinnedPatient && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('patient')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                    activeFilter === 'patient'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <UserCheck className="size-3" />
                  Patient
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredNotifications.map((notif) => {
                const isCritique = notif.level === 'critique'
                const isWarning = notif.level === 'warning'
                const isSucces = notif.level === 'succes'

                const borderCls = isCritique
                  ? 'border-state-danger/40 bg-state-danger/5 hover:border-state-danger/60'
                  : isWarning
                  ? 'border-state-warning/40 bg-state-warning/5 hover:border-state-warning/60'
                  : isSucces
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60'
                  : 'border-border/70 bg-card hover:border-primary/40'

                const iconCls = isCritique
                  ? 'text-state-danger bg-state-danger/10'
                  : isWarning
                  ? 'text-state-warning bg-state-warning/10'
                  : isSucces
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-primary bg-primary/10'

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.2 }}
                    className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all shadow-2xs ${borderCls}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
                            {isCritique ? (
                              <ShieldAlert className="size-4" />
                            ) : isWarning ? (
                              <AlertTriangle className="size-4" />
                            ) : isSucces ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Info className="size-4" />
                            )}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {notif.dateLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismiss(notif.id)}
                          className="size-6 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                          aria-label="Ignorer l'alerte"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-1 mb-1">
                        {notif.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {notif.description}
                      </p>
                    </div>

                    {notif.actionLabel && notif.onAction && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={notif.onAction}
                          className="h-6 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 px-2 gap-1"
                        >
                          <span>{notif.actionLabel}</span>
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {filteredNotifications.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />
              <p className="font-semibold text-foreground">Aucune alerte active dans cette catégorie</p>
              <p className="text-[11px]">Toutes vos vérifications officinales sont conformes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
