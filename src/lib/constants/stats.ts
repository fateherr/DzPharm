/**
 * DzPharm Official Platform Dataset Metrics
 * Single source of truth for platform AMM and pharmacology metrics (P2-28).
 * Reconciles the official MSPRH nomenclature and avoids stat drift across components.
 */

export const PLATFORM_STATS = {
  /** Nombre total d'AMM répertoriées */
  TOTAL_DRUGS: 9555,
  /** Médicaments actifs (AMM valide) */
  ACTIVE_DRUGS: 5381,
  /** Enregistrements non renouvelés */
  NON_RENEWED_DRUGS: 1495,
  /** Médicaments retirés du marché */
  WITHDRAWN_DRUGS: 2679,
  /** Nombre estimé de DCI avec monographies cliniques */
  TOTAL_MONOGRAPHS: 997,
  /** Produits référencés en officine avec prix PPA */
  PHARMACY_PRODUCTS: 1791,
  /** Édition officielle de référence */
  EDITION: 'Juin 2026',
  /** Date du dernier audit réglementaire */
  LAST_VERIFIED_DATE: '2026-06-30',
} as const

export const TOTAL_DRUGS = PLATFORM_STATS.TOTAL_DRUGS
export const ACTIVE_DRUGS = PLATFORM_STATS.ACTIVE_DRUGS
export const NON_RENEWED_DRUGS = PLATFORM_STATS.NON_RENEWED_DRUGS
export const WITHDRAWN_DRUGS = PLATFORM_STATS.WITHDRAWN_DRUGS
export const TOTAL_MONOGRAPHS = PLATFORM_STATS.TOTAL_MONOGRAPHS
export const PHARMACY_PRODUCTS = PLATFORM_STATS.PHARMACY_PRODUCTS
export const EDITION = PLATFORM_STATS.EDITION
export const LAST_VERIFIED_DATE = PLATFORM_STATS.LAST_VERIFIED_DATE

/** Formate un nombre d'AMM avec l'espace insécable réglementaire */
export function formatAmmCount(count: number = PLATFORM_STATS.TOTAL_DRUGS): string {
  return new Intl.NumberFormat('fr-FR').format(count).replace(/\u202F/g, ' ')
}
