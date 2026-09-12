/**
 * Armoire familiale — constantes d'UI et de domaine.
 * Aucune donnée clinique ici : uniquement des libellés, icônes et seuils
 * de rangement/organisation (les seuils d'alerte expiration sont des
 * réglages d'organisation, pas des valeurs cliniques).
 */
import {
  Briefcase,
  Citrus,
  Droplets,
  Lightbulb,
  Package,
  Repeat,
  ShieldAlert,
  Shirt,
  Snowflake,
  Sprout,
  Sun,
  Backpack,
  Baby,
  User,
  User2,
  type LucideIcon,
} from 'lucide-react'
import type { ArmoireCategory, ArmoireKit, ArmoireRelation, ArmoireSexe, ExpiryReminders } from './types'

/* ------------------------------------------------------------------ */
/* Limites garde-fous                                                  */
/* ------------------------------------------------------------------ */

export const MAX_MEMBERS = 8
export const MAX_ENTRIES = 80
export const MAX_ALLERGIES = 8
export const MAX_MALADIES = 10
export const MAX_NOTES_CHARS = 200
export const MAX_MEMBER_NOTES_CHARS = 1000
export const MAX_JOURNAL = 20

/** Clés localStorage propres à l'armoire (hors store persisté). */
export const CONSENT_KEY = 'armoire.consent.v1'
export const PIN_KEY = 'armoire.pin.v1'
export const FIRST_AID_KEY = 'armoire.firstAid.v1'
export const REMINDERS_KEY = 'armoire.remind.v1'

export const DEFAULT_REMINDERS: ExpiryReminders = { d7: true, d30: true, d90: false }

/* ------------------------------------------------------------------ */
/* Sexe (plan 2.1)                                                     */
/* ------------------------------------------------------------------ */

export const SEXE_META: Record<ArmoireSexe, { label: string; icon: LucideIcon; hint: string }> = {
  homme: { label: 'Homme', icon: User, hint: 'Grossesse/Allaitement non affichés.' },
  femme: { label: 'Femme', icon: User2, hint: 'Grossesse et Allaitement disponibles.' },
}

/* ------------------------------------------------------------------ */
/* Maladies / antécédents — liste de départ (plan 2.3)                 */
/* ------------------------------------------------------------------ */

/**
 * Liste de départ issue des 24 domaines thérapeutiques DzPharm.
 * Texte libre toujours autorisé en supplément.
 */
export const MALADIES_PRESETS: string[] = [
  'Diabète',
  'Hypertension',
  'Cardiovasculaire',
  'Asthme / BPCO',
  'Allergies respiratoires',
  'Épilepsie',
  'Dépression / Anxiété',
  'Psychose / Schizophrénie',
  'Cancer',
  'Insuffisance rénale',
  'Insuffisance hépatique',
  'Hypothyroïdie',
  'Dyslipidémie / Hypercholestérolémie',
  'Douleur chronique',
  'Arthrose / Rhumatisme',
  'Ostéoporose',
  'Maladie auto-immune',
  'Transplantation',
  'Infection chronique (VIH, hépatites…)',
  'Anémie',
  'Trouble de la coagulation',
  'Reflux / Gastro-entérologie',
  'Dermatologie chronique',
  'Ophtalmologie chronique',
]

/* ------------------------------------------------------------------ */
/* PAO — Période après ouverture (plan 2.6)                            */
/* ------------------------------------------------------------------ */

/**
 * Valeurs PAO suggérées (en jours) selon la forme galénique.
 * Ces valeurs sont générales — l'utilisateur doit toujours
 * vérifier la notice spécifique du produit.
 * Source : bonnes pratiques officinales / plan armoire-enhancement-plan.md §2.6.
 */
