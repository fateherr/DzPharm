/**
 * DzPharm LASA Safety Net (BS-05)
 * Look-Alike / Sound-Alike medication error prevention & High-Alert Medication safeguards.
 * Based on ISMP (Institute for Safe Medication Practices) and WHO Patient Safety taxonomy.
 */

export interface LasaPair {
  sourceName: string
  sourceTallMan: string
  confusedWith: string
  targetTallMan: string
  dangerLevel: 'CRITIQUE' | 'ELEVE' | 'MODERE'
  clinicalDifference: string
  actionRecommendation: string
}

export interface LasaAlert {
  matchedTerm: string
  tallMan: string
  confusedWith: string
  targetTallMan: string
  dangerLevel: 'CRITIQUE' | 'ELEVE' | 'MODERE'
  clinicalDifference: string
  actionRecommendation: string
}

export interface HighAlertInfo {
  category: string
  severity: 'HAUT_RISQUE_VITAL' | 'VIGILANCE_RENFORCEE'
  warning: string
  checkpoints: string[]
}

/**
 * Paires LASA à haut risque de confusion clinique
 */
export const LASA_PAIRS: LasaPair[] = [
  {
    sourceName: 'DAONIL',
    sourceTallMan: 'DAO-nil (Glibenclamide)',
    confusedWith: 'DAFLON',
    targetTallMan: 'DAF-lon (Flavonoïdes)',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'DAONIL est un antidiabétique hypoglycémiant majeur (risque de coma hypoglycémique mortel chez le non-diabétique), tandis que DAFLON est un veinotonique.',
    actionRecommendation: 'Exiger la confirmation de la glycémie et de la pathologie (Diabète type 2 vs Insuffisance veineuse).',
  },
  {
    sourceName: 'DAFLON',
    sourceTallMan: 'DAF-lon (Flavonoïdes)',
    confusedWith: 'DAONIL',
    targetTallMan: 'DAO-nil (Glibenclamide)',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'DAFLON est un veinotonique. Ne jamais délivrer DAONIL par mégarde (antidiabétique puissant).',
    actionRecommendation: 'Vérifier l\'indication veineuse avant délivrance.',
  },
  {
    sourceName: 'CELEBREX',
    sourceTallMan: 'CELE-brex (Célécoxib)',
    confusedWith: 'CELEXA',
    targetTallMan: 'CE-lexa (Citalopram)',
    dangerLevel: 'ELEVE',
    clinicalDifference: 'CELEBREX est un anti-inflammatoire inhibiteur sélectif de COX-2. CELEXA est un antidépresseur inhibiteur de recapture de la sérotonine.',
    actionRecommendation: 'Confirmer si le traitement vise des douleurs articulaires ou un trouble de l\'humeur.',
  },
  {
    sourceName: 'PREVISCAN',
    sourceTallMan: 'PREVI-scan (Fluindione)',
    confusedWith: 'PRAVASTATINE',
    targetTallMan: 'PRAVA-statine',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'PREVISCAN est un anticoagulant AVK à marge thérapeutique étroite (risque d\'hémorragie létale). PRAVASTATINE est un hypolipémiant.',
    actionRecommendation: 'Vérifier systématiquement le carnet d\'INR du patient et la prescription d\'AVK.',
  },
  {
    sourceName: 'LAMICTAL',
    sourceTallMan: 'LAMICT-al (Lamotrigine)',
    confusedWith: 'LASILIX',
    targetTallMan: 'LASI-lix (Furosémide)',
    dangerLevel: 'ELEVE',
    clinicalDifference: 'LAMICTAL est un antiépileptique et régulateur de l\'humeur. LASILIX est un diurétique de l\'anse puissant.',
    actionRecommendation: 'Vérifier la posologie progressive et l\'indication (Épilepsie vs Œdème/Hypertension).',
  },
  {
    sourceName: 'LASILIX',
    sourceTallMan: 'LASI-lix (Furosémide)',
    confusedWith: 'LAMICTAL',
    targetTallMan: 'LAMICT-al (Lamotrigine)',
    dangerLevel: 'ELEVE',
    clinicalDifference: 'LASILIX est un diurétique de l\'anse, LAMICTAL est un antiépileptique.',
    actionRecommendation: 'Confirmer le dosage prescrit et la surveillance kaliémique.',
  },
  {
    sourceName: 'TRAMADOL',
    sourceTallMan: 'TRAMA-dol',
    confusedWith: 'TRAZODONE',
    targetTallMan: 'TRAZO-done',
    dangerLevel: 'ELEVE',
    clinicalDifference: 'TRAMADOL est un antalgique opioïde palier 2. TRAZODONE est un antidépresseur sédatif.',
    actionRecommendation: 'Vérifier la prescription d\'antalgiques et le risque de dépression respiratoire.',
  },
  {
    sourceName: 'METFORMIN',
    sourceTallMan: 'metFORMIN',
    confusedWith: 'METRONIDAZOLE',
    targetTallMan: 'metroNIDAZOLE',
    dangerLevel: 'ELEVE',
    clinicalDifference: 'METFORMIN est un biguanide antidiabétique oral. METRONIDAZOLE est un anti-infectieux nitro-imidazolé.',
    actionRecommendation: 'Vérifier si le patient traite un diabète ou une infection anaérobie/parasitaire.',
  },
  {
    sourceName: 'CORDARONE',
    sourceTallMan: 'CORDA-rone (Amiodarone)',
    confusedWith: 'CORGARD',
    targetTallMan: 'COR-gard (Nadolol)',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'CORDARONE est un antiarythmique de classe III à cinétique très lente et toxicité thyroïdienne/pulmonaire. CORGARD est un bêtabloquant.',
    actionRecommendation: 'Contrôler l\'ECG récent et le dosage prescrit.',
  },
  {
    sourceName: 'HYDREA',
    sourceTallMan: 'HYDRE-a (Hydroxycarbamide)',
    confusedWith: 'HYDRENE',
    targetTallMan: 'HYDR-ene (Diurétique)',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'HYDREA est une chimiothérapie cytotoxique hématologique (myélosuppression). HYDRENE est un diurétique antihypertenseur.',
    actionRecommendation: 'Prescription hospitalière obligatoire : contrôler la NFS et les plaquettes.',
  },
  {
    sourceName: 'ZANTAC',
    sourceTallMan: 'ZAN-tac (Ranitidine)',
    confusedWith: 'ZYRTEC',
    targetTallMan: 'ZYR-tec (Cétirizine)',
    dangerLevel: 'MODERE',
    clinicalDifference: 'ZANTAC est un anti-H2 gastrique. ZYRTEC est un antihistaminique H1 antiallergique.',
    actionRecommendation: 'Confirmer si le symptôme est gastrique ou allergique (rhinite/urticaire).',
  },
  {
    sourceName: 'ZYRTEC',
    sourceTallMan: 'ZYR-tec (Cétirizine)',
    confusedWith: 'ZANTAC',
    targetTallMan: 'ZAN-tac (Ranitidine)',
    dangerLevel: 'MODERE',
    clinicalDifference: 'ZYRTEC est un antihistaminique H1 antiallergique. ZANTAC est un antihistaminique H2 gastrique.',
    actionRecommendation: 'Confirmer l\'indication antihistaminique allergique.',
  },
  {
    sourceName: 'DOPAMINE',
    sourceTallMan: 'DOPAmine',
    confusedWith: 'DOBUTAMINE',
    targetTallMan: 'DOBUTamine',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'DOPAMINE a des effets dopaminergiques et vasopresseurs alpha-1 à fortes doses. DOBUTAMINE est un inotrope positif bêta-1 prédominant.',
    actionRecommendation: 'Vérification en milieu de réanimation : double contrôle obligatoire du débit au pousse-seringue.',
  },
  {
    sourceName: 'VINCRISTINE',
    sourceTallMan: 'vinCRIStine',
    confusedWith: 'VINBLASTINE',
    targetTallMan: 'vinBLAStine',
    dangerLevel: 'CRITIQUE',
    clinicalDifference: 'VINCRISTINE est un poison du fuseau mitotique dosé en microgrammes (dose max absolue 2 mg). VINBLASTINE a une toxicité hématologique prédominante et des posologies 5 à 10 fois supérieures.',
    actionRecommendation: 'ERREUR POTENTIELLEMENT LÉTALE : surdosage massif en cas de confusion.',
  },
]

