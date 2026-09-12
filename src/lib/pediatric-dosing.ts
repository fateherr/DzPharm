import type { PediatricDosing } from '@/components/dzpharm/types'

/**
 * Base de posologies pédiatriques pondérées — formulations commercialisées
 * en Algérie (nomenclature officielle). Sources : référentiels usuels
 * (OMS, dictionnaires de posologie pédiatrique) adaptés aux spécialités
 * locales. Outil d'aide — ne remplace pas la validation médicale.
 *
 * NOTE D'INTÉGRITÉ (alignement registre, session 2026-09) : les listes de
 * marques par forme ont été re-vérifiées ligne à ligne contre la base
 * nomenclature (statut ACTIF) ; les marques retirées / non renouvelées sont
 * isolées dans `withdrawnBrands`. AUCUNE valeur clinique (mg/kg, intervalles,
 * plafonds, âges minimaux) n'a été modifiée lors de cet alignement.
 */
export const PEDIATRIC_DRUGS: PediatricDosing[] = [
  {
    dci: 'Paracétamol',
    dciKey: 'PARACETAMOL',
    category: 'Antalgique',
    mgPerKgPerDose: 15,
    intervalH: 6,
    maxSingleMg: 1000,
    maxDailyMgPerKg: 60,
    maxDailyMg: 4000,
    minAgeMonths: 1,
    minWeightKg: 3,
    forms: [
      {
        label: 'Suspension buvable 120 mg/5 mL (2,4 %)',
        mg: 120,
        perVolumeMl: 5,
        brands: 'DOLIBON, DOLIPRANE 2,4 %, DOLYMEX, MIGRAMOL pédiatrique, PARALGAN',
      },
      { label: 'Solution buvable 100 mg/5 mL', mg: 100, perVolumeMl: 5, brands: 'ISOMOL' },
      {
        label: 'Sachet 100 mg (poudre pour solution buvable)',
        mg: 100,
        perVolumeMl: 0,
        brands: 'EXPANDOL, SAPRAMOL, PARALGAN, PARACETAMOL PHYSIOPHARM',
      },
      {
        label: 'Sachet 150 mg',
        mg: 150,
        perVolumeMl: 0,
        brands: 'EXPANDOL, PARACETAMOL BIOCARE, SAPRAMOL, PARACETAMOL PHYSIOPHARM',
      },
      { label: 'Suppositoire 100 mg', mg: 100, perVolumeMl: 0, brands: 'DOLIPRANE, DOLYMEX, PAROL, SUPPFADOL 100' },
      { label: 'Suppositoire 150 mg', mg: 150, perVolumeMl: 0, brands: 'DOLIPRANE, PARACETAMOL DBF, SUPPFADOL 150' },
      { label: 'Suppositoire 200 mg', mg: 200, perVolumeMl: 0, brands: 'DOLIPRANE, DOLYMEX, PAROL, SUPPFADOL 200' },
    ],
    warnings: [
      'Prise maximale : 4 prises par 24 h (espacement ≥ 6 h, 4 h possible exceptionnellement).',
      'Vérifier l\'absence d\'autres sources de paracétamol (sirops antitussifs, associations).',
      'Ne pas dépasser 3 g/j en cas de poids < 50 kg, insuffisance hépatique ou alcoolisme.',
    ],
    note: 'Antalgique-antipyrétique de première intention chez l\'enfant.',
  },
  {
    dci: 'Ibuprofène',
    dciKey: 'IBUPROFENE',
    category: 'Anti-inflammatoire (AINS)',
    mgPerKgPerDose: 10,
    intervalH: 8,
    maxSingleMg: 400,
    maxDailyMgPerKg: 30,
    maxDailyMg: 1200,
    minAgeMonths: 3,
    minWeightKg: 6,
    forms: [
      {
        label: 'Suspension buvable 100 mg/5 mL (20 mg/mL)',
        mg: 100,
        perVolumeMl: 5,
        brands:
          'ADVIFEN, ALGIFEN, ANTALFEN, ARDIL, CALMOFEN, IBUFEN, LAMIFENE, NARUFENE 2 %, NEUPREN, PACIFENE, POLYPHENE, RUMIFEN, XYDOL enfants et nourrissons',
      },
    ],
    withdrawnBrands: [
      'BRUFEN (sirop 100 mg/5 mL — non renouvelé)',
      'ADVIL (sirop — retiré)',
      'SAPOFEN JUNIOR (sirop 100 mg/5 mL — retiré)',
      'DOLORAZ (suspension 100 mg/5 mL — retirée)',
    ],
    warnings: [
      'Contre-indiqué avant 3 mois (et si poids < 6 kg).',
      'À éviter en cas de varicelle, déshydratation, asthme non contrôlé ou ulcère digestif.',
      'Ne pas associer à un autre AINS ni à l\'aspirine ; prendre pendant le repas.',
      'Arrêt et avis médical si douleur abdominale ou urines foncées.',
    ],
    note: 'Alternative au paracétamol après 3 mois ; durée maximale 3 jours en antipyrétique. Attention : ANTALFEN GYN (comprimé 100 mg) est du FLURBIPROFÈNE gynécologique, sans rapport avec le sirop ANTALFEN ibuprofène enfants.',
  },
  {
    dci: 'Amoxicilline',
    dciKey: 'AMOXICILLINE',
    category: 'Antibiotique (pénicilline)',
    mgPerKgPerDose: 25,
    intervalH: 8,
    maxSingleMg: 1000,
    maxDailyMgPerKg: 90,
    maxDailyMg: 3000,
    minAgeMonths: 1,
    forms: [
      { label: 'Suspension 125 mg/5 mL', mg: 125, perVolumeMl: 5, brands: 'AMOXICILLINE EG, AMOXYPEN' },
      { label: 'Suspension 250 mg/5 mL', mg: 250, perVolumeMl: 5, brands: 'AMOXIMEX, AMOXYPEN, AMOXICILLINE EG' },
    ],
    warnings: [
      'Otite moyenne aiguë : 80-90 mg/kg/j en 2 prises (dose renforcée) selon protocole.',
      'Vérifier l\'absence d\'allergie aux bêta-lactamines.',
      'Respecter la durée prescrite ; suspension reconstituée : 7-14 jours au réfrigérateur.',
    ],
  },
  {
    dci: 'Amoxicilline + acide clavulanique',
    dciKey: 'AMOXICILLINE ACIDE CLAVULANIQUE',
    category: 'Antibiotique (pénicilline + inhibiteur)',
    mgPerKgPerDose: 25,
    intervalH: 8,
    maxSingleMg: 875,
    maxDailyMgPerKg: 80,
    maxDailyMg: 2625,
    minAgeMonths: 2,
    forms: [
      { label: 'Suspension nourrisson 100 mg/12,5 mg par mL', mg: 100, perVolumeMl: 1, brands: 'AUGMENTIN, BIOCLAV, CLAMOCLAV, AMOCLAN' },
      { label: 'Suspension 250 mg/62,5 mg par 5 mL', mg: 250, perVolumeMl: 5, brands: 'CLAVODEX' },
    ],
    warnings: [
      'Dose exprimée en amoxicilline (composant actif principal).',
      'Diarrhée fréquente : probiotiques possibles, hydratation à surveiller.',
      'Prise au début du repas pour améliorer la tolérance.',
    ],
  },
  {
    dci: 'Azithromycine',
    dciKey: 'AZITHROMYCINE',
    category: 'Antibiotique (macrolide)',
    mgPerKgPerDose: 10,
    intervalH: 24,
    maxSingleMg: 500,
    maxDailyMgPerKg: 10,
    maxDailyMg: 500,
    minAgeMonths: 6,
    forms: [
      { label: 'Suspension 200 mg/5 mL (40 mg/mL)', mg: 200, perVolumeMl: 5, brands: 'ZOMAX, ZOTRIX' },
    ],
    warnings: [
      'Schéma usuel : 10 mg/kg une fois par jour pendant 3 jours.',
      'Allongement de l\'intervalle QT : prudence si cardiopathie ou association risquée.',
      'Prendre à jeun (1 h avant ou 2 h après le repas).',
    ],
  },
  {
    dci: 'Céfixime',
    dciKey: 'CEFIXIME',
    category: 'Antibiotique (céphalosporine orale)',
    mgPerKgPerDose: 4,
    intervalH: 12,
    maxSingleMg: 200,
    maxDailyMgPerKg: 8,
    maxDailyMg: 400,
    minAgeMonths: 6,
    forms: [
      { label: 'Suspension 40 mg/5 mL', mg: 40, perVolumeMl: 5, brands: 'OROKAL, CEFIMAX' },
      { label: 'Suspension 100 mg/5 mL', mg: 100, perVolumeMl: 5, brands: 'OROKAL, CEFIMAX' },
    ],
    warnings: [
      'Posologie totale : 8 mg/kg/j en 2 prises (4 mg/kg par prise).',
      'Utilisée en relais des céphalosporines injectables ou dans l\'otite à germe résistant.',
    ],
  },
  {
    dci: 'Clarithromycine',
    dciKey: 'CLARITHROMYCINE',
    category: 'Antibiotique (macrolide)',
    mgPerKgPerDose: 7.5,
    intervalH: 12,
    maxSingleMg: 500,
    maxDailyMgPerKg: 15,
    maxDailyMg: 1000,
    minAgeMonths: 6,
    forms: [
      { label: 'Suspension 125 mg/5 mL', mg: 125, perVolumeMl: 5, brands: 'CLARIDAR 125' },
      { label: 'Suspension 250 mg/5 mL', mg: 250, perVolumeMl: 5, brands: 'CLARIDAR 250, HUCLAR' },
    ],
    warnings: [
      'Posologie : 15 mg/kg/j en 2 prises pendant 5 à 10 jours.',
      'Nombreuses interactions (statines, anticoagulants) — vérifier le traitement associé.',
      'Goût amer : administrer avec un peu de nourriture.',
    ],
  },
  {
    dci: 'Cétirizine',
    dciKey: 'CETIRIZINE',
    category: 'Antihistaminique',
    bands: [
      { minMonths: 24, maxMonths: 71, doseMg: 2.5, perDay: 1, label: '2 à 5 ans : 2,5 mg (5 gouttes) une fois par jour' },
      { minMonths: 72, maxMonths: 143, doseMg: 5, perDay: 1, label: '6 à 11 ans : 5 mg (10 gouttes) une fois par jour' },
      { minMonths: 144, maxMonths: null, doseMg: 10, perDay: 1, label: '≥ 12 ans : 10 mg (20 gouttes) une fois par jour' },
    ],
    minAgeMonths: 24,
    forms: [
      { label: 'Gouttes buvables 10 mg/mL', mg: 10, perVolumeMl: 1, brands: 'ARTIZ, CETIRIPEX, CETIRIZINE GL' },
      { label: 'Sirop 5 mg/5 mL (si disponible)', mg: 5, perVolumeMl: 5, brands: 'selon laboratoire' },
    ],
    warnings: [
      'Non recommandé avant 2 ans.',
      'Prudence en cas d\'insuffisance rénale (espacer les prises).',
      'Peut provoquer une légère somnolence : prudence à l\'école et en cas de conduite.',
    ],
  },
  {
    dci: 'Salbutamol (voie orale)',
    dciKey: 'SALBUTAMOL',
    category: 'Bronchodilatateur',
    mgPerKgPerDose: 0.1,
    intervalH: 8,
    maxSingleMg: 4,
    maxDailyMgPerKg: 0.3,
    maxDailyMg: 12,
    minAgeMonths: 6,
    forms: [
      { label: 'Sirop 2 mg/5 mL (0,4 mg/mL)', mg: 2, perVolumeMl: 5, brands: 'KOXMA, RABWALYSE' },
    ],
    warnings: [
      'La voie inhalée (aérosol/chambre d\'inhalation) est toujours préférée.',
      'Si le sirop est utilisé 3 fois/j sans efficacité : avis médical urgent.',
      'Surveiller tachycardie, tremblements et agitation.',
    ],
  },
  {
    dci: 'Prednisolone',
    dciKey: 'PREDNISOLONE',
    category: 'Corticoïde systémique',
    mgPerKgPerDose: 1,
    intervalH: 24,
    maxSingleMg: 60,
    maxDailyMgPerKg: 2,
    maxDailyMg: 60,
    minAgeMonths: 6,
    forms: [
      { label: 'Solution buvable 1 mg/mL', mg: 1, perVolumeMl: 1, brands: 'CORTIDAL, PHYSIOLONE' },
      { label: 'Solution buvable 15 mg/5 mL (3 mg/mL)', mg: 15, perVolumeMl: 5, brands: 'PREDO, CORTIDAL' },
    ],
    warnings: [
      'Dose d\'attaque usuelle : 1 à 2 mg/kg/j en une prise matinale.',
      'Ne jamais arrêter brutalement après plus de 10 jours de traitement.',
      'Avertissement : surveillance de la croissance, de la glycémie et de la tension.',
    ],
  },
  {
    dci: 'Dompéridone',
    dciKey: 'DOMPERIDONE',
    category: 'Antiémétique / prokinétique',
    mgPerKgPerDose: 0.25,
    intervalH: 8,
    maxSingleMg: 10,
    maxDailyMgPerKg: 0.75,
    maxDailyMg: 30,
    minAgeMonths: 12,
    minWeightKg: 12,
    forms: [
      { label: 'Suspension buvable 1 mg/mL', mg: 1, perVolumeMl: 1, brands: 'DOMPERIDONE BGL, DOPRIN, DOMPERIMEX' },
    ],
    warnings: [
      'Contre-indiquée chez le nourrisson < 1 an / < 12 kg.',
      'Durée maximale : 1 semaine — risque cardiaque (allongement QT).',
      'Ne pas associer aux macrolides ou azolés antifongiques.',
    ],
  },
  {
    dci: 'Fer (hydroxyde ferrique polymaltose)',
    dciKey: 'HYDROXYDE FERRIQUE POLYMALTOSE',
    category: 'Supplémentation martiale',
    mgPerKgPerDose: 3,
    intervalH: 24,
    maxDailyMgPerKg: 6,
    maxDailyMg: 200,
    minAgeMonths: 2,
    forms: [
      { label: 'Sirop 50 mg de fer/5 mL (10 mg/mL)', mg: 50, perVolumeMl: 5, brands: 'GEOFER, FERRUM HAUSMANN, KINADYN FER' },
      { label: 'Solution buvable 100 mg de fer/5 mL (20 mg/mL)', mg: 100, perVolumeMl: 5, brands: 'TRIFER, FER 3+, FERROCURE' },
    ],
    warnings: [
      'Posologie : 3 mg/kg/j de fer élémentaire en 1 à 2 prises (anémie ferriprive).',
      'Administrer à distance du lait et du thé ; associer à la vitamine C.',
      'Éloigner impérativement des jeunes enfants (risque d\'intoxication grave).',
      'Selles noires possibles, sans gravité.',
    ],
  },
  {
    dci: 'Vitamine D3 (cholécalciférol)',
    dciKey: 'CHOLECALCIFEROL',
    category: 'Vitamine',
    bands: [
      { minMonths: 0, maxMonths: 0, doseMg: 0, perDay: 1, label: 'Né prématuré : 800 à 1 000 UI/j — avis médical' },
      { minMonths: 0, maxMonths: 18, doseMg: 0, perDay: 1, label: 'Nourrisson (0-18 mois) : 400 à 800 UI/j en prévention' },
      { minMonths: 18, maxMonths: 60, doseMg: 0, perDay: 1, label: 'Enfant (18 mois-5 ans) : 400 UI/j en hiver ou en cas de carence' },
    ],
    forms: [
      { label: 'Gouttes buvables (UI/mL selon spécialité)', mg: 0, perVolumeMl: 1, brands: 'selon spécialité (ZYMAD, UVESTEROL…)' },
    ],
    warnings: [
      'Ne pas dépasser les doses préventives sans contrôle de la 25-OH-vitamine D.',
      'Vérifier la spécialité : les concentrations varient fortement (UI/goutte).',
    ],
    note: 'Les doses étant exprimées en UI (unités internationales), reportez-vous à la notice de la spécialité pour la conversion en gouttes.',
  },
  {
    dci: 'Albendazole',
    dciKey: 'ALBENDAZOLE',
    category: 'Antiparasitaire',
    bands: [
      { minMonths: 12, maxMonths: 23, doseMg: 200, perDay: 1, label: '1 à 2 ans : 200 mg en prise unique' },
      { minMonths: 24, maxMonths: null, doseMg: 400, perDay: 1, label: '≥ 2 ans : 400 mg en prise unique' },
    ],
    minAgeMonths: 12,
    forms: [
      { label: 'Suspension buvable 400 mg/10 mL', mg: 400, perVolumeMl: 10, brands: 'VERTEN' },
      { label: 'Comprimé sécable 400 mg', mg: 400, perVolumeMl: 0, brands: 'OXYZOL, VERTEN, VERTEL HUP' },
    ],
    warnings: [
      'Oxyurose : traiter toute la famille et renouveler la prise après 15 jours.',
      'Contre-indiqué avant 1 an ; à éviter en cas de suspicion de grossesse.',
    ],
  },
  {
    dci: 'Diazépam (voie rectale — urgence convulsive)',
    dciKey: 'DIAZEPAM',
    category: 'Urgence — antiépileptique',
    mgPerKgPerDose: 0.5,
    intervalH: 0,
    maxSingleMg: 10,
    minAgeMonths: 1,
    forms: [
      { label: 'Solution injectable 10 mg/2 mL (voie intrarectale)', mg: 10, perVolumeMl: 2, brands: 'VALOXIUM, VALZEPAM' },
    ],
    warnings: [
      'Voie d\'urgence : si la convulsion dure plus de 5 minutes — appeler le SAMU (114).',
      'Dose maximale : 10 mg par crise ; ne pas répéter plus d\'une fois sans avis médical.',
      'Surveiller la respiration ; ne rien administrer par la bouche pendant la crise.',
    ],
    note: 'Médicament de la liste des substances contrôlées — prescription médicale obligatoire.',
  },
]

