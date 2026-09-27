export type ScheduleLevel =
  | 'LISTE_I'
  | 'LISTE_II'
  | 'STUPEFIANTS'
  | 'PSYCHOTROPES_TAB_I'
  | 'PSYCHOTROPES_TAB_II'
  | 'PSYCHOTROPES_TAB_III'
  | 'PRECURSEURS'

export interface ControlledSubstance {
  dci: string
  dciKey: string // normalized uppercase no accents
  schedule: ScheduleLevel
  brands: string[] // known Algerian brands from the registry
  dispensingRules: string[] // specific rules for dispensing
  prescriptionType: string // type of prescription required
  maxDuration: string // max prescription duration
  renewability: string // can it be renewed?
  storage: string // storage requirements
  notes: string[] // additional notes
}

export const SCHEDULE_META: Record<
  ScheduleLevel,
  { label: string; color: string; icon: string; rules: string[] }
> = {
  STUPEFIANTS: {
    label: 'Stupéfiants (Tableau)',
    color: 'bg-destructive/15 text-destructive border-destructive/20', // red equivalent
    icon: 'TriangleAlert',
    rules: [
      'Ordonnance sécurisée (carnet à souches) obligatoire.',
      'Prescription en toutes lettres (doses, posologie).',
      'Durée de prescription limitée selon molécule (ex: 28, 14 ou 7 jours).',
      'Non renouvelable sans nouvelle prescription.',
      'Inscription à l\'ordonnancier.',
    ],
  },
  PSYCHOTROPES_TAB_I: {
    label: 'Psychotropes (Tableau I)',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: 'AlertCircle',
    rules: [
      'Soumis à réglementation très stricte.',
    ],
  },
  PSYCHOTROPES_TAB_II: {
    label: 'Psychotropes (Tableau II)',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: 'AlertCircle',
    rules: [
      'Soumis à réglementation stricte.',
    ],
  },
  PSYCHOTROPES_TAB_III: {
    label: 'Psychotropes (Tableau III)',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: 'AlertCircle',
    rules: [
      'Ordonnance simple possible selon les directives (ou parfois ordonnance sécurisée selon les cas particuliers).',
    ],
  },
  LISTE_I: {
    label: 'Liste I',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: 'FileWarning',
    rules: [
      'Substances toxiques.',
      'Ordonnance simple non renouvelable, sauf mention contraire du prescripteur.',
      'Validité de l\'ordonnance limitée (ex: 1 an max).',
    ],
  },
  LISTE_II: {
    label: 'Liste II',
    color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    icon: 'FileText',
    rules: [
      'Substances dangereuses.',
      'Renouvelable par défaut, sauf indication contraire.',
    ],
  },
  PRECURSEURS: {
    label: 'Précurseurs',
    color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
    icon: 'Beaker',
    rules: [
      'Surveillance stricte des quantités.',
      'Inscription obligatoire au registre.',
    ],
  },
}