/**
 * Dictionnaire ISMP Tall Man Lettering pour l'affichage visuel différencié
 */
export const TALL_MAN_DICTIONARY: Record<string, string> = {
  prednisone: 'predniSONE',
  prednisolone: 'prednisoLONE',
  clonazepam: 'cloNAZEpam',
  clozapine: 'cloZAPine',
  hydroxyzine: 'hydroXYzine',
  hydralazine: 'hydrALAZINE',
  daonil: 'DAO-nil',
  daflon: 'DAF-lon',
  celebrex: 'CELE-brex',
  celexa: 'CE-lexa',
  dopamine: 'DOPAmine',
  dobutamine: 'DOBUTamine',
  vinblastine: 'vinBLAStine',
  vincristine: 'vinCRIStine',
  metformin: 'metFORMIN',
  metronidazole: 'metroNIDAZOLE',
  tramadol: 'TRAMA-dol',
  trazodone: 'TRAZO-done',
  fluoxetine: 'fluOXEtine',
  fluphenazine: 'fluPHENAzine',
  ephedrine: 'ePHEDrine',
  epinephrine: 'EPINephrine',
  cisplatin: 'CISplatin',
  carboplatin: 'CARBOplatin',
  cyclosporine: 'cycloSPORINE',
  cyclophosphamide: 'cycloPHOSphamide',
}

/**
 * Classes thérapeutiques à haut risque vital (High-Alert Medications)
 */
