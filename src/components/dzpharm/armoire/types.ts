/**
 * Armoire à Pharmacie Familiale — modèle de données v2.
 *
 * Conforme au plan « New Feature — Armoire à Pharmacie Familiale » :
 * Foyer → Membres (avec drapeaux cliniques) → Entrées (médicaments,
 * assignables à plusieurs membres, catégorisées, avec kits de rangement).
 *
 * Toutes les données restent LOCALES (localStorage via le store persisté).
 * Aucune donnée nominative ne quitte l'appareil — voir Réglages/Consentement.
 */

/** Relation d'un membre au foyer (bande d'âge implicite). */
export type ArmoireRelation = 'adulte' | 'enfant' | 'bebe'

/** Catégories de la 3.3 du plan. */
export type ArmoireCategory = 'chronique' | 'besoin' | 'trousse' | 'parapharmacie' | 'controle'

/** Kits de rangement (tags transverses, 3.3 du plan). */
export type ArmoireKit = 'cuisine' | 'sdb' | 'frigo' | 'voyage' | 'auto' | 'cartable'

/** Membre du foyer — les drapeaux alimentent les autres outils automatiquement. */
export interface ArmoireMember {
  id: string
  name: string
  relation: ArmoireRelation
  ageYears: number
  weightKg: number | null
  /** Couleur d'avatar (id de la palette ARMOIRE_MEMBER_COLORS). */
  color: string
  /** Grossesse → déclenche le contrôle CRAT sur ses entrées. */
  pregnant: boolean
  /** Allaitement → déclenche le contrôle CRAT (volet allaitement). */
  breastfeeding: boolean
  /** Insuffisance rénale chronique connue → renvoi vers Fonction rénale. */
  renal: boolean
  /** Allergies connues (texte libre, suggestions prédéfinies). */
  allergies: string[]
  /**
   * Visibilité restreinte (3.6 : granularité par membre). Les entrées d'un
   * membre restreint sont masquées derrière le verrou PIN de l'armoire.
   */
  restricted: boolean
  createdAt: number
}

/** Entrée d'armoire — un médicament physiquement présent au foyer. */
export interface ArmoireEntry {
  uid: string
  /** Id du répertoire (null = saisie manuelle OTC/parapharmacie). */
  drugId: number | null
  brand: string
  dci: string
  dciKey: string
  /** Statut registre — ou 'MANUEL' pour les entrées hors répertoire. */
  status: string
  form: string
  dosage: string
  category: ArmoireCategory
  /** Boîtes/unités restantes. */
  quantity: number
  /** Date d'expiration YYYY-MM-DD ('' si inconnue). */
  expiry: string
  /** Date d'ouverture / premier emploi YYYY-MM-DD ('' si inconnue). */
  openedAt: string
  /** Date d'achat YYYY-MM-DD ('' si inconnue). */
  purchasedAt: string
  /** Emplacements / kits de rangement. */
  kits: ArmoireKit[]
  /** Membres concernés — plusieurs = médicament partagé (ex. paracétamol familial). */
  memberIds: string[]
  /** N° de lot ('' si inconnu). */
  batch: string
  /** Référence d'ordonnance ('' si inconnue). */
  prescription: string
  /**
   * Estimation du traitement restant en jours (traitements chroniques,
   * alerte de renouvellement) — null = non suivi.
   */
  daysLeft: number | null
  /** Note libre (max 200 car.). */
  notes: string
  addedAt: number
  updatedAt: number
}

/** Payload de création de membre (id et date générés par le store). */
export type ArmoireMemberInput = Omit<ArmoireMember, 'id' | 'createdAt'>

/** Payload de création d'entrée — champs optionnels au défaut. */
export type ArmoireEntryInput = Omit<
  ArmoireEntry,
  'uid' | 'addedAt' | 'updatedAt' | 'quantity' | 'expiry' | 'openedAt' | 'purchasedAt' | 'kits' | 'memberIds' | 'batch' | 'prescription' | 'daysLeft' | 'notes' | 'category'
> &
  Partial<
    Pick<
      ArmoireEntry,
      | 'category'
      | 'quantity'
      | 'expiry'
      | 'openedAt'
      | 'purchasedAt'
      | 'kits'
      | 'memberIds'
      | 'batch'
      | 'prescription'
      | 'daysLeft'
      | 'notes'
    >
  >

/** Types d'alertes calculées localement (jamais de données cliniques inventées). */
export type AlertKind =
  | 'expired'
  | 'expiring7'
  | 'expiring30'
  | 'withdrawn'
  | 'nonRenewed'
  | 'lowStock'
  | 'controle'
  | 'duplicate'
  | 'opened'

export interface CabinetAlert {
  kind: AlertKind
  uid: string
  /** Message court, sans données cliniques inventées. */
  message: string
}

/** Rappels d'expiration configurables (plan 3.4.6 : 7 / 30 / 90 jours). */
export interface ExpiryReminders {
  d7: boolean
  d30: boolean
  d90: boolean
}

/** Journal d'un contrôle d'analyse (local, 20 dernières entrées). */
export interface ArmoireJournalEntry {
  id: string
  at: number
  scope: string
  itemsCount: number
  interactions: number
  maxSeverity: string | null
  pregnancyAlerts: number
  cabinetAlerts: number
}

/** Onglets de l'armoire. */
export type ArmoireTab = 'apercu' | 'inventaire' | 'analyse' | 'urgence' | 'reglages'
