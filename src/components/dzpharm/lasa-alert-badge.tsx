'use client'

import React from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Search,
  ShieldAlert,
} from 'lucide-react'
import {
  checkHighAlert,
  checkLasaRisk,
  type HighAlertInfo,
  type LasaAlert,
} from '@/lib/lasa'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'

interface LasaAlertProps {
  brand: string
  dci: string
  liste?: string
  className?: string
}

/**
 * BS-05 — Filet de sécurité LASA (Look-Alike / Sound-Alike) & Médicaments à Haut Risque.
 * Détecte les risques de confusion entre noms de spécialités ou DCI phonétiquement/orthographiquement
 * proches, applique le lettrage Tall Man (ISMP) et affiche la check-list de sécurité vitale.
 */
export function LasaAlertBadge({ brand, dci, liste, className }: LasaAlertProps) {
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const lasa = checkLasaRisk(brand, dci)
  const highAlert = checkHighAlert(brand, dci, liste)

  if (!lasa && !highAlert) return null

  return (
    <div className={cn('space-y-3', className)}>
      {/* 1. Alerte de confusion LASA */}
      {lasa && (
        <div
          role="alert"
          aria-label="Alerte risque de confusion médicamenteuse LASA"
          className={cn(
            'rounded-xl border p-3.5 sm:p-4 shadow-sm transition-all',
            lasa.dangerLevel === 'CRITIQUE'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                lasa.dangerLevel === 'CRITIQUE'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              )}
            >
              <ArrowRightLeft className="size-4.5" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider',
                    lasa.dangerLevel === 'CRITIQUE'
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'
                  )}
                >
                  <AlertTriangle className="size-3.5" />
                  Risque de confusion (LASA) · {lasa.dangerLevel}
                </span>

                <button
                  type="button"
                  onClick={() => gotoDirectory({ q: lasa.confusedWith })}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                  title={`Voir la fiche de ${lasa.confusedWith}`}
                >
                  <span>Rechercher {lasa.confusedWith}</span>
                  <ExternalLink className="size-2.5" />
                </button>
              </div>

              {/* Comparaison Tall Man */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-background/60 backdrop-blur-xs p-2.5 border border-border/50 text-xs">
                <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-primary border border-primary/20">
                    {lasa.tallMan}
                  </span>
                </div>
                <span className="text-muted-foreground font-semibold text-[11px]">≠ NE PAS CONFONDRE AVEC</span>
                <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                  <span className="rounded bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                    {lasa.targetTallMan}
                  </span>
                </div>
              </div>

              {/* Règle clinique & Action */}
              <p className="mt-2 text-xs leading-relaxed text-foreground/90 font-medium">
                {lasa.clinicalDifference}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Recommandation officine / clinique :</strong> {lasa.actionRecommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Médicament à haut risque vital (High-Alert Medication) */}
      {highAlert && (
        <div
          role="region"
          aria-label="Alerte médicament à haut risque vital"
          className="rounded-xl border border-red-500/40 bg-gradient-to-br from-red-500/15 via-red-500/5 to-transparent p-3.5 sm:p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-600 dark:text-red-400">
              <AlertOctagon className="size-4.5" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-2xs">
                  High-Alert
                </span>
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {highAlert.category}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-foreground/90 leading-relaxed font-medium">
                {highAlert.warning}
              </p>

              {/* Points de contrôle sécuritaire */}
              <div className="mt-2.5 pt-2 border-t border-red-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-1.5">
                  Check-list de dispensation &amp; administration :
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  {highAlert.checkpoints.map((cp, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <CheckCircle2 className="size-3 text-red-600 dark:text-red-400 shrink-0" />
                      <span>{cp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
