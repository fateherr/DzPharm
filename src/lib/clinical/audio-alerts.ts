/**
 * Système d'alertes sonores cliniques harmoniques (Web Audio API).
 * Génère des carillons et tonalités pures sans fichiers externes mp3/wav (100% autonome et hors-ligne).
 * Les enveloppes ADSR sont calibrées pour être douces, distinctes et non anxiogènes au comptoir.
 */

class ClinicalAudioEngine {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {/* ignore autoplay restriction until user interaction */})
    }
    return this.ctx
  }

  /**
   * Bip de scan rapide et net (C5 -> G5)
   * Utilisé lors d'un scan code-barres réussi au comptoir express.
   */
  public playScanSuccess() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now) // C5
    osc1.frequency.setValueAtTime(783.99, now + 0.06) // G5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

    osc1.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.16)
  }

  /**
   * Alerte de précaution / allergie (accord majeur doux en arpège)
   * A4 -> C#5 -> E5
   */
  public playWarningAlert() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [440.0, 554.37, 659.25] // A4, C#5, E5

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.05
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, noteTime)

      gain.gain.setValueAtTime(0.001, noteTime)
      gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteTime)
      osc.stop(noteTime + 0.22)
    })
  }

  /**
   * Alerte critique de contre-indication absolue / surdosage
   * Tonalité distincte mais non stressante (D4 -> F4 pulsé avec harmonique)
   */
  public playCriticalAlert() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const oscHarmonic = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    oscHarmonic.type = 'sine'

    osc.frequency.setValueAtTime(293.66, now) // D4
    osc.frequency.setValueAtTime(349.23, now + 0.12) // F4
    oscHarmonic.frequency.setValueAtTime(587.33, now) // D5

    // Filtre passe-bas pour adoucir le timbre
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03)
    gain.gain.setValueAtTime(0.15, now + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(filter)
    oscHarmonic.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    oscHarmonic.start(now)
    osc.stop(now + 0.35)
    oscHarmonic.stop(now + 0.35)
  }

  /**
   * Carillon de validation d'ordonnance complète (accord majeur résolu)
   */
  public playValidationSuccess() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.04
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteTime)

      gain.gain.setValueAtTime(0.001, noteTime)
      gain.gain.linearRampToValueAtTime(0.08, noteTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteTime)
      osc.stop(noteTime + 0.3)
    })
  }
}

export const clinicalAudio = new ClinicalAudioEngine()