export const HIGH_ALERT_PATTERNS = [
  {
    regex: /(insuline|insulin|glargine|lispro|aspart|detemir|degludec)/i,
    category: 'Insulines & Analogues',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'Risque majeur d\'hypoglycémie aiguë et de coma. Vérifier le type d\'insuline (rapide vs basale lente), la concentration (100 UI/ml vs 300 UI/ml) et l\'heure d\'injection par rapport aux repas.',
    checkpoints: ['Contrôle dextro avant injection', 'Vérification stylo/cartouche', 'Vérification unité UI (jamais en ml)'],
  },
  {
    regex: /(heparine|heparin|enoxaparine|lovenox|innohep|fraxiparine|fondaparinux|rivaroxaban|xarelto|apixaban|eliquis|dabigatran|pradaxa|sintrom|acenocoumarol|fluindione|previscan|warfarine)/i,
    category: 'Anticoagulants oraux & injectables',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'Risque d\'accident hémorragique grave ou de thrombose en cas de sous-dosage. Surveillance biologique impérative.',
    checkpoints: ['Vérification INR / Anti-Xa', 'Contrôle fonction rénale (clairance Cockcroft)', 'Recherche d\'interactions AINS / Aspirine'],
  },
  {
    regex: /(morphine|fentanyl|durogesic|oxycodone|oxynorm|methadone|buprenorphine)/i,
    category: 'Opioïdes majeurs (Stupéfiants)',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'Risque de dépression respiratoire mortelle et de surdosage cumulatif. Prescription sécurisée en toutes lettres.',
    checkpoints: ['Vérification ordonnance sécurisée en toutes lettres', 'Présence d\'un antidote (Naloxone)', 'Surveillance sédation et score de douleur'],
  },
  {
    regex: /(methotrexate|novatrex|metoject|imeth)/i,
    category: 'Méthotrexate (Prise hebdomadaire)',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'DANGER MORTEL : En rhumatologie et dermatologie, la prise est strictement HEBDOMADAIRE (un jour fixe par semaine). Ne jamais prendre quotidiennement.',
    checkpoints: ['Confirmation du jour unique de prise par semaine', 'Prescription d\'acide folique à distance (J+2)', 'Contrôle NFS et bilan hépatique'],
  },
  {
    regex: /(digoxine|digoxin)/i,
    category: 'Digitaliques à marge étroite',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'Marge thérapeutique très étroite : risque de troubles du rythme ventriculaire mortels. Aggravé par l\'hypokaliémie.',
    checkpoints: ['Dosage digoxinémie', 'Contrôle ionogramme sanguin (Kaliémie)', 'Surveillance ECG (ralentissement excessif)'],
  },
  {
    regex: /(lithium|teralithe)/i,
    category: 'Sels de lithium',
    severity: 'HAUT_RISQUE_VITAL' as const,
    warning: 'Risque d\'intoxication lithiémique sévère. Contre-indication absolue avec les AINS et les diurétiques.',
    checkpoints: ['Dosage régulier de la lithiémie à 12h de la dernière prise', 'Apport hydrique stable', 'Interdiction stricte des AINS en automédication'],
  },
]

/**
 * Analyse si un médicament correspond à une alerte LASA (Look-Alike Sound-Alike)
 */
export function checkLasaRisk(brand: string, dci: string): LasaAlert | null {
  const normBrand = (brand || '').toUpperCase().trim()
  const normDci = (dci || '').toUpperCase().trim()

  for (const pair of LASA_PAIRS) {
    if (
      normBrand.includes(pair.sourceName) ||
      normDci.includes(pair.sourceName)
    ) {
      return {
        matchedTerm: pair.sourceName,
        tallMan: pair.sourceTallMan,
        confusedWith: pair.confusedWith,
        targetTallMan: pair.targetTallMan,
        dangerLevel: pair.dangerLevel,
        clinicalDifference: pair.clinicalDifference,
        actionRecommendation: pair.actionRecommendation,
      }
    }
  }

  return null
}

/**
 * Analyse si un médicament appartient aux classes à haut risque vital
 */
export function checkHighAlert(brand: string, dci: string, liste?: string): HighAlertInfo | null {
  const text = `${brand} ${dci} ${liste || ''}`

  for (const item of HIGH_ALERT_PATTERNS) {
    if (item.regex.test(text)) {
      return {
        category: item.category,
        severity: item.severity,
        warning: item.warning,
        checkpoints: item.checkpoints,
      }
    }
  }

  // Stupéfiants classés officiellement
  if ((liste || '').toUpperCase().includes('STUPE')) {
    return {
      category: 'Produit Stupéfiant (Tableau B)',
      severity: 'HAUT_RISQUE_VITAL',
      warning: 'Substance vénéneuse soumise à réglementation stricte des stupéfiants. Ordonnance sécurisée en toutes lettres obligatoire.',
      checkpoints: ['Ordonnance rédigée en toutes lettres', 'Durée de prescription limitée', 'Registre des stupéfiants à l\'officine'],
    }
  }

  return null
}

/**
 * Applique le lettrage Tall Man aux mots reconnus
 */
export function getTallManLettering(text: string): string {
  if (!text) return ''
  let result = text
  for (const [lower, tall] of Object.entries(TALL_MAN_DICTIONARY)) {
    const reg = new RegExp(`\\b${lower}\\b`, 'gi')
    result = result.replace(reg, tall)
  }
  return result
}
