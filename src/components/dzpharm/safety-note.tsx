'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mention de sécurité normalisée (P0 — plan d'amélioration §11).
 * À afficher sur chaque vue qui produit une posologie, un résultat
 * d'interaction, un calcul clinique ou une réponse IA.
 */
export function SafetyNote({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {children ??
          'Outil d’information et d’éducation — pas un diagnostic ni un substitut à un avis médical. Toute décision thérapeutique relève d’un professionnel de santé. En cas d’urgence : SAMU 14 · Centre Anti-Poison (Alger) 021 71 30 42.'}
      </span>
    </p>
  )
}
