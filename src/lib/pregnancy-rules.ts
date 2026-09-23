/**
 * DzPharm — Base de connaissances Grossesse & Allaitement.
 *
 * Classification dérivée des référentiels CRAT / ANSM / HAS pour les
 * molécules majeures du marché algérien. Chaque règle :
 *  - grossesse par trimestre (T1/T2/T3) : niveau de risque
 *  - allaitement : niveau de risque
 *  - notes cliniques + alternatives thérapeutiques locales
 *
 * Niveaux : SURE | PRUDENCE | DECONSEILLE | CONTRE_INDIQUE | NEUTRE (données insuffisantes)
 */

export type PregnancyRisk = 'SURE' | 'PRUDENCE' | 'DECONSEILLE' | 'CONTRE_INDIQUE' | 'NEUTRE'

export interface PregnancyRule {
  /** Clé DCI normalisée (majuscules sans accents). */
  dciKey: string
  /** Libellé d'affichage. */
  dci: string
  /** Niveau global grossesse (représentatif de l'usage habituel). */
  pregnancy: PregnancyRisk
  /** Détail par trimestre si différent du niveau global. */
  trimesters?: { t1?: PregnancyRisk; t2?: PregnancyRisk; t3?: PregnancyRisk }
  /** Niveau allaitement. */
  breastfeeding: PregnancyRisk
  /** Message clé grossesse (1-2 phrases). */
  pregnancyNote: string
  /** Message clé allaitement. */
  breastfeedingNote: string
  /** Alternatives recommandées localement. */
  alternatives?: string[]
}

export const RISK_LABELS: Record<PregnancyRisk, { label: string; short: string }> = {
  SURE: { label: 'Compatible', short: 'Sûr' },
  PRUDENCE: { label: 'Utilisable avec prudence', short: 'Prudence' },
  DECONSEILLE: { label: 'Déconseillé', short: 'Déconseillé' },
  CONTRE_INDIQUE: { label: 'Contre-indiqué', short: 'CI' },
  NEUTRE: { label: 'Données insuffisantes', short: 'À évaluer' },
}

export const RISK_ORDER: Record<PregnancyRisk, number> = {
  SURE: 0,
  NEUTRE: 1,
  PRUDENCE: 2,
  DECONSEILLE: 3,
  CONTRE_INDIQUE: 4,
}

/* ------------------------------------------------------------------ */
/* Règles — molécules majeures (marché algérien)                       */
/* ------------------------------------------------------------------ */

