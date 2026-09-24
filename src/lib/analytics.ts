/**
 * DzPharm Telemetry & Privacy-Preserving Analytics (P2-25)
 * Supports Plausible Analytics and custom medical event dispatching.
 * Zero PII, GDPR-compliant, respects DNT (Do Not Track) headers.
 */

type ClinicalEventType =
  | 'pageview'
  | 'drug_view'
  | 'interaction_check'
  | 'dose_calculated'
  | 'copilot_query'
  | 'shortage_reported'
  | 'barcode_scanned'
  | 'theme_changed'
  | 'palette_changed'
  | 'density_changed'
  | 'shortcuts_opened'

interface EventPayload {
  [key: string]: string | number | boolean | undefined | null
}

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: EventPayload }) => void
  }
}

class DzPharmAnalytics {
  private isDntEnabled(): boolean {
    if (typeof window === 'undefined') return true
    return (
      navigator.doNotTrack === '1' ||
      (window as unknown as { doNotTrack?: string }).doNotTrack === '1' ||
      navigator.userAgent.includes('bot')
    )
  }

  /** Enregistre un événement de navigation ou d'utilisation clinique */
  public track(eventName: ClinicalEventType, props?: EventPayload): void {
    if (this.isDntEnabled()) return

    // Plausible Analytics integration
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      try {
        window.plausible(eventName, { props })
      } catch (err) {
        // Telemetry errors must never crash clinical operations
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Analytics Error]', err)
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Analytics Track] ${eventName}:`, props)
    }
  }

  /** Consultation d'une fiche médicament */
  public trackDrugView(drugId: number, brand: string, dci: string): void {
    this.track('drug_view', { drugId, brand, dci })
  }

  /** Contrôle de panier d'interactions */
  public trackInteractionCheck(drugCount: number, alertCount: number): void {
    this.track('interaction_check', { drugCount, alertCount })
  }

  /** Calcul posologique pédiatrique */
  public trackDoseCalculated(molecule: string, weightKg: number): void {
    this.track('dose_calculated', { molecule, weightKg })
  }

  /** Utilisation du Copilote Clinique */
  public trackCopilotQuery(category?: string): void {
    this.track('copilot_query', { category: category || 'general' })
  }
}

export const analytics = new DzPharmAnalytics()