export const PAO_DEFAULTS: { pattern: RegExp; jours: number; note: string }[] = [
  {
    pattern: /collyre|eye drop|ophtalmique/i,
    jours: 28,
    note: 'Collyres : 28 jours après ouverture (vérifiez la notice).',
  },
  {
    pattern: /insuline|insulin/i,
    jours: 28,
    note: 'Insuline en stylo/flacon : 28 jours en général (vérifiez la notice).',
  },
  {
    pattern: /sirop|suspension|reconstitu/i,
    jours: 10,
    note: 'Sirops reconstitués : 7–14 jours ; respectez la notice.',
  },
  {
    pattern: /creme|pommade|gel|lotion|emulsion/i,
    jours: 90,
    note: 'Crèmes/pommades : 3–6 mois en général (vérifiez la notice).',
  },
  {
    pattern: /spray nasal|spray buccal|aerosolther/i,
    jours: 30,
    note: 'Sprays nasaux : quelques semaines à 3 mois (vérifiez la notice).',
  },
]

/**
 * Retourne la PAO suggérée en jours pour une forme galénique donnée,
 * ou null si aucun patron ne correspond (comprimés, gélules…).
 */
export function suggestPao(form: string): { jours: number; note: string } | null {
  const match = PAO_DEFAULTS.find((p) => p.pattern.test(form))
  return match ? { jours: match.jours, note: match.note } : null
}


/* ------------------------------------------------------------------ */
/* Catégories (plan 3.3)                                               */
/* ------------------------------------------------------------------ */

export const CATEGORY_META: Record<
  ArmoireCategory,
  { label: string; icon: LucideIcon; hint: string; badgeClass: string }
> = {
  chronique: {
    label: 'Traitement chronique',
    icon: Repeat,
    hint: 'Pris régulièrement — surveillez le stock et les renouvellements.',
    badgeClass: 'border-primary/30 bg-primary/5 text-primary',
  },
  besoin: {
    label: 'Au besoin',
    icon: Lightbulb,
    hint: 'Reservé aux symptômes ponctuels.',
    badgeClass: 'border-border bg-muted/60 text-muted-foreground',
  },
  trousse: {
    label: 'Trousse de secours',
    icon: Briefcase,
    hint: 'Urgences familiales — vérifiez la péremption régulièrement.',
    badgeClass: 'border-state-warning/30 bg-state-warning/10 text-state-warning',
  },
  parapharmacie: {
    label: 'Parapharmacie',
    icon: Package,
    hint: 'Produits sans prescription médicale.',
    badgeClass: 'border-chifa/30 bg-chifa/10 text-chifa',
  },
  controle: {
    label: 'Stupéfiants & contrôlés',
    icon: ShieldAlert,
    hint: 'Liste contrôlée — accès et conservation renforcés (sécurité famille).',
    badgeClass: 'border-state-danger/30 bg-state-danger/10 text-state-danger',
  },
}

export const CATEGORY_ORDER: ArmoireCategory[] = [
  'chronique',
  'besoin',
  'trousse',
  'parapharmacie',
  'controle',
]

/* ------------------------------------------------------------------ */
/* Kits de rangement (plan 3.3)                                        */
/* ------------------------------------------------------------------ */

export const KIT_META: Record<ArmoireKit, { label: string; icon: LucideIcon }> = {
  cuisine: { label: 'Cuisine', icon: Citrus },
  sdb: { label: 'Salle de bain', icon: Droplets },
  frigo: { label: 'Réfrigérateur', icon: Snowflake },
  voyage: { label: 'Trousse de voyage', icon: Shirt },
  auto: { label: 'Trousse auto', icon: Sprout },
  cartable: { label: 'Cartable enfant', icon: Backpack },
}

export const KIT_ORDER: ArmoireKit[] = ['cuisine', 'sdb', 'frigo', 'voyage', 'auto', 'cartable']

/* ------------------------------------------------------------------ */
/* Membres                                                             */
/* ------------------------------------------------------------------ */

export const RELATION_META: Record<
  ArmoireRelation,
  { label: string; icon: LucideIcon; hint: string }
> = {
  adulte: { label: 'Adulte', icon: User, hint: '16 ans et plus' },
  enfant: { label: 'Enfant', icon: Sun, hint: '2 à 15 ans' },
  bebe: { label: 'Bébé', icon: Baby, hint: 'Moins de 2 ans' },
}

