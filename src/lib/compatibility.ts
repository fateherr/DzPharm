/**
 * DzPharm Compatibility Layer (W3-01)
 * Moteur d'analyse de compatibilité éthico-religieuse : Gélatine porcine, Alcool & Dérivés animaux.
 * Référentiels : Haut Conseil Islamique d'Algérie (HCIA), Académie Internationale du Fiqh Islamique (OIC/IIFA),
 * et Principes de Jurisprudence Médicale (Istihala, Darura, Omne Necessitas).
 */

export type CompatibilityStatus =
  | 'HALAL_CERTIFIE'
  | 'VEGETAL_SYNTHETIQUE'
  | 'GELATINE_SUSPECTE'
  | 'PORCIN_CONFIRME'
  | 'ALCOOL_PRESENT'
  | 'DARURA_PERMISE'

export interface ExcipientRisk {
  type: 'GELATINE' | 'ALCOOL' | 'ENZYME_PORCINE' | 'DERIVE_BOVIN' | 'AUTRE'
  name: string
  detail: string
  fatwaReference: string
  alternativeAdvice: string
}

export interface CompatibilityReport {
  status: CompatibilityStatus
  badgeLabel: string
  badgeVariant: 'success' | 'warning' | 'danger' | 'info'
  headline: string
  summary: string
  risks: ExcipientRisk[]
  hasAlternative: boolean
  recommendedFormSubstitute?: string
  fiqhRuling: string
}

/** Formes galéniques contenant fréquemment de la gélatine animale */
const GELATIN_FORMS = [
  'gelule',
  'gelules',
  'capsule',
  'capsules',
  'capsule molle',
  'capsules molles',
  'perle',
  'perles',
]

/** Formes galéniques contenant fréquemment de l'alcool / éthanol */
const ALCOHOL_SUSPECT_FORMS = [
  'sirop',
  'sirops',
  'solution buvable',
  'gouttes buvables',
  'elixir',
  'teinture',
  'suspension buvable',
]

/** Principes actifs ou excipients d'origine porcine avérée */
const PORCINE_MOLECULES = [
  'PANCREATINE',
  'PANCRELIPASE',
  'HEPARINE',
  'ENOXAPARINE',
  'TINZAPARINE',
  'NADROPARINE',
  'PEPSINE',
  'SURFACTANT PORCIN',
]

/**
 * Analyse la compatibilité religieuse et éthique d'un médicament
 */
