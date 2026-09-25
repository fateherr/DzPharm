'use client'

import React, { useRef } from 'react'
import {
  Printer,
  Receipt,
  Phone,
  Clock,
  ShieldAlert,
  QrCode,
  FileText,
  User,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface ThermalSlipLine {
  id: string
  brand: string
  dci: string
  form?: string
  dosage?: string
  posology: string
  timing: string // e.g. "Matin et Soir", "1-0-1"
  withFood?: 'during' | 'before' | 'after' | 'any'
  precaution?: string
  durationDays?: number
  price?: number
  isHighAlert?: boolean
}

export interface ThermalSlipProps {
  pharmacyName?: string
  pharmacistName?: string
  phone?: string
  wilaya?: string
  patientName?: string
  patientAge?: number | string
  patientGender?: 'M' | 'F'
  chifaCardType?: string
  chifaNumber?: string
  lines: ThermalSlipLine[]
  totalPPA?: number
  partChifa?: number
  resteAPayer?: number
  notes?: string
}

export function ThermalPosologySlip({
  pharmacyName = 'Pharmacie El-Chifa',
  pharmacistName = 'Dr. Pharmacien',
  phone = '023 XX XX XX',
  wilaya = 'Alger (16)',
  patientName = 'Patient Anonyme',
  patientAge,
  patientGender,
  chifaCardType = 'CNAS (80%)',
  chifaNumber,
  lines,
  totalPPA,
  partChifa,
  resteAPayer,
  notes,
}: ThermalSlipProps) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const currentTime = new Date().toLocaleTimeString('fr-DZ', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-4">
      {/* Barre d'action à l'écran */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/60 print:hidden">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold">Ticket Posologique Thermique (80mm)</h4>
            <p className="text-xs text-muted-foreground">
              Format standard imprimante ticket de caisse d&apos;officine (ESC/POS)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <Printer className="size-4" />
            Imprimer le ticket (80mm)
          </Button>
        </div>
      </div>

      {/* Style d'impression isolé pour imprimante 80mm */}
      <style jsx global>{`
        @media print {
          /* Masquer tout sauf le ticket */
          body * {
            visibility: hidden;
          }
          #thermal-slip-print-container,
          #thermal-slip-print-container * {
            visibility: visible;
          }
          #thermal-slip-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 78mm !important;
            max-width: 78mm !important;
            padding: 2mm 3mm !important;
            margin: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'JetBrains Mono', 'Courier New', monospace !important;
            font-size: 10pt !important;
            line-height: 1.2 !important;
          }
          .thermal-print-hide {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      {/* Rendu visuel à l'écran & conteneur d'impression */}
      <div className="flex justify-center bg-muted/20 p-4 rounded-xl border border-dashed border-border/80">
        <div
          id="thermal-slip-print-container"
          ref={printAreaRef}
          className="w-[340px] max-w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 rounded-md shadow-md border border-zinc-200 dark:border-zinc-800 font-mono text-xs leading-relaxed transition-all"
        >
          {/* En-tête officine */}
          <div className="text-center pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <h3 className="font-bold text-sm uppercase tracking-wide">{pharmacyName}</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{pharmacistName}</p>
            <p className="text-[10px] text-zinc-500">{wilaya} · Tél: {phone}</p>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500 pt-1 border-t border-dotted border-zinc-200 dark:border-zinc-800">
              <span>Date: {currentDate}</span>
              <span>Heure: {currentTime}</span>
            </div>
          </div>

          {/* En-tête patient */}
          <div className="py-2 border-b border-dashed border-zinc-300 dark:border-zinc-700 space-y-0.5">
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-[11px] uppercase">Patient: {patientName}</span>
              {patientAge && (
                <span className="text-[10px]">
                  {patientAge} ans {patientGender ? `(${patientGender})` : ''}
                </span>
              )}
            </div>
            {chifaCardType && (
              <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-400">
                <span>Régime: {chifaCardType}</span>
                {chifaNumber && <span>N°: {chifaNumber}</span>}
              </div>
            )}
          </div>

          {/* Titre section posologie */}
          <div className="py-1.5 text-center font-bold uppercase tracking-wider text-[11px] bg-zinc-100 dark:bg-zinc-900 my-1.5 rounded-xs">
            *** POSOLOGIE &amp; CONSEILS ***
          </div>

          {/* Liste des médicaments */}
          <div className="space-y-2.5 py-1">
            {lines.length === 0 ? (
              <p className="text-center italic text-zinc-400 py-2">Aucun médicament sélectionné</p>
            ) : (
              lines.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-2 last:border-none"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase leading-tight">
                      {idx + 1}. {item.brand}
                    </span>
                    {item.price && (
                      <span className="text-[11px] font-semibold shrink-0 ml-1">
                        {item.price.toFixed(2)} DA
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {item.dci} {item.dosage ? `· ${item.dosage}` : ''} {item.form ? `· ${item.form}` : ''}
                  </div>

                  {/* Posologie détaillée */}
                  <div className="mt-1 bg-zinc-50 dark:bg-zinc-900/60 p-1.5 rounded border border-zinc-200/60 dark:border-zinc-800 text-[11px]">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <span>▶ Prise :</span>
                      <span>{item.posology}</span>
                    </div>
                    {item.timing && (
                      <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                        Rythme : {item.timing}
                      </div>
                    )}
                    {item.withFood && item.withFood !== 'any' && (
                      <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        {item.withFood === 'during' && '🍽️ Au cours du repas'}
                        {item.withFood === 'before' && '⏳ À jeun / 30 min avant le repas'}
                        {item.withFood === 'after' && '🕒 Juste après le repas'}
                      </div>
                    )}
                    {item.durationDays && (
                      <div className="text-[10px] text-zinc-500">
                        Durée : {item.durationDays} jours
                      </div>
                    )}
                  </div>

                  {/* Conseil / Précaution clé */}
                  {item.precaution && (
                    <div className="mt-0.5 text-[9.5px] italic text-zinc-600 dark:text-zinc-400 pl-1 border-l-2 border-zinc-400">
                      Conseil : {item.precaution}
                    </div>
                  )}

                  {/* Alerte vigilance */}
                  {item.isHighAlert && (
                    <div className="mt-0.5 text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">
                      ⚠️ Haute vigilance · Respecter strictement la dose
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Récapitulatif Chifa / Financier */}
          {(totalPPA !== undefined || resteAPayer !== undefined) && (
            <div className="mt-2 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-700 space-y-1 text-[11px]">
              {totalPPA !== undefined && (
                <div className="flex justify-between">
                  <span>Total Ordonnance PPA:</span>
                  <span>{totalPPA.toFixed(2)} DA</span>
                </div>
              )}
              {partChifa !== undefined && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Prise en charge Caisse:</span>
                  <span>- {partChifa.toFixed(2)} DA</span>
                </div>
              )}
              {resteAPayer !== undefined && (
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white">
                  <span>NET À PAYER COMPTOIR:</span>
                  <span>{resteAPayer.toFixed(2)} DA</span>
                </div>
              )}
            </div>
          )}

          {/* Notes complémentaires */}
          {notes && (
            <div className="mt-2 p-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] rounded">
              <span className="font-semibold">Note :</span> {notes}
            </div>
          )}

          {/* Pied de ticket & Urgences */}
          <div className="mt-3 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-1 text-[9.5px] text-zinc-500">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              Bon rétablissement ! بالشفاء العاجل
            </p>
            <p>Ne jamais modifier la dose sans avis médical.</p>
            <div className="pt-1 border-t border-dotted border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-400">
              URGENCES : SAMU 14 · ANTI-POISON 021 97 98 98
            </div>
            <p className="text-[8px] pt-0.5 text-zinc-400">
              Généré par DzPharm · Système Officinal Certifié
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
