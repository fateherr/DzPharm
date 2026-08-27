/**
 * Moteur local de règles d'interactions médicamenteuses (DzPharm).
 * Base de référence synthétique des associations cliniquement pertinentes
 * couramment rencontrées en Algérie. Fonctionne sans IA — réponse instantanée,
 * utilisée comme premier niveau d'analyse et comme repli si le service IA
 * d'analyse approfondie est indisponible.
 *
 * NB : liste non exhaustive — l'analyse IA complète et la validation
 * pharmaceutique restent indispensables.
 */

export type LocalSeverity = 'CONTRE-INDIQUE' | 'MAJEURE' | 'MODEREE' | 'MINEURE'

export interface LocalRule {
  id: string
  /** Jetons DCI (majuscules, sans accents) du premier membre de l'association. */
  left: string[]
  /** Jetons DCI du second membre. */
  right: string[]
  severity: LocalSeverity
  mechanism: string
  management: string
}

/* ------------------------------------------------------------------ */
/* Jetons de classes pharmacologiques                                  */
/* ------------------------------------------------------------------ */

const IEC = ['CAPTOPRIL', 'ENALAPRIL', 'LISINOPRIL', 'RAMIPRIL', 'PERINDOPRIL', 'QUINAPRIL', 'FOSINOPRIL', 'TRANDOLAPRIL', 'ZOFENOPRIL']
const ARA2 = ['LOSARTAN', 'VALSARTAN', 'IRBESARTAN', 'CANDESARTAN', 'TELMISARTAN', 'OLMESARTAN']
const AINS = ['IBUPROFENE', 'DICLOFENAC', 'KETOPROFENE', 'NAPROXENE', 'PIROXICAM', 'MELOXICAM', 'ACECLOFENAC', 'INDOMETACINE', 'FLURBIPROFENE', 'ASPIRINE']
const ISRS = ['FLUOXETINE', 'SERTRALINE', 'PAROXETINE', 'CITALOPRAM', 'ESCITALOPRAM', 'FLUVOXAMINE']
const IMAT = ['PHENELZINE', 'MOCLOBEMIDE', 'IPRONIAZIDE', 'ISOCARBOXAZIDE']
const MACROLIDES = ['ERYTHROMYCINE', 'CLARITHROMYCINE', 'AZITHROMYCINE', 'ROXITHROMYCINE', 'SPIRAMYCINE']
const FLUOROQUINOLONES = ['CIPROFLOXACINE', 'OFLOXACINE', 'LEVOFLOXACINE', 'NORFLOXACINE', 'MOXIFLOXACINE']
const STATINES = ['SIMVASTATINE', 'ATORVASTATINE', 'ROSUVASTATINE', 'PRAVASTATINE', 'FLUVASTATINE']
const AZOLES = ['KETOCONAZOLE', 'ITRACONAZOLE', 'FLUCONAZOLE', 'VORICONAZOLE']
const BENZODIAZEPINES = ['DIAZEPAM', 'BROMAZEPAM', 'ALPRAZOLAM', 'LORAZEPAM', 'CLONAZEPAM', 'OXAZEPAM', 'MIDAZOLAM']
const THIAZIDIQUES = ['HYDROCHLOROTHIAZIDE', 'INDAPAMIDE', 'CHLORTALIDONE']
const IPP = ['OMEPRAZOLE', 'ESOMEPRAZOLE', 'PANTOPRAZOLE', 'LANSOPRAZOLE', 'RABEPRAZOLE']
const SULFONYLUREES = ['GLIBENCLAMIDE', 'GLICLAZIDE', 'GLIMEPIRIDE', 'GLIPIZIDE']
const INDUCTEURS_ENZYMATIQUES = ['RIFAMPICINE', 'CARBAMAZEPINE', 'PHENYTOINE', 'PHENOBARBITAL', 'PRIMIDONE']
const OPIOIDES_FORTS = ['MORPHINE', 'TRAMADOL', 'FENTANYL', 'OXYCODONE', 'CODEINE']
const NITRES = ['TRINITRINE', 'ISOSORBIDE', 'MOLSIDOMINE']
const ANTACIDES = ['CALCIUM', 'MAGNESIUM', 'ALUMINIUM', 'HYDROXYDE D ALUMINIUM', 'CARBONATE DE CALCIUM', 'SIMETICONE']
const DIGITALIQUES = ['DIGOXINE']
const SYSTEMIQUES_AZOLES_CYP3A4 = ['KETOCONAZOLE', 'ITRACONAZOLE']

/* ------------------------------------------------------------------ */
/* Règles                                                              */
/* ------------------------------------------------------------------ */

