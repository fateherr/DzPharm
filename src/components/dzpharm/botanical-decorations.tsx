'use client'

import { Flower2, Leaf, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Blason héraldique de l'Officine & Pharmacopée Royale (Mortier, Pilon, Laurier & Rose Damascena).
 */
export function BotanicalCrest({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div className="relative flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#be185d] p-0.5 shadow-xl shadow-[#1b4332]/25 ring-2 ring-[#dcd4c5]/40">
        <div className="flex size-full items-center justify-center rounded-[14px] bg-[#fcfbf8] dark:bg-[#0b1611] transition-colors">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-8 sm:size-9 text-[#1b4332] dark:text-[#34d399]"
            aria-hidden="true"
          >
            {/* Mortier d'apothicaire */}
            <path
              d="M12 24C12 32.8366 17.3726 40 24 40C30.6274 40 36 32.8366 36 24H12Z"
              fill="currentColor"
              fillOpacity="0.15"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Base du mortier */}
            <path
              d="M18 40H30V43C30 43.5523 29.5523 44 29 44H19C18.4477 44 18 43.5523 18 43V40Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Pilon incliné */}
            <path
              d="M33 7L21 27"
              stroke="#be185d"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Fleur de rose / bouton */}
            <circle cx="34" cy="7" r="3.5" fill="#be185d" />
            <path
              d="M32 6C33 5 36 5 37 7C37 9 34 10 32 8"
              stroke="#fbcfe8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Feuille de sauge gauche */}
            <path
              d="M10 18C10 18 6 15 7 11C8 7 13 8 13 8C13 8 15 12 14 16C13 20 10 18 10 18Z"
              fill="#15803d"
              stroke="#15803d"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Branchette droite */}
            <path
              d="M38 18C38 18 42 15 41 11C40 7 35 8 35 8C35 8 33 12 34 16C35 20 38 18 38 18Z"
              fill="#15803d"
              stroke="#15803d"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

/**
 * Séparateur filigrané végétal avec rose damascena et volutes.
 */
export function BotanicalFiligree({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 my-4 opacity-75', className)} aria-hidden>
      <span className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent via-[#dcd4c5] to-transparent dark:via-[#1a2f24]" />
      <span className="inline-flex items-center gap-1.5 text-xs text-[#be185d] dark:text-[#fb7185]">
        <Leaf className="size-3.5 rotate-[-45deg] text-[#1b4332] dark:text-[#34d399]" />
        <Flower2 className="size-4" />
        <Leaf className="size-3.5 rotate-[45deg] text-[#1b4332] dark:text-[#34d399]" />
      </span>
      <span className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent via-[#dcd4c5] to-transparent dark:via-[#1a2f24]" />
    </div>
  )
}

/**
 * Badge façon herbier d'officine avec bordure en pointillés ou or doux.
 */
export function BotanicalBadge({
  children,
  variant = 'sage',
  className,
}: {
  children: React.ReactNode
  variant?: 'sage' | 'rose' | 'gold'
  className?: string
}) {
  const styles = {
    sage: 'bg-[#1b4332]/10 text-[#1b4332] border-[#1b4332]/25 dark:bg-[#34d399]/10 dark:text-[#34d399] dark:border-[#34d399]/30',
    rose: 'bg-[#be185d]/10 text-[#be185d] border-[#be185d]/25 dark:bg-[#fb7185]/15 dark:text-[#fb7185] dark:border-[#fb7185]/30',
    gold: 'bg-[#b45309]/10 text-[#b45309] border-[#b45309]/25 dark:bg-[#fbbf24]/15 dark:text-[#fbbf24] dark:border-[#fbbf24]/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-2xs transition-colors',
        styles[variant],
        className
      )}
    >
      {variant === 'rose' && <Flower2 className="size-3 shrink-0" />}
      {variant === 'sage' && <Leaf className="size-3 shrink-0" />}
      {variant === 'gold' && <Sparkles className="size-3 shrink-0" />}
      <span>{children}</span>
    </span>
  )
}

/**
 * Volutes et pétales flottants en arrière-plan du Hero.
 */
export function BotanicalHeroPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none opacity-30 dark:opacity-20" aria-hidden>
      {/* Pétale flottant haut gauche */}
      <div className="absolute -top-10 left-10 size-48 rounded-full bg-gradient-to-br from-[#be185d]/20 to-transparent blur-3xl" />
      {/* Halo sauge haut droite */}
      <div className="absolute top-20 right-12 size-64 rounded-full bg-gradient-to-bl from-[#1b4332]/20 to-transparent blur-3xl" />
      {/* Halo doré centre bas */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 size-72 rounded-full bg-gradient-to-t from-[#b45309]/10 to-transparent blur-3xl" />
    </div>
  )
}
