import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/dzpharm/app-shell'
import { ToolsView } from '@/components/dzpharm/tools-view'

interface ToolMeta {
  title: string
  description: string
  ogTitle: string
  ogDesc: string
}

const TOOL_REGISTRY: Record<string, ToolMeta> = {
  comptoir: {
    title: 'Comptoir Express & Dispensation Sécurisée · DzPharm',
    description:
      'Workflow ultra-rapide de dispensation au comptoir : scan code-barres (EAN-13 / Datamatrix), contrôle Chifa, détection d’interactions et impression posologique.',
    ogTitle: 'Comptoir Express & Dispensation · DzPharm',
    ogDesc: 'Dispensation sécurisée en moins de 15 secondes au comptoir officinal.',
  },
  picto: {
    title: 'Générateur de Posologie Pictographique · DzPharm',
    description:
      'Étiquettes et fiches posologiques visuelles et pictographiques (matin/midi/soir/coucher/repas) adaptées aux patients analphabètes ou âgés.',
    ogTitle: 'Posologie Pictographique · DzPharm',
    ogDesc: 'Fiches et étiquettes posologiques visuelles pour patients à faible littératie.',
  },
  pediatrie: {
    title: 'Calculateur de Posologies Pédiatriques & Grilles A5 · DzPharm',
    description:
      'Calcul précis des doses pédiatriques par poids et âge pour les antibiotiques, antipyrétiques et corticoïdes selon les référentiels algériens.',
    ogTitle: 'Calculateur Pédiatrique & Grilles A5 · DzPharm',
    ogDesc: 'Calculateur de doses pédiatriques et grilles A5 imprimables.',
  },
  chifa: {
    title: 'Simulateur de Remboursement Chifa · DzPharm',
    description:
      'Calcul des tarifs de référence, ticket modérateur, tiers-payant CNAS / CASNOS et estimation immédiate du reste à charge patient.',
    ogTitle: 'Simulateur Chifa & Remboursement · DzPharm',
    ogDesc: 'Simulation du remboursement Chifa, tarif de référence et ticket modérateur.',
  },
  renal: {
    title: 'Calculateur d’Adaptation Rénale (Cockcroft & MDRD) · DzPharm',
    description:
      'Clairance de la créatinine, débit de filtration glomérulaire et ajustement posologique des molécules néphrotoxiques ou à élimination rénale.',
    ogTitle: 'Adaptation Posologique Rénale · DzPharm',
    ogDesc: 'Cockcroft-Gault, MDRD simplifié et règles d’ajustement rénal.',
  },
  hepatique: {
    title: 'Score de Child-Pugh & Adaptation Hépatique · DzPharm',
    description:
      'Évaluation de l’insuffisance hépatique (Child-Pugh A, B, C) et recommandations d’adaptation posologique selon les RCP officielles.',
    ogTitle: 'Score Child-Pugh & Adaptation Foie · DzPharm',
    ogDesc: 'Calculateur Child-Pugh et règles de posologie hépatique.',
  },
  'avk-inr': {
    title: 'Gestionnaire AVK, Nomogramme INR & Calendrier · DzPharm',
    description:
      'Titration acénocoumarol (Sintrom) et warfarine (Coumadine), ajustement de doses selon l’INR cible et conduite à tenir en cas de surdosage.',
    ogTitle: 'Gestion AVK & Cible INR · DzPharm',
    ogDesc: 'Nomogramme Sintrom, titration INR et conduite à tenir en cas de surdosage.',
  },
  antidotes: {
    title: 'Protocoles Toxicologiques d’Urgence & Antidotes CAPM · DzPharm',
    description:
      'Conduite à tenir immédiate lors des 5 premières minutes, protocoles anti-poisons du Centre Antipoison d’Alger et disponibilité des antidotes.',
    ogTitle: 'Protocoles d’Urgence Toxicologique & Antidotes · DzPharm',
    ogDesc: 'Protocoles de première urgence et antidotes validés CAPM Alger.',
  },
  grossesse: {
    title: 'Vérificateur Grossesse & Allaitement (CRAT) · DzPharm',
    description:
      'Évaluation du risque tératogène et foetotoxique par trimestre et compatibilité avec l’allaitement selon les données validées CRAT.',
    ogTitle: 'Grossesse & Allaitement · DzPharm',
    ogDesc: 'Sécurité médicamenteuse chez la femme enceinte et allaitante selon le CRAT.',
  },
  ramadan: {
    title: 'Adaptateur Chronopharmacologique du Ramadan · DzPharm',
    description:
      'Ajustement des prises médicamenteuses selon les horaires de prières (Imsak / Iftar) synchronisés sur les 58 wilayas d’Algérie.',
    ogTitle: 'Adaptation Posologique Ramadan · DzPharm',
    ogDesc: 'Chronopharmacologie et réaménagement des prises durant le jeûne du Ramadan.',
  },
  halal: {
    title: 'Compatibilité Excipients Halal & Gélatine · DzPharm',
    description:
      'Vérification de la présence de gélatine porcine, alcool ou dérivés dans les formulations pharmaceutiques commercialisées en Algérie.',
    ogTitle: 'Compatibilité Halal & Excipients · DzPharm',
    ogDesc: 'Vérification de la conformité éthique et religieuse des excipients pharmaceutiques.',
  },
  comparateur: {
    title: 'Comparateur Thérapeutique & Équivalents · DzPharm',
    description:
      'Comparaison face-à-face de princeps et génériques : composition, DCI, forme, PPA et taux de remboursement Chifa.',
    ogTitle: 'Comparateur Thérapeutique · DzPharm',
    ogDesc: 'Comparaison directe princeps vs génériques et équivalences de prix.',
  },
  economies: {
    title: 'Simulateur d’Économies Génériques · DzPharm',
    description:
      'Calculateur des économies directes pour l’assuré et la sécurité sociale par substitution générique autorisée.',
    ogTitle: 'Simulateur d’Économies Génériques · DzPharm',
    ogDesc: 'Estimation des gains financiers lors de la substitution par un générique.',
  },
  penuries: {
    title: 'Observatoire National des Pénuries · DzPharm',
    description:
      'Signalements en temps réel des ruptures d’approvisionnement et tensions de stock des médicaments en Algérie.',
    ogTitle: 'Observatoire des Pénuries · DzPharm',
    ogDesc: 'Signalements en temps réel et cartographie des tensions de stock officinales.',
  },
  pharmacies: {
    title: 'Pharmacies de Garde 58 Wilayas · DzPharm',
    description:
      'Réseau géolocalisé des officines de garde de nuit et week-end à travers les 58 wilayas d’Algérie avec statut d’ouverture en temps réel.',
    ogTitle: 'Pharmacies de Garde 58 Wilayas · DzPharm',
    ogDesc: 'Trouvez la pharmacie de garde ouverte maintenant dans votre wilaya.',
  },
  traduction: {
    title: 'Traduction d’Ordonnance FR → Arabe & Darija · DzPharm',
    description:
      'Traduction instantanée des posologies et conseils de prise en arabe classique et darija algérienne avec synthèse vocale.',
    ogTitle: 'Traducteur d’Ordonnance FR / Arabe · DzPharm',
    ogDesc: 'Explications de posologie en arabe et darija algérienne.',
  },
  livret: {
    title: 'Livret Thérapeutique & Substitutions Bioéquivalentes · DzPharm',
    description:
      'Import de formulaires hospitaliers et suggestions de bioéquivalents disponibles sur la nomenclature algérienne.',
    ogTitle: 'Livret Thérapeutique & Substitutions · DzPharm',
    ogDesc: 'Gestion de livret thérapeutique et substitutions de molécules hospitalières.',
  },
}

export function generateStaticParams() {
  return Object.keys(TOOL_REGISTRY).map((tool) => ({ tool }))
}

interface Props {
  params: Promise<{ tool: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params
  const meta = TOOL_REGISTRY[tool]

  if (!meta) {
    return {
      title: 'Outils Médicaux & Calculateurs · DzPharm',
      description: 'Suite d’outils cliniques pour la pratique médicale et pharmaceutique en Algérie.',
    }
  }

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDesc,
      url: `https://dzpharm.dz/outils/${tool}`,
    },
  }
}

export default async function DedicatedToolPage({ params }: Props) {
  const { tool } = await params

  if (!TOOL_REGISTRY[tool]) {
    notFound()
  }

  return (
    <AppShell>
      <ToolsView initialTab={tool} />
    </AppShell>
  )
}
