'use client'

import { Flower2, Leaf, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Grand Sceau d'Officine & Pharmacopée (Mortier en pierre, Pilon incliné, Rose Damascena et Rameaux de Sauge).
 */
export function ApothecaryMortarRose({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div className="relative flex size-20 sm:size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#be185d] p-1 shadow-2xl shadow-[#1b4332]/30 ring-2 ring-[#b45309]/30">
        <div className="flex size-full items-center justify-center rounded-[20px] bg-[#fcfbf8] dark:bg-[#08150f] transition-colors relative overflow-hidden">
          {/* Subtle floral aura in emblem */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1b4332]/10 via-transparent to-[#be185d]/10 pointer-events-none" />

          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-12 sm:size-14 text-[#1b4332] dark:text-[#34d399]"
            aria-hidden="true"
          >
            {/* Mortier en pierre d'apothicaire */}
            <path
              d="M16 32C16 43.0457 23.1634 52 32 52C40.8366 52 48 43.0457 48 32H16Z"
              fill="currentColor"
              fillOpacity="0.18"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Pied du mortier */}
            <path
              d="M24 52H40V56C40 57.1046 39.1046 58 38 58H26C24.8954 58 24 57.1046 24 56V52Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            {/* Lèvres évasées du mortier */}
            <path
              d="M13 32C13 30.5 15 29 18 29H46C49 29 51 30.5 51 32"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Pilon en laiton incliné */}
            <path
              d="M44 10L27 36"
              stroke="#b45309"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Bouton de Rose Damascena fleuri au sommet du pilon */}
            <circle cx="45" cy="10" r="5" fill="#be185d" />
            <path
              d="M42 8C43.5 6.5 48 6.5 49 9C49.5 12 45 13.5 42 11"
              stroke="#fbcfe8"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M44 9C45 8 47 8 47.5 9.5"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Rameau de Sauge gauche */}
            <path
              d="M12 24C12 24 6 20 7 14C8 8 16 10 16 10C16 10 18 16 17 21C16 26 12 24 12 24Z"
              fill="#2d6a4f"
              stroke="#1b4332"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Folioles d'olivier droite */}
            <path
              d="M52 24C52 24 58 20 57 14C56 8 48 10 48 10C48 10 46 16 47 21C48 26 52 24 52 24Z"
              fill="#2d6a4f"
              stroke="#1b4332"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

/**
 * Séparateur filigrané végétal avec rose damascena et volutes de sauge.
 */
export function BotanicalFiligree({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 my-4 opacity-80 select-none', className)} aria-hidden>
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent via-[#b45309]/30 to-transparent dark:via-[#fbbf24]/30" />
      <span className="inline-flex items-center gap-2 text-xs text-[#be185d] dark:text-[#fb7185]">
        <Leaf className="size-4 rotate-[-45deg] text-[#1b4332] dark:text-[#34d399]" />
        <Flower2 className="size-5 text-[#be185d] dark:text-[#fb7185] animate-pulse" />
        <Leaf className="size-4 rotate-[45deg] text-[#1b4332] dark:text-[#34d399]" />
      </span>
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent via-[#b45309]/30 to-transparent dark:via-[#fbbf24]/30" />
    </div>
  )
}

/**
 * Badge façon herbier d'officine avec bordure cousue ou liseré laiton.
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
    sage: 'bg-[#1b4332]/10 text-[#1b4332] border-[#1b4332]/25 dark:bg-[#34d399]/15 dark:text-[#34d399] dark:border-[#34d399]/30',
    rose: 'bg-[#be185d]/10 text-[#be185d] border-[#be185d]/25 dark:bg-[#fb7185]/15 dark:text-[#fb7185] dark:border-[#fb7185]/30',
    gold: 'bg-[#b45309]/10 text-[#b45309] border-[#b45309]/30 dark:bg-[#fbbf24]/15 dark:text-[#fbbf24] dark:border-[#fbbf24]/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-2xs transition-all',
        styles[variant],
        className
      )}
    >
      {variant === 'rose' && <Flower2 className="size-3.5 shrink-0" />}
      {variant === 'sage' && <Leaf className="size-3.5 shrink-0" />}
      {variant === 'gold' && <Sparkles className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />}
      <span>{children}</span>
    </span>
  )
}

/**
 * Card décorative façon fiche d'herbier avec coins découpés ou liseré végétal.
 */
export function BotanicalSpecimenCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-[#dcd4c5]/90 bg-[#fcfbf8]/95 p-5 shadow-sm dark:border-[#1a2f24] dark:bg-[#0b1611]/95 transition-all',
        'hover:border-[#1b4332]/40 hover:shadow-md dark:hover:border-[#34d399]/40',
        className
      )}
    >
      {/* Coin ornemental haut gauche */}
      <span className="absolute top-2 left-2 size-2 border-t-2 border-l-2 border-[#b45309]/40 rounded-tl-sm pointer-events-none" />
      {/* Coin ornemental bas droite */}
      <span className="absolute bottom-2 right-2 size-2 border-b-2 border-r-2 border-[#b45309]/40 rounded-br-sm pointer-events-none" />
      {children}
    </div>
  )
}
