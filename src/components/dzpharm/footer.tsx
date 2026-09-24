'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Coins, Database, Info, MessageCircle, Pill, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { WhatsAppBotModal } from './whatsapp-bot-modal'

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/80 bg-gradient-to-t from-card/80 to-card/40 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p className="flex items-center gap-2 text-center sm:text-left">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-chifa text-white shadow-2xs">
            <Pill className="size-3" aria-hidden />
          </span>
          <span>
            <strong className="font-semibold text-foreground/90">DzPharm</strong> — Nomenclature Nationale (Ministère de
            l&apos;Industrie Pharmaceutique, DZ)
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/a-propos"
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Ouvrir la page À propos et sources"
          >
            <Info className="size-3.5 shrink-0" aria-hidden />
            À propos &amp; sources
          </Link>
          <p className="hidden items-center gap-1.5 lg:flex">
            <BookOpen className="size-3.5 shrink-0 text-primary" aria-hidden />
            24 livres · 911 monographies DCI
          </p>
          <p className="hidden items-center gap-1.5 md:flex">
            <Coins className="size-3.5 shrink-0 text-chifa" aria-hidden />
            Prix PPA : liste officine (Août 2026)
          </p>
          <p className="hidden items-center gap-1.5 xl:flex">
            <Wifi className="size-3.5 shrink-0" aria-hidden />
            Mode hors ligne (PWA)
          </p>
          <WhatsAppBotModal
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:text-emerald-600 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                Bot WhatsApp
              </button>
            }
          />
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Usage professionnel — Vérifiez les RCP
          </p>
          <span className="hidden items-center gap-1.5 sm:flex">
            <RefreshCw className="size-3 shrink-0 text-state-safe" aria-hidden />
            <span className="text-state-safe font-medium">Référentiel en ligne</span>
          </span>
          <Badge
            variant="outline"
            className="border-chifa/30 bg-chifa/10 text-chifa shadow-2xs font-semibold"
          >
            MAJ Juin 2026
          </Badge>
        </div>
      </div>
    </footer>
  )
}