export const LOCAL_RULES: LocalRule[] = [
  // --- Antalgiques / AINS / anticoagulants -------------------------
  {
    id: 'aspirine-warfarine',
    left: ['ASPIRINE', 'ACIDE ACETYLSALICYLIQUE'],
    right: ['WARFARINE'],
    severity: 'MAJEURE',
    mechanism: 'Addition des effets anticoagulants (aspirine : inhibition plaquettaire + lésion de la muqueuse digestive ; warfarine : inhibition de la vitamine K). Risque hémorragique majeur.',
    management: 'Association déconseillée sauf avis spécialisé. Si nécessaire : INR rapproché, dose minimale d\u2019aspirine, protection gastrique par IPP et surveillance clinique des signes hémorragiques.',
  },
  {
    id: 'paracetamol-warfarine',
    left: ['PARACETAMOL'],
    right: ['WARFARINE'],
    severity: 'MODEREE',
    mechanism: 'Le paracétamol à doses répétées (> 2 g/j pendant plusieurs jours) potentialise l\u2019anticoagulant en perturbant la synthèse des facteurs hépatiques.',
    management: 'Paracétamol préféré aux AINS comme antalgique chez le patient anticoagulé, sans dépasser 2 g/j de façon prolongée. Contrôle de l\u2019INR si prise itérative.',
  },
  {
    id: 'ains-warfarine',
    left: AINS.filter((a) => a !== 'ASPIRINE'),
    right: ['WARFARINE'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition plaquettaire + toxicité digestive additive des AINS sur l\u2019anticoagulation par warfarine : risque hémorragique (surtout digestif) multiplié.',
    management: 'Éviter l\u2019association. Antalgique de première intention : paracétamol. Si AINS indispensable : durée courte + IPP + surveillance INR et de l\u2019hémogramme.',
  },
  {
    id: 'aspirine-ibuprofene',
    left: ['ASPIRINE', 'ACIDE ACETYLSALICYLIQUE'],
    right: ['IBUPROFENE', 'KETOPROFENE', 'DICLOFENAC'],
    severity: 'MODEREE',
    mechanism: 'Compétition au niveau du site de liaison de la cyclooxygénase : l\u2019AINS peut réduire l\u2019effet antiagrégant de l\u2019aspirine à faible dose, avec addition de la toxicité digestive.',
    management: 'Espacer la prise d\u2019aspirine d\u2019au moins 2 h avant l\u2019AINS, ou préférer le paracétamol. Surveillance de la tolérance digestive.',
  },
  {
    id: 'ains-methotrexate',
    left: AINS,
    right: ['METHOTREXATE'],
    severity: 'MAJEURE',
    mechanism: 'Réduction de l\u2019élimination rénale du méthotrexate (compétition tubulaire) et addition des toxicités digestives : risque de myélotoxicité et mucite.',
    management: 'Association à éviter. Si co-prescription inévitable à faible dose (polyarthrite) : methotrexate hebdomadaire, NFS et transaminases rapprochées, calcium folinate si besoin.',
  },
  {
    id: 'aod-ains',
    left: ['RIVAROXABAN', 'DABIGATRAN', 'APIXABAN', 'EDOXABAN'],
    right: AINS,
    severity: 'MAJEURE',
    mechanism: 'Addition du risque hémorragique : anticoagulant oral direct + inhibition plaquettaire et lésions digestives des AINS.',
    management: 'Éviter. En cas de douleur : paracétamol en première intention. Si association ponctuelle indispensable : dose minimale, durée courte, surveillance de l\u2019hémoglobine et des selles.',
  },

  // --- Cardio-vasculaire --------------------------------------------
  {
    id: 'iec-ains',
    left: [...IEC, ...ARA2],
    right: AINS,
    severity: 'MAJEURE',
    mechanism: 'Les AINS réduisent la synthèse des prostaglandines vasodilatatrices rénales : chute de l\u2019effet antihypertenseur, risque d\u2019insuffisance rénale aiguë (triple mécanisme avec diurétique).',
    management: 'Éviter, surtout chez le sujet âgé ou insuffisant rénal. Préférer le paracétamol. Si AINS nécessaire : courte durée, contrôle de la créatinine et de la kaliémie à 7 jours.',
  },
  {
    id: 'iec-spironolactone',
    left: [...IEC, ...ARA2],
    right: ['SPIRONOLACTONE', 'EPLERENONE', 'CANRENOATE', 'AMILORIDE'],
    severity: 'MAJEURE',
    mechanism: 'Addition de l\u2019effet hyperkaliémiant (inhibition de l\u2019aldostérone + réduction de l\u2019excrétion tubulaire du potassium) : risque d\u2019hyperkaliémie menaçante.',
    management: 'Association utile dans l\u2019insuffisance cardiaque mais sous surveillance stricte : kaliémie et créatinine à 3-7 jours puis régulièrement. Limiter les apports potassiques.',
  },
  {
    id: 'iec-lithium',
    left: [...IEC, ...ARA2, ...THIAZIDIQUES],
    right: ['LITHIUM', 'CARBONATE DE LITHIUM'],
    severity: 'MAJEURE',
    mechanism: 'Réduction de la clairance rénale du lithium : augmentation de la lithémie avec risque de toxicité (tremblements, confusion, insuffisance rénale).',
    management: 'Surveillance clinique et lithémie rapprochée (à 5-7 jours puis toutes les 4-6 semaines). Adapter la posologie du lithium. Éducation du patient aux signes de surdosage.',
  },
  {
    id: 'bêtabloquant-verapamil',
    left: ['ATENOLOL', 'BISOPROLOL', 'METOPROLOL', 'PROPRANOLOL', 'NEBIVOLOL', 'CARVEDILOL'],
    right: ['VERAPAMIL', 'DILTIAZEM'],
    severity: 'MAJEURE',
    mechanism: 'Addition des effets chronotropes et dromotropes négatifs : bradycardie sévère, troubles de conduction, décompensation cardiaque.',
    management: 'Association contre-indiquée en cas de dysfonction sinusale ou de trouble de conduction. Si indispensable : ECG, fréquence cardiaque surveillée, doses minimales, éducation aux signes d\u2019intolérance.',
  },
  {
    id: 'amiodarone-digoxine',
    left: ['AMIODARONE'],
    right: DIGITALIQUES,
    severity: 'MAJEURE',
    mechanism: 'Inhibition du transporteur P-gp par l\u2019amiodarone : augmentation de la digoxinémie (jusqu\u2019à ×2) avec risque de toxicité digitalique.',
    management: 'Réduire la digoxine de moitié à l\u2019introduction de l\u2019amiodarone. Digoxinémie, ECG (trouble de conduction), surveillance clinique (nausées, troubles visuels, bradycardie).',
  },
  {
    id: 'digoxine-hypokaliemie',
    left: ['FUROSEMIDE', 'BUMETANIDE', ...THIAZIDIQUES],
    right: DIGITALIQUES,
    severity: 'MODEREE',
    mechanism: 'L\u2019hypokaliémie induite par les diurétiques favorise la liaison de la digoxine à la pompe Na/K-ATPase : potentialisation de la toxicité digitalique.',
    management: 'Corriger la kaliémie (supplémentation si K+ < 4 mmol/L), surveiller ECG et digoxinémie, éducation aux signes de toxicité digitalique.',
  },
  {
    id: 'amiodarone-warfarine',
    left: ['AMIODARONE'],
    right: ['WARFARINE'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition du CYP2C9 par l\u2019amiodarone : augmentation de l\u2019INR avec risque hémorragique (effet retardé de plusieurs jours).',
    management: 'Réduire la warfarine de 30-50 % à l\u2019introduction. INR rapproché la première semaine puis hebdomadaire jusqu\u2019à stabilisation.',
  },
  {
    id: 'sildenafil-nitres',
    left: ['SILDENAFIL', 'TADALAFIL', 'VARDENAFIL'],
    right: NITRES,
    severity: 'CONTRE-INDIQUE',
    mechanism: 'Addition des effets vasodilatateurs (IPDE5 + donneur de monoxyde d\u2019azote) : hypotension artérielle profonde, voire état de choc.',
    management: 'Association formellement contre-indiquée. Délai de 24 h (48 h pour tadalafil) entre la prise d\u2019IPDE5 et tout dérivé nitré. Vérifier systématiquement les traitements du patient.',
  },
  {
    id: 'statines-clarithromycine',
    left: STATINES,
    right: ['CLARITHROMYCINE', 'ERYTHROMYCINE'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition du CYP3A4 : augmentation importante des concentrations de statine avec risque de rhabdomyolyse (simvastatine/atorvastatine les plus concernées).',
    management: 'Suspendre la statine pendant le traitement macrolide ou utiliser l\u2019azithromycine (peu inhibitrice). Éducation aux signes : myalgies, urines foncées, faiblesse — dosage CPK si symptômes.',
  },
  {
    id: 'statines-azoles',
    left: STATINES,
    right: SYSTEMIQUES_AZOLES_CYP3A4,
    severity: 'MAJEURE',
    mechanism: 'Inhibition du CYP3A4 par les azolés systémiques : majoration de la myotoxicité des statines.',
    management: 'Réduire la dose de statine ou interruption temporaire pendant l\u2019antifongique. Surveillance des CPK et des myalgies. La pravastatine et la rosuvastatine (non métabolisées par CYP3A4) sont préférables.',
  },
  {
    id: 'simvastatine-amlodipine',
    left: ['SIMVASTATINE'],
    right: ['AMLODIPINE'],
    severity: 'MODEREE',
    mechanism: 'L\u2019amlodipine inhibe modérément le CYP3A4 : exposition accrue à la simvastatine et risque de rhabdomyolyse.',
    management: 'Ne pas dépasser 20 mg/j de simvastatine en association, ou substituer par une statine non concernée (rosuvastatine, pravastatine). Surveiller myalgies et CPK.',
  },

  // --- Anti-infectieux ----------------------------------------------
  {
    id: 'macrolides-warfarine',
    left: MACROLIDES.filter((m) => m !== 'AZITHROMYCINE'),
    right: ['WARFARINE'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition du CYP3A4 et déplacement protéique : majoration de l\u2019effet anticoagulant et de l\u2019INR.',
    management: 'INR à 3-4 jours après l\u2019initiation. Signes hémorragiques à expliquer au patient. L\u2019azithromycine est l\u2019alternative la plus sûre.',
  },
  {
    id: 'fq-tendinopathie',
    left: FLUOROQUINOLONES,
    right: ['PREDNISONE', 'PREDNISOLONE', 'METHYLPREDNISOLONE', 'DEXAMETHASONE', 'BETAMETHASONE', 'CORTICOIDE'],
    severity: 'MODEREE',
    mechanism: 'Les fluorquinolones exposent à la tendinopathie (rupture du tendon d\u2019Achille), risque fortement majoré par la corticothérapie systémique, surtout après 60 ans.',
    management: 'Éviter si possible (alternative antibiotique). Sinon : éviter le sport intensif, arrêt immédiat et avis médical à la moindre douleur tendineuse.',
  },
  {
    id: 'fq-antacides',
    left: FLUOROQUINOLONES,
    right: [...ANTACIDES, 'FER', 'SULFATE FERREUX', 'CALCIUM', 'ZINC'],
    severity: 'MODEREE',
    mechanism: 'Chélation digestive entre le cation (fer, calcium, magnésium, aluminium) et la fluorquinolone : chute de l\u2019absorption antibiotique et échec thérapeutique.',
    management: 'Espacer les prises : antibiotique 2 h avant ou 4 h après le sel minéral. Choisir si possible une supplémentation à distance des repas antibiotiques.',
  },
  {
    id: 'cyclines-fer',
    left: ['DOXYCYCLINE', 'MINOCYCLINE', 'LYMECYCLINE', 'TETRACYCLINE'],
    right: ['FER', 'SULFATE FERREUX', 'CALCIUM', ...ANTACIDES],
    severity: 'MODEREE',
    mechanism: 'Chélation digestive : perte d\u2019efficacité de la cycline par complexation insoluble avec les cations.',
    management: 'Prendre la cycline 2 h avant ou 4 h après le fer/calcium/antacid. La doxycycline (prise au cours d\u2019un repas léger sans produits laitiers) est la moins sensible.',
  },
  {
    id: 'rifampicine-contraceptifs',
    left: INDUCTEURS_ENZYMATIQUES,
    right: ['ETHINYLESTRADIOL', 'LEVNORGESTREL', 'DESOGESTREL', 'DROSPIRENONE', 'CONTRACEPTIF'],
    severity: 'MAJEURE',
    mechanism: 'Induction enzymatique hépatique (CYP3A4) : accélération du métabolisme des hormones contraceptives avec risque d\u2019échec de contraception.',
    management: 'Ajouter une méthode barrier (préservatif) pendant le traitement et 4 à 8 semaines après l\u2019arrêt, ou utiliser un contraceptif adapté (progestatif hors CYP3A4 / DIU).',
  },
  {
    id: 'rifampicine-warfarine',
    left: ['RIFAMPICINE', 'RIFABUTINE'],
    right: ['WARFARINE'],
    severity: 'MAJEURE',
    mechanism: 'Induction du CYP2C9 : chute de l\u2019INR et risque thrombotique à l\u2019introduction, effet inverse (surdosage) à l\u2019arrêt.',
    management: 'Contrôle de l\u2019INR très rapproché (2×/semaine en début et à l\u2019arrêt). Adaptation posologique fréquente et nécessaire.',
  },
  {
    id: 'theophylline-macrolides',
    left: ['THEOPHYLLINE'],
    right: ['ERYTHROMYCINE', 'CLARITHROMYCINE', 'CIPROFLOXACINE'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition du métabolisme hépatique de la théophylline : risque de surdosage (tachycardie, convulsions, arythmies).',
    management: 'Réduire la théophylline d\u2019environ 1/3 et surveiller la théophyllinémie. Éducation aux signes de surdosage (palpitations, tremblements, insomnie, vomissements).',
  },
  {
    id: 'griseofulvine-warfarine',
    left: ['GRISEOFULVINE'],
    right: ['WARFARINE'],
    severity: 'MODEREE',
    mechanism: 'Induction enzymatique : diminution de l\u2019effet anticoagulant.',
    management: 'Surveiller l\u2019INR et adapter la posologie de warfarine pendant et après le traitement.',
  },

  // --- Diabétologie --------------------------------------------------
  {
    id: 'metformine-contraste',
    left: ['METFORMINE'],
    right: ['PRODUIT DE CONTRASTE', 'CONTRASTE IODE', 'IODIXANOL', 'IOHEXOL', 'IOVERSOL'],
    severity: 'MAJEURE',
    mechanism: 'Le produit de contraste iodé peut provoquer une néphropathie induite : accumulation de metformine et risque d\u2019acidose lactique.',
    management: 'Arrêter la metformine 48 h avant l\u2019examen, ne la reprendre que 48 h après, après contrôle de la créatinine. Hydratation du patient.',
  },
  {
    id: 'sulfamides-fq',
    left: SULFONYLUREES,
    right: FLUOROQUINOLONES,
    severity: 'MODEREE',
    mechanism: 'Les fluorquinolones potentialisent l\u2019effet hypoglycémiant des sulfamides (effet propre + déplacement protéique) : risque d\u2019hypoglycémie.',
    management: 'Renforcer l\u2019autosurveillance glycémique pendant l\u2019antibiothérapie, informer le patient des signes d\u2019hypoglycémie (sueurs, tremblements, faim).',
  },
  {
    id: 'insuline-bêtabloquant',
    left: ['INSULINE'],
    right: ['ATENOLOL', 'BISOPROLOL', 'METOPROLOL', 'PROPRANOLOL', 'NEBIVOLOL'],
    severity: 'MODEREE',
    mechanism: 'Les bêtabloquants masquent les signes adrénergiques d\u2019alerte de l\u2019hypoglycémie (palpitations, tremblements) et peuvent prolonger l\u2019hypoglycémie.',
    management: 'Préférer un bêtabloquant cardio-sélectif. Autosurveillance glycémique renforcée à l\u2019instauration. Éducation : reconnaître les signes neuroglycopéniques (confusion, sueurs).',
  },

  // --- Psychotropes ---------------------------------------------------
  {
    id: 'isrs-imao',
    left: ISRS,
    right: IMAT,
    severity: 'CONTRE-INDIQUE',
    mechanism: 'Blocage simultané de la recapture et de la dégradation de la sérotonine : risque de syndrome sérotoninergique grave (hyperthermie, convulsions, rhabdomyolyse).',
    management: 'Association contre-indiquée. Respecter un délai de wash-out de 2 semaines (5 semaines pour la fluoxétine) entre les deux traitements.',
  },
  {
    id: 'isrs-tramadol',
    left: ISRS,
    right: ['TRAMADOL'],
    severity: 'MAJEURE',
    mechanism: 'Addition sérotoninergique + diminution de l\u2019efficacité analgésique (compétition métabolique) : risque de syndrome sérotoninergique et de convulsions.',
    management: 'Éviter l\u2019association. Analgésie alternative (paracétamol ± morphinique direct). Si association maintenue : doses minimales, surveillance clinique étroite (agitation, myoclonies, fièvre).',
  },
  {
    id: 'isrs-ains',
    left: ISRS,
    right: AINS,
    severity: 'MAJEURE',
    mechanism: 'Les ISRS altèrent l\u2019agrégation plaquettaire (déplétion sérotoninique plaquettaire) et s\u2019additionnent à la toxicité digestive des AINS : hémorragie digestive haute.',
    management: 'Éviter si possible ; sinon associer un IPP protecteur, privilégier le paracétamol, surveiller méléna et anémie.',
  },
  {
    id: 'isrs-lithium',
    left: ISRS,
    right: ['LITHIUM', 'CARBONATE DE LITHIUM'],
    severity: 'MAJEURE',
    mechanism: 'Potentialisation sérotoninergique et réduction de la clairance du lithium : risque de syndrome sérotoninergique et de lithiémie élevée.',
    management: 'Surveillance clinique rapprochée (tremblements, soif, confusion) et lithémie régulière. Doses prudentes des deux molécules.',
  },
  {
    id: 'opioides-benzodiazepines',
    left: OPIOIDES_FORTS,
    right: BENZODIAZEPINES,
    severity: 'MAJEURE',
    mechanism: 'Dépression additive des centres respiratoires : risque de dépression respiratoire profonde, notamment chez le sujet âgé ou en début de traitement.',
    management: 'Réserver aux cas sans alternative, aux doses minimales efficaces, durée la plus courte. Informer le patient et l\u2019entourage des signes de surdosage (somnolence excessive, respiration lente). Éviter l\u2019alcool.',
  },
  {
    id: 'carbamazepine-contraceptifs',
    left: ['CARBAMAZEPINE', 'PHENYTOINE', 'PHENOBARBITAL', 'PRIMIDONE', 'OXCARBAZEPINE'],
    right: ['ETHINYLESTRADIOL', 'LEVNORGESTREL', 'DESOGESTREL', 'DROSPIRENONE', 'CONTRACEPTIF'],
    severity: 'MODEREE',
    mechanism: 'Induction enzymatique : diminution des concentrations hormonales et risque d\u2019échec contraceptif.',
    management: 'Méthode contraceptive non hormonale ou adaptation (progestatif à forte dose / DIU cuivre). Informer la patiente.',
  },
  {
    id: 'lithium-ains',
    left: ['LITHIUM', 'CARBONATE DE LITHIUM'],
    right: AINS,
    severity: 'MAJEURE',
    mechanism: 'Les AINS réduisent la filtration glomérulaire et la réabsorption proximale du lithium : augmentation de la lithiémie (jusqu\u2019à +40 %).',
    management: 'Éviter les AINS (paracétamol en première intention). Si indispensable : demi-dose d\u2019AINS, lithémie de contrôle après 4-5 jours, hydratation correcte.',
  },
  {
    id: 'lithium-thiazidiques',
    left: ['LITHIUM', 'CARBONATE DE LITHIUM'],
    right: THIAZIDIQUES,
    severity: 'MAJEURE',
    mechanism: 'Réduction de la clairance du lithium par les diurétiques thiazidiques : risque de surdosage progressif.',
    management: 'Lithémie rapprochée à l\u2019instauration (5-7 jours), réduction préventive de la dose de lithium d\u2019environ 25-50 %, éducation aux signes de toxicité.',
  },

  // --- Gastro-entérologie --------------------------------------------
  {
    id: 'omeprazole-clopidogrel',
    left: ['CLOPIDOGREL'],
    right: IPP,
    severity: 'MAJEURE',
    mechanism: 'L\u2019oméprazole (et l\u2019ésoméprazole) inhibent le CYP2C19 qui active le clopidogrel : réduction de l\u2019effet antiagrégant et risque thrombotique.',
    management: 'Préférer le pantoprazole (peu inhibiteur du CYP2C19) si un IPP est nécessaire. Éviter oméprazole et ésoméprazole chez le patient coronarien sous clopidogrel.',
  },
  {
    id: 'omeprazole-methotrexate',
    left: IPP,
    right: ['METHOTREXATE'],
    severity: 'MODEREE',
    mechanism: 'Compétition de l\u2019élimination tubulaire du méthotrexate : augmentation des concentrations et de la toxicité hématologique.',
    management: 'Surveillance de la NFS et des transaminases. Discuter de l\u2019arrêt temporaire de l\u2019IPP pendant les cures de méthotrexate.',
  },
  {
    id: 'cisapride-macrolides',
    left: ['CISAPRIDE'],
    right: MACROLIDES.concat(AZOLES),
    severity: 'CONTRE-INDIQUE',
    mechanism: 'Inhibition du CYP3A4 : accumulation de cisapride et allongement majeur de l\u2019intervalle QT avec risque de torsades de pointes.',
    management: 'Association contre-indiquée. Utiliser un prokinétique alternatif (dompéridone, sous réserve de l\u2019ECG) et un antibiotique non inhibiteur.',
  },

  // --- Divers ----------------------------------------------------------
  {
    id: 'allopurinol-azathioprine',
    left: ['ALLOPURINOL'],
    right: ['AZATHIOPRINE', 'MERCAPTOPURINE'],
    severity: 'CONTRE-INDIQUE',
    mechanism: 'Inhibition de la xanthine oxydase : blocage du catabolisme de l\u2019azathioprine et accumulation de métabolites actifs avec myélotoxicité sévère.',
    management: 'Association contre-indiquée sauf avis hématologique spécialisé avec réduction de la dose d\u2019immunosuppresseur à 25 % et NFS très rapprochée.',
  },
  {
    id: 'colchicine-clarithromycine',
    left: ['COLCHICINE'],
    right: ['CLARITHROMYCINE', 'ERYTHROMYCINE', 'CICLOSPORINE', 'ATAZANAVIR', 'RITONAVIR'],
    severity: 'MAJEURE',
    mechanism: 'Inhibition de la P-gp et du CYP3A4 : multiplication des concentrations de colchicine avec risque de toxicité mortelle (aplasie médullaire, rhabdomyolyse).',
    management: 'Réduire fortement la colchicine (dose maximale 0,5 mg/j) et limiter la durée, ou suspendre. NFS, CPK, fonction rénale surveillées.',
  },
  {
    id: 'colchicine-statines',
    left: ['COLCHICINE'],
    right: STATINES,
    severity: 'MODEREE',
    mechanism: 'Addition des risques musculaires : majoration du risque de rhabdomyolyse, surtout si insuffisance rénale.',
    management: 'Doses minimales, hydratation, éducation aux myalgies et urines foncées. Dosage CPK si symptômes.',
  },
  {
    id: 'fer-levothyroxine',
    left: ['LEVOTHYROXINE', 'LIOTHYRONINE'],
    right: ['FER', 'SULFATE FERREUX', 'FUMARATE FERREUX', ...ANTACIDES, 'CALCIUM'],
    severity: 'MODEREE',
    mechanism: 'Chélation digestive et élévation du pH gastrique : chute de l\u2019absorption de l\u2019hormone thyroïdienne avec réapparition de l\u2019hypothyroïdie.',
    management: 'Espacer les prises d\u2019au moins 4 h (lévothyroxine à jeun à distance). Contrôle de la TSH après 6 semaines.',
  },
  {
    id: 'ip-thiazidiques',
    left: IPP,
    right: THIAZIDIQUES,
    severity: 'MINEURE',
    mechanism: 'L\u2019hypomagnésémie induite par les IPP majore le risque d\u2019hypokaliémie des diurétiques thiazidiques.',
    management: 'Surveillance de la kaliémie et de la magnésémie chez les patients fragiles (âgés, digitalisés). Supplémentation si besoin.',
  },
  {
    id: 'prednisone-ias',
    left: ['PREDNISONE', 'PREDNISOLONE', 'DEXAMETHASONE'],
    right: ['INSULINE', 'GLIBENCLAMIDE', 'GLICLAZIDE', 'METFORMINE', 'GLIMEPIRIDE'],
    severity: 'MODEREE',
    mechanism: 'Les corticoïdes induisent une insulinorésistance : déséquilibre glycémique chez le diabétique.',
    management: 'Renforcer la surveillance glycémique pendant et après la corticothérapie, adapter transitoirement le traitement antidiabétique (souvent +20-30 %).',
  },
  {
    id: 'tramadol-carbamazepine',
    left: ['TRAMADOL'],
    right: ['CARBAMAZEPINE', 'PHENYTOINE', 'PHENOBARBITAL', 'RIFAMPICINE'],
    severity: 'MODEREE',
    mechanism: 'Induction enzymatique : réduction de l\u2019efficacité analgésique du tramadol (métabolisme accéléré).',
    management: 'Antalgie alternative ou adaptation posologique sous contrôle de l\u2019efficacité.',
  },
  {
    id: 'cimetidine-anticoagulants',
    left: ['CIMETIDINE'],
    right: ['WARFARINE', 'PHENYTOINE', 'THEOPHYLLINE', 'DIAZEPAM'],
    severity: 'MODEREE',
    mechanism: 'Inhibition du CYP3A4/2C9 par la cimétidine : augmentation des concentrations des médicaments métabolisés par ces voies.',
    management: 'Préférer un IPP ou la famotidine. Si cimétidine nécessaire : surveiller INR, concentrations et effets indésirables.',
  },
  {
    id: 'fer-levodopa',
    left: ['LEVODOPA', 'CARBIDOPA', 'BENSERAZIDE'],
    right: ['FER', 'SULFATE FERREUX'],
    severity: 'MINEURE',
    mechanism: 'Chélation digestive du fer avec la lévodopa : réduction de l\u2019absorption et de l\u2019efficacité antiparkinsonienne.',
    management: 'Espacer les prises (fer ≥ 2 h après la lévodopa), surveiller l\u2019efficacité motrice.',
  },
  {
    id: 'metoclopramide-neuroleptiques',
    left: ['METOCLOPRAMIDE', 'DOMPERIDONE'],
    right: ['HALOPERIDOL', 'RISPERIDONE', 'OLANZAPINE', 'CHLORPROMAZINE', 'PROCHLORPERAZINE'],
    severity: 'MODEREE',
    mechanism: 'Addition du blocage dopaminergique central : risque de syndrome extrapyramidal et de syndrome malin des neuroleptiques.',
    management: 'Limiter la durée du métoclopramide (≤ 5 jours), doses minimales, surtout chez le sujet âgé. Arrêt aux premiers signes extrapyramidaux.',
  },
]

/* ------------------------------------------------------------------ */
/* Moteur de correspondance                                            */
/* ------------------------------------------------------------------ */

export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Détecte les règles applicables sur une liste de médicaments.
 * Chaque médicament est identifié par sa marque (`name` ou `input`) et sa DCI
 * (l'une des deux peut manquer) ; la correspondance se fait sur les jetons
 * DCI/marque normalisés.
 */
export function matchInteractions(
  drugs: { name?: string; input?: string; dci?: string | null }[]
): LocalRule[] {
  const keysPerDrug = drugs.map((d) => {
    const label = d.name ?? d.input ?? ''
    const keys = new Set<string>()
    if (d.dci) {
      const k = normalizeKey(d.dci)
      if (k) keys.add(k)
      // les DCI composées (« X + Y ») sont éclatées
      for (const part of k.split(/(?: \+ | ET )/)) {
        const p = part.trim()
        if (p.length >= 3) keys.add(p)
      }
    }
    const n = normalizeKey(label)
    if (n) keys.add(n)
    return Array.from(keys)
  })

  const allKeys = new Set(keysPerDrug.flat())

  return LOCAL_RULES.filter((rule) => {
    const leftHit = rule.left.some((t) => tokenMatch(allKeys, t))
    const rightHit = rule.right.some((t) => tokenMatch(allKeys, t))
    // les deux membres doivent être touchés par des médicaments distincts
    if (!leftHit || !rightHit) return false
    for (let i = 0; i < drugs.length; i++) {
      const di = keysPerDrug[i]
      const leftSelf = rule.left.some((t) => tokenMatch(new Set(di), t))
      const rightSelf = rule.right.some((t) => tokenMatch(new Set(di), t))
      if (leftSelf && rightSelf) {
        // un seul produit couvre les deux membres (ex : association fixe) → non pertinent
        continue
      }
      for (let j = i + 1; j < drugs.length; j++) {
        const dj = keysPerDrug[j]
        const pairLeft = rule.left.some((t) => tokenMatch(new Set(di), t))
        const pairRight = rule.right.some((t) => tokenMatch(new Set(dj), t))
        const pairLeftR = rule.right.some((t) => tokenMatch(new Set(di), t))
        const pairRightL = rule.left.some((t) => tokenMatch(new Set(dj), t))
        if ((pairLeft && pairRight) || (pairLeftR && pairRightL)) return true
      }
    }
    return false
  })
}

function tokenMatch(keys: Set<string>, token: string): boolean {
  if (keys.has(token)) return true
  const t = ` ${token} `
  for (const k of keys) {
    if (k === token) return true
    if ((` ${k} `).includes(t) && token.length >= 4) return true
    if ((` ${token} `).includes(` ${k} `) && k.length >= 4) return true
  }
  return false
}

export const SEVERITY_WEIGHT: Record<LocalSeverity, number> = {
  'CONTRE-INDIQUE': 4,
  MAJEURE: 3,
  MODEREE: 2,
  MINEURE: 1,
}

export function globalRiskFromPairs(
  pairs: { severity: LocalSeverity }[]
): 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE' {
  if (pairs.length === 0) return 'FAIBLE'
  const max = Math.max(...pairs.map((p) => SEVERITY_WEIGHT[p.severity]))
  if (max >= 4) return 'CRITIQUE'
  if (max === 3) return 'ELEVE'
  if (max === 2) return 'MODERE'
  return 'FAIBLE'
}

/** Associe une règle aux paires de produits concernés (marques lisibles). */
export function pairsFromRule(
  rule: LocalRule,
  drugs: { name?: string; input?: string; dci?: string | null }[]
): [string, string][] {
  const result: [string, string][] = []
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const ki = new Set(
        [drugs[i].dci, drugs[i].name ?? drugs[i].input]
          .filter(Boolean)
          .map((s) => normalizeKey(s as string))
      )
      const kj = new Set(
        [drugs[j].dci, drugs[j].name ?? drugs[j].input]
          .filter(Boolean)
          .map((s) => normalizeKey(s as string))
      )
      const iL = rule.left.some((t) => tokenMatch(ki, t))
      const iR = rule.right.some((t) => tokenMatch(ki, t))
      const jL = rule.left.some((t) => tokenMatch(kj, t))
      const jR = rule.right.some((t) => tokenMatch(kj, t))
      if ((iL && jR) || (iR && jL)) {
        const label = (d: { name?: string; input?: string; dci?: string | null }) =>
          d.name ?? d.input ?? d.dci ?? '—'
        result.push([label(drugs[i]), label(drugs[j])])
      }
    }
  }
  return result
}
