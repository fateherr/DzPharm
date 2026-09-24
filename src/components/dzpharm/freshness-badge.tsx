'use client'

import React from 'react'
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FreshnessBadgeProps {
  edition?: string
  lastVerifiedAt?: string
  variant?: 'pill' | 'compact' | 'inline'
  className?: string
}

/**
 * P2-27 — Badge de fraîcheur des données & conformité réglementaire (MSPRH / CNAS).
 * Indique au praticien et au patient la date d'actualisation de la nomenclature
 * et l'exactitude des données d'enregistrement (AMM) et de remboursement (Chifa).
 */
export function FreshnessBadge({
  edition = 'Juin 2026',
  lastVerifiedAt = '2026-06-30',
  variant = 'pill',
  className,
}: FreshnessBadgeProps) {
  if (variant === 'compact') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 cursor-help',
                className
              )}
            >
              <CheckCircle2 className="size-3" aria-hidden />
              <span>MSPRH {edition}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              Données Officielles Vérifiées
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Nomenclature Nationale des Produits Pharmaceutiques à Usage Humain (MSPRH Algérie, édition {edition}). Vérifié conforme au {lastVerifiedAt}.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs hover:bg-emerald-500/10 transition-colors cursor-help',
              className
            )}
          >
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
            <span>Nomenclature officielle <strong>{edition}</strong></span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">· Conforme</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-3 text-xs shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Garantie de Traçabilité Réglementaire</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Extrait officiel du Ministère de la Santé, de la Population et de la Réforme Hospitalière (MSPRH) & tarifs de référence CNAS/CASNOS.
            </p>
            <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between">
              <span>Édition de référence : <strong>{edition}</strong></span>
              <span>Dernier audit : <strong>{lastVerifiedAt}</strong></span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
