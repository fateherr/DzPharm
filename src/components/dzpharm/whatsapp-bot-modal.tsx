'use client'

import React, { useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WhatsAppBotModalProps {
  trigger?: React.ReactNode
}

/**
 * F-22 — Assistant Officinal WhatsApp Bot (Accès Mobile Rapide).
 * Permet aux pharmaciens et patients de consulter les 9 555 AMM et les interactions directement depuis WhatsApp.
 */
export function WhatsAppBotModal({ trigger }: WhatsAppBotModalProps) {
  const [open, setOpen] = useState(false)
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '+213 555 12 34 56'
  const waUrl = `https://wa.me/213555123456?text=${encodeURIComponent('Aide')}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-semibold cursor-pointer shadow-2xs"
          >
            <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Bot WhatsApp (F-22)</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-border bg-card">
        {/* Bandeau supérieur vert WhatsApp */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white text-center space-y-2">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner">
            <MessageCircle className="size-8" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Assistant Officinal WhatsApp DzPharm
          </DialogTitle>
          <DialogDescription className="text-emerald-100 text-xs max-w-sm mx-auto">
            Accédez aux 9 555 AMM, prix PPA et alertes d&apos;interactions directement depuis votre smartphone sur WhatsApp.
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Exemples de questions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" />
              Exemples de commandes à envoyer :
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-bold text-foreground block">Augmentin</span>
                <span className="text-[11px] text-muted-foreground">Fiche AMM, DCI, forme et PPA</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-bold text-foreground block">Amox + Méthotrexate</span>
                <span className="text-[11px] text-muted-foreground">Contrôle d&apos;interactions immédiat</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-bold text-foreground block">Prix Lovenox 4000</span>
                <span className="text-[11px] text-muted-foreground">Tarif PPA &amp; prise en charge Chifa</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-bold text-foreground block">Rupture Daonil</span>
                <span className="text-[11px] text-muted-foreground">Signalements et substituts actifs</span>
              </div>
            </div>
          </div>

          {/* Numéro officiel et lien direct */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Numéro WhatsApp Certifié
              </span>
              <span className="text-base font-extrabold text-foreground tabular-nums">
                {phone}
              </span>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              <span>Lancer le chat</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-muted-foreground">
              🟢 Service opérationnel 24h/24 · Données conformes au référentiel MSPRH Algérie.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
