/**
 * D-01 — Contrôleur de Contraste Automatisé (WCAG 2.1 AA & AAA).
 * Implémente la formule officielle W3C de luminance relative pour valider
 * mathématiquement la lisibilité des textes cliniques, des bordures et
 * des 7 états de gravité invariables.
 */

export interface ContrastResult {
  fgHex: string
  bgHex: string
  ratio: number
  passAaNormal: boolean
  passAaLarge: boolean
  passAaaNormal: boolean
  passAaaLarge: boolean
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ]
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function srgbToLinear(c: number): number {
  const val = c / 255
  return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
}

/** Calcule la luminance relative W3C (0.0 pour le noir, 1.0 pour le blanc pur) */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

/** Calcule le ratio de contraste entre deux couleurs hexadécimales (1:1 à 21:1) */
export function calculateContrast(fgHex: string, bgHex: string): ContrastResult {
  const l1 = getRelativeLuminance(fgHex)
  const l2 = getRelativeLuminance(bgHex)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  const ratio = (lighter + 0.05) / (darker + 0.05)
  const rounded = Math.round(ratio * 100) / 100

  return {
    fgHex,
    bgHex,
    ratio: rounded,
    passAaNormal: rounded >= 4.5,
    passAaLarge: rounded >= 3.0,
    passAaaNormal: rounded >= 7.0,
    passAaaLarge: rounded >= 4.5,
  }
}

/**
 * Audit des 7 couleurs de gravité clinique (Règle R4 Invariable).
 * Vérifie que chaque texte sur son fond dépasse le seuil réglementaire WCAG AA.
 */
export const CLINICAL_SEVERITY_CONTRAST_MATRIX = [
  { level: 'SAFE / COMPATIBLE', fg: '#166534', bg: '#dcfce7', label: 'Compatible / Sûr' },
  { level: 'PRECAUTION', fg: '#854d0e', bg: '#fef9c3', label: 'Prudence d’emploi' },
  { level: 'WARNING / MODEREE', fg: '#9a3412', bg: '#ffedd5', label: 'Association déconseillée' },
  { level: 'DANGER / CONTRE-INDIQUE', fg: '#991b1b', bg: '#fee2e2', label: 'Contre-indication absolue' },
  { level: 'INFO', fg: '#1e40af', bg: '#dbeafe', label: 'Information clinique' },
  { level: 'SPECIAL', fg: '#5b21b6', bg: '#ede9fe', label: 'Surveillance biologique' },
  { level: 'NEUTRAL', fg: '#1f2937', bg: '#f3f4f6', label: 'Données insuffisantes' },
].map((item) => ({
  ...item,
  contrast: calculateContrast(item.fg, item.bg),
}))

/** Exécute l'audit complet et renvoie true si 100% des gravités sont conformes WCAG AA */
export function verifyClinicalPaletteIntegrity(): boolean {
  return CLINICAL_SEVERITY_CONTRAST_MATRIX.every((m) => m.contrast.passAaNormal)
}