/** Palette d'avatars — identifiants stables, classes Tailwind explicites. */
export const MEMBER_COLORS: { id: string; dot: string; chip: string }[] = [
  { id: 'rose', dot: 'bg-rose-500', chip: 'bg-rose-500/15 text-rose-600' },
  { id: 'amber', dot: 'bg-amber-500', chip: 'bg-amber-500/15 text-amber-600' },
  { id: 'emerald', dot: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-600' },
  { id: 'cyan', dot: 'bg-cyan-600', chip: 'bg-cyan-600/15 text-cyan-700' },
  { id: 'violet', dot: 'bg-violet-500', chip: 'bg-violet-500/15 text-violet-600' },
  { id: 'orange', dot: 'bg-orange-500', chip: 'bg-orange-500/15 text-orange-600' },
  { id: 'teal', dot: 'bg-teal-600', chip: 'bg-teal-600/15 text-teal-700' },
  { id: 'fuchsia', dot: 'bg-fuchsia-500', chip: 'bg-fuchsia-500/15 text-fuchsia-600' },
]

export function memberColor(colorId: string): { dot: string; chip: string } {
  return MEMBER_COLORS.find((c) => c.id === colorId) ?? MEMBER_COLORS[0]
}

/** Allergies courantes proposées en suggestion (texte libre autorisé). */
export const ALLERGY_PRESETS: string[] = [
  'Pénicillines',
  'Sulfamides',
  'Aspirine / AINS',
  'Paracétamol',
  'Iode',
  'Latex',
  'Arachide',
  'Pollen',
]

/* ------------------------------------------------------------------ */
/* Trousse de secours (audit 4.1 — items NON médicamenteux)            */
/* ------------------------------------------------------------------ */

export const FIRST_AID_ITEMS: { id: string; label: string }[] = [
  { id: 'pansements', label: 'Pansements adhésifs (tailles variées)' },
  { id: 'compresses', label: 'Compresses stériles' },
  { id: 'antiseptique', label: 'Antiseptique cutané' },
  { id: 'serum', label: 'Sérum physiologique' },
  { id: 'thermometre', label: 'Thermomètre' },
  { id: 'ciseaux', label: 'Ciseaux à bouts ronds' },
  { id: 'pince', label: 'Pince à épiler / à échardes' },
  { id: 'gants', label: 'Gants jetables' },
  { id: 'bande', label: 'Bande de contention' },
  { id: 'couverture', label: 'Couverture de survie' },
  { id: 'sac', label: 'Sac plastique hermétique' },
  { id: 'sparadrap', label: 'Sparadrap' },
]

/* ------------------------------------------------------------------ */
/* Conseils saisonniers (organisation domestique, pas clinique)        */
/* ------------------------------------------------------------------ */

export function getSeasonalTips(date: Date): { season: string; tips: string[] } {
  const m = date.getMonth() + 1
  if (m >= 6 && m <= 9) {
    return {
      season: 'Été',
      tips: [
        'Conservez les médicaments à l’abri de la chaleur (≤ 25 °C sauf mention contraire).',
        'Les suspensions reconstituées se conservent généralement au réfrigérateur — respectez la notice.',
        'Avant de partir en vacances, vérifiez la trousse de voyage (kit dédié).',
      ],
    }
  }
  if (m === 10 || m === 11) {
    return {
      season: 'Rentrée',
      tips: [
        'Vérifiez la trousse du cartable enfant après la rentrée.',
        'Profitez du tri de rentrée pour retirer les produits périmés.',
      ],
    }
  }
  if (m === 12 || m <= 2) {
    return {
      season: 'Hiver',
      tips: [
        'Vérifiez les sirops ouverts : respectez la durée de conservation après ouverture indiquée sur la notice.',
        'Anticipez les traitements chroniques en période de fêtes (pharmacies de garde).',
      ],
    }
  }
  return {
    season: 'Printemps',
    tips: [
      'Grand nettoyage de printemps : triez les produits périmés et rapportez-les en pharmacie.',
      'Vérifiez les antihistaminiques avant la saison des pollens.',
    ],
  }
}
