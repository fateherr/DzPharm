import React from 'react'

export interface DzIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/**
 * D-02 — 15 Symboles Médicaux Officinaux DzPharm (Design Universe Section 4.1).
 * Respectent strictement la charte Lucide : viewBox 0 0 24 24, stroke 2px, linecap round.
 */

/** 1. Carte Chifa (carte à puce avec croix médicale CNAS) */
export function ChifaCardIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 14h2.5" />
      <path d="M15 13v3" />
      <path d="M13.5 14.5h3" />
    </svg>
  )
}

/** 2. Croix Verte Algérienne (croix officinale avec croissant) */
export function PharmacyCrossAlgeriaIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M9 3h6v4h4v6h-4v8H9v-8H5V7h4V3z" />
      <path d="M14 9.5a3 3 0 1 1-3.5 3.5" />
    </svg>
  )
}

/** 3. Mortier et Pilon Officinal Géométrique */
export function MortarPestleIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 11h16c0 4.5-3.5 8-8 8s-8-3.5-8-8z" />
      <path d="M19 4l-6.5 7" />
      <line x1="7" y1="20" x2="17" y2="20" />
    </svg>
  )
}

/** 4. Croissant Ramadan avec Gélule (Chronopharmacologie) */
export function RamadanCrescentIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.76c.4-.28.82-.51 1.28-.69A9.13 9.13 0 0 0 12 3z" />
      <rect x="15" y="4" width="7" height="4" rx="2" transform="rotate(30 15 4)" />
    </svg>
  )
}

/** 5. Liste I (Substances Vénéneuses Réglementées) */
export function ListOneIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="12" cy="15" r="3" />
      <line x1="12" y1="13.5" x2="12" y2="16.5" />
    </svg>
  )
}

/** 6. Liste II (Psychotropes & Surveillance Renforcée) */
export function ListTwoIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="10" y1="13.5" x2="10" y2="16.5" />
      <line x1="14" y1="13.5" x2="14" y2="16.5" />
      <line x1="9" y1="13.5" x2="11" y2="13.5" />
      <line x1="13" y1="13.5" x2="15" y2="13.5" />
      <line x1="9" y1="16.5" x2="11" y2="16.5" />
      <line x1="13" y1="16.5" x2="15" y2="16.5" />
    </svg>
  )
}

/** 7. Sceau Ordre des Pharmaciens (Conseil National de l'Ordre) */
export function AmineOrderIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="10" r="7" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
      <path d="M8.5 16.5L7 22l5-2 5 2-1.5-5.5" />
    </svg>
  )
}

/** 8. Flacon Officinal Algérien */
export function MedicationBottleDzIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="8" y="2" width="8" height="3" rx="1" />
      <path d="M7 5h10a1 1 0 0 1 1 1v2a3 3 0 0 1-1.5 2.6L19 12v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8l2.5-1.4A3 3 0 0 1 6 8V6a1 1 0 0 1 1-1z" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  )
}

/** 9. Traduction Darija (FR ↔ ض) */
export function DarijaTranslateIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <path d="M18 10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2l-3 3v-3h-3a2 2 0 0 1-2-2v-2" />
      <path d="M7 8h4" />
      <path d="M9 8v4" />
      <circle cx="16" cy="15" r="1.5" />
    </svg>
  )
}

/** 10. Wilaya Pin (58 Wilayas Algériennes) */
export function WilayaPinIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 21s-7-5.33-7-11a7 7 0 1 1 14 0c0 5.67-7 11-7 11z" />
      <path d="M9.5 9h2v2h-2v1.5h2" />
      <circle cx="14" cy="9.5" r="1" />
      <circle cx="14" cy="11.5" r="1" />
    </svg>
  )
}

/** 11. Scanner Code-Barres CBM DzPharm */
export function BarcodeScanDzIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="8" x2="7" y2="16" />
      <line x1="10" y1="8" x2="10" y2="16" />
      <line x1="13" y1="8" x2="13" y2="16" />
      <line x1="17" y1="8" x2="17" y2="16" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  )
}

/** 12. Interaction Médicamenteuse en Croix (Pills X) */
export function InteractionCrossIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2.5" y="9.5" width="19" height="5" rx="2.5" transform="rotate(45 12 12)" />
      <rect x="2.5" y="9.5" width="19" height="5" rx="2.5" transform="rotate(-45 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

/** 13. Balance Posologique Pédiatrique */
export function PosologyScaleIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="12" y1="3" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <path d="M4 8l8-2 8 2" />
      <path d="M2 13l2-5 2 5a2 2 0 0 1-4 0z" />
      <path d="M18 13l2-5 2 5a2 2 0 0 1-4 0z" />
    </svg>
  )
}

/** 14. Bouclier Grossesse & Allaitement */
export function PregnancyShieldIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="8" r="1.5" />
      <path d="M11 11c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5H10v-5h1z" />
    </svg>
  )
}

/** 15. Alerte Rupture Officinale */
export function ShortageAlertIcon({ size = 24, className, ...props }: DzIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="8" y="2" width="8" height="3" rx="1" />
      <path d="M6 6h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2" />
    </svg>
  )
}