export const PREGNANCY_RULES: PregnancyRule[] = [
  // --- Antalgiques / AINS ---
  {
    dciKey: 'PARACETAMOL', dci: 'Paracétamol',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Antalgique et antipyrétique de choix pendant toute la grossesse, à la dose efficace la plus faible et la plus courte possible (CRAT : « utilisable pendant toute la grossesse si besoin »).',
    breastfeedingNote: 'Compatible avec l’allaitement — antalgique de première intention chez la femme qui allaite (rapport lait/plasma ≈ 1, dose ingérée par le nourrisson < 2 % de la dose pédiatrique).',
    alternatives: ['Paracétamol seul (éviter les associations avec caféine ou codéine)'],
  },
  {
    dciKey: 'IBUPROFENE', dci: 'Ibuprofène',
    pregnancy: 'DECONSEILLE',
    trimesters: { t1: 'DECONSEILLE', t2: 'DECONSEILLE', t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'PRUDENCE',
    pregnancyNote: 'AINS à éviter du 6e mois de grossesse (fermeture prématurée du canal artériel, oligoamnios, atteinte rénale fœtale). Avant 6 mois : usage ponctuel uniquement. CRAT : « éviter ».',
    breastfeedingNote: 'Compatible si occasionnel et courte durée (CRAT) — préférer le paracétamol en traitement prolongé.',
    alternatives: ['Paracétamol'],
  },
  {
    dciKey: 'ACIDE ACETYLSALICYLIQUE', dci: 'Acide acétylsalicylique (aspirine)',
    pregnancy: 'DECONSEILLE',
    trimesters: { t1: 'DECONSEILLE', t2: 'DECONSEILLE', t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'À doses antalgiques/anti-inflammatoires (> 100 mg/j) : à éviter. Faibles doses antiagrégantes (75–100 mg/j) : possibles sur avis spécialisé. Contre-indiqué à partir du 6e mois.',
    breastfeedingNote: 'À éviter par prudence — risque de syndrome de Reye chez le nourrisson (passage dans le lait).',
    alternatives: ['Paracétamol', 'Héparine de bas poids moléculaire (indication antiagrégante)'],
  },
  {
    dciKey: 'KETOPROFENE', dci: 'Kétoprofène',
    pregnancy: 'DECONSEILLE', trimesters: { t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'AINS — même contre-indications que l’ibuprofène : à éviter par principe, contre-indiqué à partir du 6e mois de grossesse.',
    breastfeedingNote: 'À éviter pendant l’allaitement.',
    alternatives: ['Paracétamol'],
  },
  {
    dciKey: 'DICLOFENAC', dci: 'Diclofénac',
    pregnancy: 'DECONSEILLE', trimesters: { t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'PRUDENCE',
    pregnancyNote: 'AINS — à éviter, contre-indiqué à partir du 6e mois (toxicité cardiovasculaire et rénale fœtale).',
    breastfeedingNote: 'Compatible si usage ponctuel et court — préférer paracétamol.',
    alternatives: ['Paracétamol'],
  },
  {
    dciKey: 'TRAMADOL', dci: 'Tramadol',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Opioïde faible : ponctuellement possible, éviter l’usage prolongé (risque de syndrome de sevrage néonatal).',
    breastfeedingNote: 'Possible à dose unique ; éviter les doses répétées (sédation du nourrisson).',
    alternatives: ['Paracétamol'],
  },
  {
    dciKey: 'CODEINE', dci: 'Codéine',
    pregnancy: 'DECONSEILLE', breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'À éviter pendant la grossesse (risque de malformations rapporté au 1er trimestre, syndrome de sevrage si usage prolongé).',
    breastfeedingNote: 'Contre-indiquée pendant l’allaitement (métaboliseurs ultra-rapides : dépression respiratoire du nourrisson — ANSM).',
    alternatives: ['Paracétamol'],
  },

  // --- Anti-infectieux ---
  {
    dciKey: 'AMOXICILLINE', dci: 'Amoxicilline',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Bêta-lactamine de choix pendant la grossesse — large expérience, aucun effet malformatif connu.',
    breastfeedingNote: 'Compatible — surveiller toutefois candidose ou diarrhée chez le nourrisson.',
    alternatives: ['Amoxicilline/acide clavulanique'],
  },
  {
    dciKey: 'AMOXICILLINE ACIDE CLAVULANIQUE', dci: 'Amoxicilline/acide clavulanique',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Compatible pendant toute la grossesse (données importantes, pas de signal tératogène).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'AZITHROMYCINE', dci: 'Azithromycine',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Macrolide utilisable pendant la grossesse si nécessaire (macrolides non retardataires de référence).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'CIPROFLOXACINE', dci: 'Ciprofloxacine',
    pregnancy: 'DECONSEILLE', breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'Fluoroquinolone : à éviter pendant la grossesse (atteinte cartilagineuse chez l’animal — réserver aux infections graves).',
    breastfeedingNote: 'À éviter — préférer une bêta-lactamine.',
    alternatives: ['Amoxicilline', 'Céfixime'],
  },
  {
    dciKey: 'METRONIDAZOLE', dci: 'Métronidazole',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Utilisable si nécessaire en cure courte (vaginose, amibiase) ; par prudence, éviter au 1er trimestre si alternative disponible.',
    breastfeedingNote: 'Compatible en cure courte (goût du lait modifié possible) ; allaiter 3 h après la prise.',
  },
  {
    dciKey: 'FUROSEMIDE', dci: 'Furosémide',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Diurétique de l’anse : possible sur surveillance (diminution du volume amniotique, hypotension fœtale).',
    breastfeedingNote: 'Possible sous surveillance (diminution de la lactation possible).',
  },
  {
    dciKey: 'ISONIAZIDE', dci: 'Isoniazide',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Compatible — antituberculeux de référence chez la femme enceinte (avec pyridoxine).',
    breastfeedingNote: 'Compatible (supplémentation pyridoxine chez le nourrisson si besoin).',
  },
  {
    dciKey: 'ACIDE FOLIQUE', dci: 'Acide folique',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Recommandé en péri-conceptionnel et au 1er trimestre (0,4 mg/j : prévention des anomalies de fermeture du tube neural).',
    breastfeedingNote: 'Compatible — apport lacté ajusté.',
  },

  // --- Antihypertenseurs / cardio ---
  {
    dciKey: 'METHYLDOPA', dci: 'Méthyldopa',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Antihypertenseur de référence de la grossesse (HTA chronique, pré-éclampsie).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'LABETALOL', dci: 'Labétalol',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Bêta-bloquant de référence dans l’HTA gravidique (urgences hypertensives IV).',
    breastfeedingNote: 'Compatible (surveiller bradycardie du nourrisson).',
  },
  {
    dciKey: 'NIFEDIPINE', dci: 'Nifédipine',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Inhibiteur calcique utilisable dans l’HTA de la grossesse (formes retard) — éviter la forme sublinguale.',
    breastfeedingNote: 'Compatible (faible passage dans le lait).',
  },
  {
    dciKey: 'CAPTOPRIL', dci: 'Captopril',
    pregnancy: 'CONTRE_INDIQUE',
    trimesters: { t1: 'DECONSEILLE', t2: 'CONTRE_INDIQUE', t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'IEC contre-indiqué dès le 2e trimestre (fœtopathie : oligoamnios, anurie néonatale, hypoplasie pulmonaire, crâniofaciale). Arrêt immédiat en cas de découverte de grossesse.',
    breastfeedingNote: 'À éviter — préférer un antihypertenseur compatible.',
    alternatives: ['Méthyldopa', 'Labétalol', 'Nifédipine retard'],
  },
  {
    dciKey: 'ENALAPRIL', dci: 'Énalapril',
    pregnancy: 'CONTRE_INDIQUE',
    trimesters: { t1: 'DECONSEILLE', t2: 'CONTRE_INDIQUE', t3: 'CONTRE_INDIQUE' },
    breastfeeding: 'PRUDENCE',
    pregnancyNote: 'IEC — contre-indiqué pendant la grossesse (fœtopathie). Substitution obligatoire.',
    breastfeedingNote: 'Énalapril = IEC le mieux documenté, possible à faible dose — avis spécialisé.',
    alternatives: ['Méthyldopa', 'Labétalol', 'Nifédipine retard'],
  },
  {
    dciKey: 'LOSARTAN', dci: 'Losartan',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'ARA2 strictement contre-indiqué pendant la grossesse (même fœtopathie que les IEC).',
    breastfeedingNote: 'À éviter pendant l’allaitement.',
    alternatives: ['Méthyldopa', 'Labétalol', 'Nifédipine retard'],
  },
  {
    dciKey: 'AMLODIPINE', dci: 'Amlodipine',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Pas de signal malformatif ; préférer néanmoins les antihypertenseurs de référence chez la femme enceinte.',
    breastfeedingNote: 'Possible sous surveillance (données limitées).',
  },
  {
    dciKey: 'ATENOLOL', dci: 'Aténolol',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Bêta-bloquant à éviter en 1re intention chez la femme enceinte (hypotrophie, bradycardie fœtale si exposition prolongée).',
    breastfeedingNote: 'Possible — surveiller le nourrisson (somnolence, hypoglycémie).',
    alternatives: ['Labétalol', 'Méthyldopa'],
  },
  {
    dciKey: 'WARFARINE', dci: 'Warfarine (AVK)',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'SURE',
    pregnancyNote: 'AVK traversent le placenta : syndrome malformatif (embryopathie) 6e–12e SA, hémorragies fœtales. Substituer par HBPM.',
    breastfeedingNote: 'Compatible avec l’allaitement (pas de passage significatif).',
    alternatives: ['Héparine de bas poids moléculaire (énoxaparine)'],
  },
  {
    dciKey: 'ACENOCOUMAROL', dci: 'Acénocoumarol',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'SURE',
    pregnancyNote: 'AVK — même contre-indication que la warfarine pendant la grossesse.',
    breastfeedingNote: 'Compatible avec l’allaitement.',
    alternatives: ['Héparine de bas poids moléculaire'],
  },
  {
    dciKey: 'RIVAROXABAN', dci: 'Rivaroxaban',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'AOD contre-indiqué pendant la grossesse (données insuffisantes, saignement).',
    breastfeedingNote: 'Contre-indiqué pendant l’allaitement.',
    alternatives: ['Héparine de bas poids moléculaire'],
  },

  // --- Diabétologie ---
  {
    dciKey: 'METFORMINE', dci: 'Metformine',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Compatible pendant la grossesse (biguanide de référence dans le diabète gestationnel).',
    breastfeedingNote: 'Compatible avec l’allaitement (très faible passage dans le lait).',
  },
  {
    dciKey: 'INSULINE', dci: 'Insuline',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Traitement de référence du diabète pendant la grossesse (ne traverse pas le placenta).',
    breastfeedingNote: 'Compatible — l’allaitement diminue les besoins insuliniques.',
  },
  {
    dciKey: 'GLICLAZIDE', dci: 'Gliclazide',
    pregnancy: 'DECONSEILLE', breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'Sulfamide hypoglycémiant : à éviter — relais par insuline ou metformine pendant la grossesse.',
    breastfeedingNote: 'À éviter (hypoglycémie néonatale) — insuline ou metformine préférentielles.',
    alternatives: ['Insuline', 'Metformine'],
  },
  {
    dciKey: 'SITAGLIPTINE', dci: 'Sitagliptine',
    pregnancy: 'NEUTRE', breastfeeding: 'NEUTRE',
    pregnancyNote: 'Données insuffisantes chez la femme enceinte — relais par insuline/metformine.',
    breastfeedingNote: 'Données insuffisantes — éviter par prudence.',
    alternatives: ['Insuline', 'Metformine'],
  },

  // --- Psychotropes / neuro ---
  {
    dciKey: 'FLUOXETINE', dci: 'Fluoxétine',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'ISRS utilisable si nécessaire (pas de majoration du risque malformatif) ; poursuivre un traitement efficace plutôt que de substituer.',
    breastfeedingNote: 'Possible — surveiller somnolence/irritabilité du nourrisson ; préférer sertraline/paroxétine si traitement débutant.',
  },
  {
    dciKey: 'SERTRALINE', dci: 'Sertraline',
    pregnancy: 'PRUDENCE', breastfeeding: 'SURE',
    pregnancyNote: 'ISRS de choix si traitement nécessaire pendant la grossesse (meilleur recul).',
    breastfeedingNote: 'ISRS de choix pendant l’allaitement (faible passage lacté).',
  },
  {
    dciKey: 'PAROXETINE', dci: 'Paroxétine',
    pregnancy: 'DECONSEILLE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'À éviter en début de grossesse (signal cardiovasculaire) — préférer sertraline ou escitalopram.',
    breastfeedingNote: 'Possible (faible passage).',
    alternatives: ['Sertraline'],
  },
  {
    dciKey: 'AMITRIPTYLINE', dci: 'Amitriptyline',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Imipraminique : possible si traitement nécessaire ; éviter le passage au 3e trimestre (sevrage néonatal).',
    breastfeedingNote: 'Possible — surveiller sédation et prise de poids du nourrisson.',
  },
  {
    dciKey: 'DIAZEPAM', dci: 'Diazépam',
    pregnancy: 'DECONSEILLE', breastfeeding: 'DECONSEILLE',
    pregnancyNote: 'Benzodiazépine à éviter pendant la grossesse (malformations si 1er trimestre, hypotonie/sevrage néonatal au 3e).',
    breastfeedingNote: 'À éviter — sédation du nourrisson, demi-vie longue.',
    alternatives: ['Traitement ponctuel, avis spécialisé'],
  },
  {
    dciKey: 'VALPROATE DE SODIUM', dci: 'Valproate de sodium',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'CONTRE-INDICATION ABSOLUE chez la femme en âge de procréer sauf critères stricts (PGR : 2 contraceptions + avis spécialiste) — risque malformatif 10 %, troubles du développement 30-40 %.',
    breastfeedingNote: 'Possible sous surveillance (hépatotoxicité rares).',
    alternatives: ['Lévétiracétam', 'Lamotrigine (adapter doses)'],
  },
  {
    dciKey: 'ACIDE VALPROIQUE', dci: 'Acide valproïque',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Contre-indication absolue pendant la grossesse (sauf épilepsie réfractaire documentée) — risque malformatif ~10 %.',
    breastfeedingNote: 'Possible sous surveillance.',
    alternatives: ['Lévétiracétam', 'Lamotrigine'],
  },
  {
    dciKey: 'CARBAMAZEPINE', dci: 'Carbamazépine',
    pregnancy: 'DECONSEILLE', breastfeeding: 'SURE',
    pregnancyNote: 'Possible si besoin (spina bifida 1 % : acide folique 5 mg/j pré-conceptionnel obligatoire) — mieux que valproate mais préférer lévétiracétam/lamotrigine.',
    breastfeedingNote: 'Compatible avec l’allaitement.',
    alternatives: ['Lévétiracétam', 'Lamotrigine'],
  },
  {
    dciKey: 'LEVETIRACETAM', dci: 'Lévétiracétam',
    pregnancy: 'PRUDENCE', breastfeeding: 'SURE',
    pregnancyNote: 'Antiépileptique de référence si traitement nécessaire pendant la grossesse (données rassurantes).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'LAMOTRIGINE', dci: 'Lamotrigine',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Utilisable — clairance augmentée pendant la grossesse (dosages plasmatiques, adapter la dose).',
    breastfeedingNote: 'Possible — surveiller éruption cutanée du nourrisson.',
  },
  {
    dciKey: 'SUMATRIPTAN', dci: 'Sumatriptan',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Triptan : données rassurantes mais paracétamol en 1re intention ; possible si migraine sévère.',
    breastfeedingNote: 'Compatible — allaiter 4 h après la prise.',
    alternatives: ['Paracétamol'],
  },

  // --- Autres classes critiques ---
  {
    dciKey: 'ISOTRETINOINE', dci: 'Isotrétinoïne',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'CONTRE-INDICATION ABSOLUE — tératogène majeur (rétinoïde : malformations SNC, cœur, thym). Contraception obligatoire 1 mois avant/après, tests de grossesse mensuels (PGR).',
    breastfeedingNote: 'Contre-indiqué pendant l’allaitement.',
  },
  {
    dciKey: 'METHOTREXATE', dci: 'Méthotrexate',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'Contre-indiqué chez l’homme et la femme en projet de grossesse (fœtopathie, avortements) — contraception 3 mois avant/après (6 mois homme).',
    breastfeedingNote: 'Contre-indiqué pendant l’allaitement.',
  },
  {
    dciKey: 'MISOPROSTOL', dci: 'Misoprostol',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Contre-indiqué pendant la grossesse (utérocontractile : avortement, malformations de type Möbius).',
    breastfeedingNote: 'Données limitées — éviter par prudence.',
  },
  {
    dciKey: 'FINASTERIDE', dci: 'Finastéride',
    pregnancy: 'CONTRE_INDIQUE', breastfeeding: 'CONTRE_INDIQUE',
    pregnancyNote: 'Contre-indiqué — risque d’anomalies des organes génitaux externes du fœtus masculin (inhibition 5-alpha-réductase).',
    breastfeedingNote: 'Non applicable / contre-indiqué.',
  },
  {
    dciKey: 'THIAMAZOLE', dci: 'Thiamazole (carbimazole)',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Antithyroïdien possible à dose minimale (risque rare d’aplasie cutanée) — surveillance TFT.',
    breastfeedingNote: 'Possible à faible dose — surveillance thyroidienne du nourrisson.',
    alternatives: ['Propylthiouracile (1er trimestre)'],
  },
  {
    dciKey: 'LEVOTHYROXINE', dci: 'Lévothyroxine',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Compatible — souvent à augmenter pendant la grossesse (adaptation TSH).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'OMEPRAZOLE', dci: 'Oméprazole',
    pregnancy: 'PRUDENCE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'IPP utilisable si nécessaire (données rassurantes) — privilégier les mesures hygiéno-diététiques d’abord.',
    breastfeedingNote: 'Possible à dose standard (faible passage).',
  },
  {
    dciKey: 'CETIRIZINE', dci: 'Cétirizine',
    pregnancy: 'SURE', breastfeeding: 'PRUDENCE',
    pregnancyNote: 'Antihistaminique de 2e génération compatible pendant la grossesse (CRAT : « utilisable »).',
    breastfeedingNote: 'Possible à faible dose — surveiller somnolence/irritabilité du nourrisson.',
  },
  {
    dciKey: 'SALBUTAMOL', dci: 'Salbutamol',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Bronchodilatateur de référence — le traitement de l’asthme doit être poursuivi pendant la grossesse.',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'BECLOMETASONE', dci: 'Béclométasone (inhalée)',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Corticoïde inhalé de référence — l’asthme non contrôlé est plus dangereux que le traitement.',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'PREDNISOLONE', dci: 'Prednisolone',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Corticoïde systémique possible (si > 20 mg/j prolongé : risque d’insuffisance surrénale néonatale).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    dciKey: 'HEPARINE', dci: 'Héparine (HBPM)',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Anticoagulant de référence pendant la grossesse (ne traverse pas le placenta).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
  {
    // C20 (audit) : le registre algérien nomme la molécule « ENOXAPARINE SODIQUE » —
    // la clé courte couvre aussi la forme salifiée via stripSaltsKey.
    dciKey: 'ENOXAPARINE', dci: 'Énoxaparine (HBPM — Lovenox®)',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'HBPM de référence pendant la grossesse (ne traverse pas le placenta) — posologie préventive ou curative selon l’indication, en unités anti-Xa.',
    breastfeedingNote: 'Compatible avec l’allaitement (poids moléculaire élevé, passage lacté négligeable).',
  },
  {
    dciKey: 'FER', dci: 'Sels de fer',
    pregnancy: 'SURE', breastfeeding: 'SURE',
    pregnancyNote: 'Supplémentation recommandée pendant la grossesse (prévention de l’anémie).',
    breastfeedingNote: 'Compatible avec l’allaitement.',
  },
]

/* Index par clé DCI (exact + sans sels). */
const ruleIndex = new Map<string, PregnancyRule>()
for (const r of PREGNANCY_RULES) ruleIndex.set(r.dciKey, r)

function stripSaltsKey(k: string): string {
  const SALTS = new Set([
    'DICHLORHYDRATE', 'CHLORHYDRATE', 'HYDROCHLORIDE', 'MALEATE', 'SUCCINATE',
    'SULFATE', 'SODIQUE', 'POTASSIQUE', 'MESILATE', 'TARTRATE', 'BESYLATE',
    'FUMARATE', 'CITRATE', 'ACETATE', 'BROMHYDRATE', 'TOSYLATE', 'TRIHYDRATE',
    'MONOHYDRATE', 'DIHYDRATE', 'ANHYDRE', 'BROMURE', 'GLUCONATE', 'LACTATE',
    'HEMISULFATE', 'VALERATE', 'PROPIONATE', 'ENANTATE', 'SEMIFUMARATE',
  ])
  const words = k.split(' ').filter((w) => !SALTS.has(w))
  return words.length ? words.join(' ') : k
}

export function normalizeDciKey(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Recherche une règle pour une DCI (exact, sans sels, composantes d'association). */
export function findPregnancyRule(dciKey: string | null | undefined): PregnancyRule | null {
  const k = normalizeDciKey(dciKey)
  if (!k) return null
  // exact
  if (ruleIndex.has(k)) return ruleIndex.get(k)!
  // sans sels
  const s = stripSaltsKey(k)
  if (ruleIndex.has(s)) return ruleIndex.get(s)!
  // composantes d'association
  const parts = k.split(/\s*\+\s*|\s*\/\s*|\s+ET\s+/)
  for (const p of parts) {
    const ps = stripSaltsKey(p.trim())
    if (ruleIndex.has(ps)) return ruleIndex.get(ps)!
  }
  return null
}

/** Classification automatique depuis le texte des fiches livres (Grossesse/Allaitement). */
export function classifyPregnancyText(text: string): PregnancyRisk | null {
  const t = text.toLowerCase()
  const has = (re: RegExp) => re.test(t)
  if (has(/contre-?indicat|formellement|absolue|tératogène/)) return 'CONTRE_INDIQUE'
  if (has(/à éviter|a éviter|déconseill|eviter par principe/)) return 'DECONSEILLE'
  if (has(/prudence|surveillance|cas par cas|possible si/)) return 'PRUDENCE'
  if (has(/de choix|utilisable|compatible|peut être utilisé|sans risque/)) return 'SURE'
  return null
}