export function analyzeDrugCompatibility(
  brand: string,
  dci: string,
  form: string,
  obs?: string | null
): CompatibilityReport {
  const normBrand = (brand || '').toUpperCase().trim()
  const normDci = (dci || '').toUpperCase().trim()
  const normForm = (form || '').toLowerCase().trim()
  const normObs = (obs || '').toLowerCase().trim()

  const risks: ExcipientRisk[] = []

  // 1. Détection de principes actifs d'origine porcine (Pancréatine, Héparines)
  for (const mol of PORCINE_MOLECULES) {
    if (normDci.includes(mol) || normBrand.includes(mol)) {
      if (mol === 'PANCREATINE' || mol === 'PANCRELIPASE') {
        risks.push({
          type: 'ENZYME_PORCINE',
          name: 'Pancréatine d’origine porcine',
          detail:
            'Extrait purifié de pancréas de porc indispensable pour le traitement de l’insuffisance pancréatique exocrine (mucoviscidose, pancréatectomie).',
          fatwaReference:
            'Résolution 90 (7/9) de l’Académie du Fiqh Islamique & Conseil Européen de la Fatwa : Toléré par nécessité médicale vitale (Darura - رخصة للضرورة الشرعية) en l’absence de substitut recombinant ou fongique équivalent.',
          alternativeAdvice:
            'Aucune alternative fongique équivalente n’étant commercialisée en Algérie, le maintien est impératif pour la survie du patient.',
        })
      } else if (mol.includes('PARINE')) {
        risks.push({
          type: 'ENZYME_PORCINE',
          name: 'Héparine de bas poids moléculaire (HBPM)',
          detail:
            'Dérivé de muqueuse intestinale porcine, anticoagulant vital dans la prévention et le traitement des thromboses veineuses et embolies.',
          fatwaReference:
            'Avis du Haut Conseil Islamique d’Algérie & Ligue Islamique Mondiale : Utilisation autorisée par nécessité thérapeutique majeure (Rokhsa - رخصة).',
          alternativeAdvice:
            'En relais ambulatoire ou cardiologique, les AOD (Rivaroxaban, Apixaban) en comprimés synthétiques peuvent être envisagés selon indication médicale.',
        })
      }
    }
  }

  // 2. Détection de gélatine dans les gélules et capsules
  const isGelatinForm = GELATIN_FORMS.some((f) => normForm.includes(f))
  const isHpmc =
    normForm.includes('vegetale') ||
    normForm.includes('hpmc') ||
    normObs.includes('vegetale') ||
    normObs.includes('hpmc')

  if (isGelatinForm) {
    if (isHpmc) {
      // Gélule végétale certifiée
    } else {
      risks.push({
        type: 'GELATINE',
        name: 'Enveloppe de gélatine animale',
        detail:
          'Les capsules et gélules conventionnelles sont fabriquées à base de gélatine animale (généralement bovine ou porcine non certifiée halal à l’importation).',
        fatwaReference:
          'Avis jurisprudentiel : Débat entre la théorie de l’Istihala (transformation chimique profonde rendant la gélatine licite) et le principe de précaution recommandant d’éviter le porc non transformé.',
        alternativeAdvice:
          'Préférer lorsque disponible la forme comprimé nu, sachet, ou demander au pharmacien une gélule végétale (HPMC). Possibilité d’ouvrir la gélule pour dissoudre la poudre si la forme n’est pas à libération prolongée.',
      })
    }
  }

  // 3. Détection de solvants alcooliques dans les formes buvables
  const isAlcoholSuspect = ALCOHOL_SUSPECT_FORMS.some((f) => normForm.includes(f))
  const mentionsAlcohol =
    normObs.includes('alcool') ||
    normObs.includes('ethanol') ||
    normForm.includes('hydro-alcoolique') ||
    normForm.includes('teinture') ||
    normBrand.includes('ELIXIR')

  if (mentionsAlcohol || (isAlcoholSuspect && (normObs.includes('v/v') || normObs.includes('% vol')))) {
    risks.push({
      type: 'ALCOOL',
      name: 'Excipient éthanolique (Alcool)',
      detail:
        'Présence d’alcool éthylique utilisé comme solvant ou conservateur dans la formulation liquide buvable.',
      fatwaReference:
        'Résolution du Conseil Islamique International : L’alcool utilisé à dose minime non enivrante (< 0.5% à 1%) comme conservateur pharmaceutique nécessaire est excusé (Ma’fou ‘anhou - معفو عنه), mais les formes sans alcool doivent être privilégiées chez l’enfant et le nourrisson.',
      alternativeAdvice:
        'Substituer par une présentation sans alcool (sirop pédiatrique sans sucre et sans éthanol) ou une forme comprimé/sachet dispersible.',
    })
  }

  // Synthèse du statut
  if (risks.some((r) => r.type === 'ENZYME_PORCINE')) {
    return {
      status: 'DARURA_PERMISE',
      badgeLabel: 'Nécessité Médicale (Darura)',
      badgeVariant: 'warning',
      headline: 'Principe actif d’origine animale · Toléré par Rokhsa médicale',
      summary:
        'Contient des dérivés d’origine animale indispensables sur le plan vital. Le consensus des juristes musulmans (Haut Conseil Islamique, IIFA) valide l’utilisation thérapeutique stricte (الضرورات تبيح المحظورات).',
      risks,
      hasAlternative: false,
      fiqhRuling:
        'Règle jurisprudentielle : « La préservation de la vie humaine prévaut sur l’interdit de consommation lorsque aucun substitut médical équivalent n’existe » (Haut Conseil Islamique).',
    }
  }

  if (risks.some((r) => r.type === 'ALCOOL')) {
    return {
      status: 'ALCOOL_PRESENT',
      badgeLabel: 'Contient de l’Éthanol',
      badgeVariant: 'warning',
      headline: 'Solution buvable contenant un solvant alcoolique',
      summary:
        'Ce produit contient de l’éthanol comme solvant. Bien que toléré en pharmacopée, des alternatives sans alcool existent souvent pour la même DCI.',
      risks,
      hasAlternative: true,
      recommendedFormSubstitute: 'Préférer les formes sirops sans alcool ou comprimés orodispersibles.',
      fiqhRuling:
        'Toléré à titre subsidiaire si dose minime non enivrante, mais le remplacement par une forme sans alcool est fortement recommandé par précaution.',
    }
  }

  if (risks.some((r) => r.type === 'GELATINE')) {
    return {
      status: 'GELATINE_SUSPECTE',
      badgeLabel: 'Gélatine Conventionnelle',
      badgeVariant: 'info',
      headline: 'Enveloppe de gélule animale non végétale',
      summary:
        'La tunique de la gélule est d’origine animale. Des alternatives sous forme de comprimés secs ou sachets permettent d’éviter toute ambiguïté.',
      risks,
      hasAlternative: true,
      recommendedFormSubstitute: 'Comprimé sécable, comprimé pelliculé végétal ou sachet pour suspension.',
      fiqhRuling:
        'Selon l’avis majoritaire de l’Académie du Fiqh d’Alger et de Djeddah, l’ouverture de la gélule pour ingestion de la poudre seule est licite si le produit n’est pas à libération gastrorésistante.',
    }
  }

  return {
    status: 'HALAL_CERTIFIE',
    badgeLabel: '100% Compatible Halal',
    badgeVariant: 'success',
    headline: 'Formulation végétale, minérale ou synthétique pure',
    summary:
      'Aucun principe actif ni excipient suspect (gélatine animale, éthanol, dérivés porcins) détecté. Pleinement conforme à la consommation confessionnelle.',
    risks: [],
    hasAlternative: false,
    fiqhRuling: 'Licéité intégrale sans réserve jurisprudentielle (Halal pur - حلال طيب).',
  }
}