export const PSYCHOTROPES_DATA: ControlledSubstance[] = [
  // STUPÉFIANTS
  {
    dci: 'MORPHINE',
    dciKey: 'MORPHINE',
    schedule: 'STUPEFIANTS',
    brands: ['MOSCONTIN', 'SKENAN', 'ACTISKENAN'],
    dispensingRules: [
      'Vérifier la validité de l\'ordonnance sécurisée',
      'Vérifier que les quantités et posologies sont en TOUTES LETTRES',
      'Délivrance dans un délai restreint (selon réglementation locale, souvent 3 jours)',
      'Inscription obligatoire à l\'ordonnancier des stupéfiants',
    ],
    prescriptionType: 'Ordonnance sécurisée (carnet à souches)',
    maxDuration: '28 jours maximum (parfois 14j ou 7j selon forme)',
    renewability: 'Non renouvelable',
    storage: 'Armoire forte sécurisée (coffre)',
    notes: ['Tolérance zéro pour les erreurs sur l\'ordonnance.'],
  },
  {
    dci: 'FENTANYL',
    dciKey: 'FENTANYL',
    schedule: 'STUPEFIANTS',
    brands: ['DUROGESIC'],
    dispensingRules: [
      'Prescription en toutes lettres',
      'Rapporter les dispositifs (patchs) usagés souvent requis',
      'Inscription à l\'ordonnancier',
    ],
    prescriptionType: 'Ordonnance sécurisée',
    maxDuration: '28 jours (fractionnement 14 jours)',
    renewability: 'Non renouvelable',
    storage: 'Armoire forte sécurisée',
    notes: ['Risque élevé de détournement.'],
  },
  {
    dci: 'OXYCODONE',
    dciKey: 'OXYCODONE',
    schedule: 'STUPEFIANTS',
    brands: ['OXYCONTIN'],
    dispensingRules: [
      'Prescription en toutes lettres',
      'Inscription à l\'ordonnancier',
    ],
    prescriptionType: 'Ordonnance sécurisée',
    maxDuration: '28 jours',
    renewability: 'Non renouvelable',
    storage: 'Armoire forte sécurisée',
    notes: [],
  },
  {
    dci: 'CODÉINE',
    dciKey: 'CODEINE',
    schedule: 'LISTE_I',
    brands: ['CODOLIPRANE', 'KLIPAL', 'DAFALGAN CODEINE'],
    dispensingRules: [
      'Vérifier l\'absence d\'interaction avec d\'autres dépresseurs du SNC',
    ],
    prescriptionType: 'Ordonnance simple (Liste I)',
    maxDuration: '12 mois',
    renewability: 'Sauf indication contraire, selon mention du prescripteur (parfois non renouvelable selon le dosage)',
    storage: 'Normal / Hors de portée du public',
    notes: ['En Algérie, souvent assimilée Liste I stricte.'],
  },
  {
    dci: 'TRAMADOL',
    dciKey: 'TRAMADOL',
    schedule: 'LISTE_I',
    brands: ['CONTRAMAL', 'TOPALGIC', 'IXPRIM', 'TRAMADOL EG'],
    dispensingRules: [
      'Information du patient sur les risques de dépendance',
    ],
    prescriptionType: 'Ordonnance simple (Liste I)',
    maxDuration: '12 mois (ou spécifique selon réglementation récente)',
    renewability: 'Selon indication médicale',
    storage: 'Normal',
    notes: ['Fort risque d\'abus en Algérie, surveillance accrue recommandée.'],
  },
  {
    dci: 'MÉTHADONE',
    dciKey: 'METHADONE',
    schedule: 'STUPEFIANTS',
    brands: [],
    dispensingRules: [
      'Délivrance quotidienne souvent requise au début',
      'Inscription à l\'ordonnancier',
    ],
    prescriptionType: 'Ordonnance sécurisée',
    maxDuration: '14 jours',
    renewability: 'Non renouvelable',
    storage: 'Armoire forte sécurisée',
    notes: ['Souvent gérée en centre spécialisé ou avec protocole spécifique.'],
  },
  {
    dci: 'MÉTHYLPHÉNIDATE',
    dciKey: 'METHYLPHENIDATE',
    schedule: 'STUPEFIANTS',
    brands: ['RITALINE', 'CONCERTA'],
    dispensingRules: [
      'Prescription initiale hospitalière ou par un spécialiste (neurologue, psychiatre, pédiatre)',
      'Ordonnance en toutes lettres',
    ],
    prescriptionType: 'Ordonnance sécurisée',
    maxDuration: '28 jours',
    renewability: 'Non renouvelable',
    storage: 'Armoire forte sécurisée',
    notes: [],
  },
  // PSYCHOTROPES
  {
    dci: 'DIAZÉPAM',
    dciKey: 'DIAZEPAM',
    schedule: 'LISTE_II', // Often listed as List II but regulated as psychotropic
    brands: ['VALIUM'],
    dispensingRules: [
      'Conseil sur le risque de somnolence',
    ],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '12 semaines (recommandé pour anxiolytiques)',
    renewability: 'Renouvelable (12 mois max de validité)',
    storage: 'Normal / Sécurisé selon organisation',
    notes: ['Tolérance/dépendance si usage prolongé.'],
  },
  {
    dci: 'ALPRAZOLAM',
    dciKey: 'ALPRAZOLAM',
    schedule: 'LISTE_II',
    brands: ['XANAX'],
    dispensingRules: [],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '12 semaines',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'BROMAZÉPAM',
    dciKey: 'BROMAZEPAM',
    schedule: 'LISTE_II',
    brands: ['LEXOMIL'],
    dispensingRules: [],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '12 semaines',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'ZOLPIDEM',
    dciKey: 'ZOLPIDEM',
    schedule: 'LISTE_II', // Often stricter rules apply locally
    brands: ['STILNOX'],
    dispensingRules: [],
    prescriptionType: 'Ordonnance simple (parfois assimilée stup en réglementation)',
    maxDuration: '28 jours (recommandé pour hypnotiques)',
    renewability: 'Non renouvelable ou restreint',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'CLONAZEPAM',
    dciKey: 'CLONAZEPAM',
    schedule: 'LISTE_II',
    brands: ['RIVOTRIL'],
    dispensingRules: [
      'Prescription initiale souvent réservée aux spécialistes (neurologues, pédiatres)',
    ],
    prescriptionType: 'Ordonnance simple / réglementée',
    maxDuration: '12 semaines',
    renewability: 'Selon avis du spécialiste',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'PHÉNOBARBITAL',
    dciKey: 'PHENOBARBITAL',
    schedule: 'LISTE_II',
    brands: ['GARDÉNAL'],
    dispensingRules: [],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '12 mois',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'MIDAZOLAM',
    dciKey: 'MIDAZOLAM',
    schedule: 'LISTE_II',
    brands: ['HYPNOVEL'],
    dispensingRules: [],
    prescriptionType: 'Usage hospitalier ou spécifique',
    maxDuration: 'Très restreint',
    renewability: 'Non',
    storage: 'Sécurisé',
    notes: [],
  },
  {
    dci: 'PRÉGABALINE',
    dciKey: 'PREGABALINE',
    schedule: 'LISTE_II', // often treated very strictly due to abuse
    brands: ['LYRICA'],
    dispensingRules: [
      'Forte surveillance due à l\'abus important en Algérie ("Saroukh")',
    ],
    prescriptionType: 'Ordonnance simple (parfois surveillée)',
    maxDuration: 'Selon indication',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: ['Risque majeur de détournement.'],
  },
  {
    dci: 'CLOZAPINE',
    dciKey: 'CLOZAPINE',
    schedule: 'LISTE_I', // Reserve hospitaliere
    brands: ['LEPONEX'],
    dispensingRules: [
      'NFS (Numération Formule Sanguine) obligatoire',
      'Vérifier l\'absence d\'agranulocytose',
      'Carnet de suivi du patient',
    ],
    prescriptionType: 'Ordonnance d\'exception / Réserve hospitalière (ou PIH)',
    maxDuration: '28 jours (avec NFS mensuelle)',
    renewability: 'Nécessite NFS',
    storage: 'Normal',
    notes: ['Surveillance hématologique stricte indispensable.'],
  },
  // LISTE I
  {
    dci: 'ISOTRÉTINOÏNE',
    dciKey: 'ISOTRETINOINE',
    schedule: 'LISTE_I',
    brands: ['CURACNE', 'ACNETRAIT'],
    dispensingRules: [
      'PGR (Programme de Gestion des Risques)',
      'Test de grossesse négatif datant de moins de 3 jours avant chaque prescription',
      'Contraception efficace obligatoire (1 mois avant, pendant, 1 mois après)',
      'Délivrance dans les 7 jours suivant la prescription',
    ],
    prescriptionType: 'Ordonnance avec accord de soins et carnet-patiente',
    maxDuration: '1 mois',
    renewability: 'Non, nécessite nouvelle ordonnance et nouveau test de grossesse',
    storage: 'Normal',
    notes: ['Tératogénicité absolue.'],
  },
  {
    dci: 'MISOPROSTOL',
    dciKey: 'MISOPROSTOL',
    schedule: 'LISTE_I',
    brands: ['CYTOTEC'],
    dispensingRules: [
      'Usage strictement encadré (gastro-entérologie, gynécologie)',
    ],
    prescriptionType: 'Prescription restreinte',
    maxDuration: 'Selon protocole',
    renewability: 'Restreint',
    storage: 'Normal',
    notes: ['Risque de mésusage (IVG clandestine).'],
  },
  {
    dci: 'WARFARINE',
    dciKey: 'WARFARINE',
    schedule: 'LISTE_I',
    brands: ['COUMADINE'],
    dispensingRules: [
      'Contrôle INR régulier obligatoire',
      'Conseil sur l\'alimentation (aliments riches en Vit K)',
      'Carnet de suivi',
    ],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '1 an (avec surveillance INR)',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'ACÉNOCOUMAROL',
    dciKey: 'ACENOCOUMAROL',
    schedule: 'LISTE_I',
    brands: ['SINTROM'],
    dispensingRules: [
      'Contrôle INR obligatoire',
      'Carnet de suivi',
    ],
    prescriptionType: 'Ordonnance simple',
    maxDuration: '1 an',
    renewability: 'Renouvelable',
    storage: 'Normal',
    notes: [],
  },
  {
    dci: 'MÉTHOTREXATE',
    dciKey: 'METHOTREXATE',
    schedule: 'LISTE_I',
    brands: [],
    dispensingRules: [
      'Prise HEBDOMADAIRE (très important de préciser le jour)',
      'Bilan pré-thérapeutique (NFS, hépatique, rénal)',
      'Association avec Acide Folique souvent prescrite',
    ],
    prescriptionType: 'Ordonnance simple (spécialiste)',
    maxDuration: 'Selon maladie',
    renewability: 'Renouvelable avec surveillance',
    storage: 'Normal',
    notes: ['Attention aux erreurs mortelles de prise quotidienne au lieu d\'hebdomadaire.'],
  },
  // PRÉCURSEURS
  {
    dci: 'PSEUDOÉPHÉDRINE',
    dciKey: 'PSEUDOEPHEDRINE',
    schedule: 'PRECURSEURS',
    brands: ['RHUMAFED', 'DOLIRHUME'], // just examples
    dispensingRules: [
      'Restriction quantitative à la délivrance',
      'Contre-indiqué en cas d\'hypertension sévère, ATCD AVC',
      'Enregistrement parfois requis au registre des ventes',
    ],
    prescriptionType: 'Sans ordonnance / Ordonnance simple (selon dosage/association)',
    maxDuration: '5 jours (conseillé pour rhume)',
    renewability: 'Non',
    storage: 'Normal',
    notes: ['Risque de détournement pour synthèse illicite.'],
  },
  {
    dci: 'ÉPHÉDRINE',
    dciKey: 'EPHEDRINE',
    schedule: 'PRECURSEURS',
    brands: [],
    dispensingRules: [
      'Surveillance des quantités',
    ],
    prescriptionType: 'Réglementé',
    maxDuration: 'Restreint',
    renewability: 'Non',
    storage: 'Sécurisé',
    notes: [],
  },
]