/* ------------------------------------------------------------------ */
/* Calcul                                                              */
/* ------------------------------------------------------------------ */

export interface DoseResult {
  /** Dose calculée par prise en mg (null si posologie fixe non applicable). */
  doseMg: number | null
  /** Dose plafonnée à la valeur adulte (dose adulte atteinte). */
  capped: boolean
  /** Dose journalière maximale en mg. */
  maxDailyMg: number
  /** Volume par prise en mL selon la forme choisie (null si forme sèche). */
  volumeMl: number | null
  /** Bande de posologie fixe applicable. */
  bandLabel: string | null
  /** Avertissements bloquants (âge/poids). */
  blockers: string[]
}

export function computeDose(
  drug: PediatricDosing,
  weightKg: number,
  ageMonths: number,
  formIndex: number
): DoseResult {
  const blockers: string[] = []
  if (drug.minAgeMonths != null && ageMonths < drug.minAgeMonths) {
    blockers.push(
      `Âge insuffisant : cette molécule est réservée aux enfants de ${drug.minAgeMonths} mois et plus (âge saisi : ${ageMonths} mois).`
    )
  }
  if (drug.minWeightKg != null && weightKg < drug.minWeightKg) {
    blockers.push(
      `Poids insuffisant : minimum requis ${drug.minWeightKg} kg (poids saisi : ${weightKg} kg).`
    )
  }

  const form = drug.forms[Math.min(formIndex, drug.forms.length - 1)]

  if (drug.bands && drug.bands.length > 0) {
    const band =
      drug.bands.find(
        (b) => ageMonths >= b.minMonths && (b.maxMonths == null || ageMonths <= b.maxMonths)
      ) ?? null
    if (band) {
      const volumeMl =
        form.perVolumeMl > 0 && form.mg > 0
          ? (band.doseMg / form.mg) * form.perVolumeMl
          : null
      return {
        doseMg: band.doseMg,
        capped: false,
        maxDailyMg: band.doseMg * band.perDay,
        volumeMl,
        bandLabel: band.label,
        blockers,
      }
    }
    return {
      doseMg: null,
      capped: false,
      maxDailyMg: 0,
      volumeMl: null,
      bandLabel: null,
      blockers: [...blockers, 'Aucune posologie fixe ne correspond à cet âge.'],
    }
  }

  const perKg = drug.mgPerKgPerDose ?? 0
  let doseMg = perKg * weightKg
  let capped = false
  if (drug.maxSingleMg != null && doseMg > drug.maxSingleMg) {
    doseMg = drug.maxSingleMg
    capped = true
  }

  const dosesPerDay = drug.intervalH ? Math.floor(24 / drug.intervalH) : drug.dosesPerDay ?? 1
  let maxDailyMg =
    drug.maxDailyMgPerKg != null ? drug.maxDailyMgPerKg * weightKg : doseMg * dosesPerDay
  if (drug.maxDailyMg != null && maxDailyMg > drug.maxDailyMg) maxDailyMg = drug.maxDailyMg

  const volumeMl =
    form.perVolumeMl > 0 && form.mg > 0 ? (doseMg / form.mg) * form.perVolumeMl : null

  return {
    doseMg: Math.round(doseMg * 100) / 100,
    capped,
    maxDailyMg: Math.round(maxDailyMg * 100) / 100,
    volumeMl: volumeMl != null ? Math.round(volumeMl * 100) / 100 : null,
    bandLabel: null,
    blockers,
  }
}
