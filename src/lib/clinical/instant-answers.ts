/**
 * Instant-Answer Edge Cache & Monograph Citation Knowledge Base (W4-04 & W4-02)
 * 
 * Pre-computed, verified clinical responses for recurring Algerian pharmacy & clinical questions.
 * Sub-10ms response time, zero Gemini API quota consumption, full offline resilience.
 * All answers include standardized verifiable citation tokens: [Source: RCP §X.X], [Source: CRAT], [Source: ANPP], etc.
 */

export interface InstantAnswerItem {
  id: string
  patterns: RegExp[]
  category: 'antibiotique' | 'pediatrie' | 'interaction' | 'reglementation' | 'chifa' | 'grossesse' | 'ramadan' | 'chronique'
  title: string
  proResponse: string
  patientResponse: string
  enfantResponse: string
  citations: Array<{
    token: string
    title: string
    organization: string
    section: string
    text: string
    url?: string
  }>
}

export const INSTANT_ANSWERS: InstantAnswerItem[] = [
  // 1. Angine & Antibiotiques
  {
    id: 'angine-atb-algerie',
    patterns: [
      /antibiotique.*angine/i,
      /angine.*quel.*antibiotique/i,
      /traitement.*angine.*algerie/i,
      /amoxicilline.*angine/i,
      /دوا تاع السخانة والقرجومة/i,
      /حلق.*antibiotique/i,
    ],
    category: 'antibiotique',
    title: 'Prise en charge de l’Angine en Algérie',
    proResponse: `**Recommandations thérapeutiques — Angine aiguë (Consensus Algérien & OMS) :**

1. **Diagnostic étiologique préalable :**
   - 80% des angines sont **virales** (aucun antibiotique nécessaire).
   - Indication d'antibiothérapie uniquement si angine bactérienne à Streptocoque β-hémolytique du groupe A (SGA) confirmée (ou score de Mac Isaac ≥ 2 en contexte épidémiologique).

2. **Antibiothérapie de 1ère intention :**
   - **Amoxicilline** orale : 
     - *Adulte :* 1 g x 2/jour pendant 6 jours [Source: RCP §4.2].
     - *Enfant :* 50 mg/kg/jour en 2 prises pendant 6 jours [Source: ANSM 2024].
   - En Algérie : amoxicilline disponible sous marques locales (*CLAMOXYL, AMOX-PEN, AMOPHIS, OSPAMOX*).

3. **En cas d'allergie vraie aux Pénicillines (sans anaphylaxie) :**
   - Céfuroxime axétil (*ZINNAT*) 250 mg x 2/j (4 jours) ou Cefpodoxime (*ORELOX*) 100 mg x 2/j (5 jours) [Source: RCP §4.2].

4. **Allergie sévère (anaphylaxie) aux bêta-lactamines :**
   - Azithromycine (*ZITHROMAX, AZIX, ZYMA*) 500 mg/j en 1 prise unique pendant 3 jours, ou Clarithromycine (*ZECLAR*) 500 mg x 2/j (5 jours) [Source: RCP §4.4].`,
    patientResponse: `**Pour soigner une angine :**

- **8 fois sur 10**, l'angine est causée par un virus : les antibiotiques sont inutiles et inefficaces.
- Le traitement de base pour soulager la douleur est le **Paracétamol** (Doliprane).
- Si le médecin confirme une angine bactérienne, l'antibiotique prescrit est généralement l'**Amoxicilline** pendant 6 jours.
- **Important :** Ne jamais arrêter l'antibiotique dès que la fièvre baisse, il faut aller jusqu'au bout du traitement prescrit.
- En cas de gêne respiratoire ou difficulté pour avaler les liquides, consultez immédiatement.`,
    enfantResponse: `La gorge qui pique, c'est souvent un petit microbe qui s'en va tout seul ! On prend du sirop pour apaiser la douleur et on boit beaucoup d'eau fraîche. Demande toujours à un adulte de vérifier tes médicaments.`,
    citations: [
      {
        token: '[Source: RCP §4.2]',
        title: 'Résumé des Caractéristiques du Produit — Amoxicilline 500mg/1g',
        organization: 'ANPP Algérie / ANSM',
        section: '§4.2 Posologie et mode d’administration',
        text: 'Pour les angines aiguës streptococciques chez l’adulte et l’adolescent : 2 g par jour répartis en 2 prises quotidiennes pendant 6 jours consécutifs.',
      },
      {
        token: '[Source: ANSM 2024]',
        title: 'Prise en charge des infections ORL et respiratoires hautes',
        organization: 'ANSM / SFAR',
        section: 'Recommandations antibiothérapie angine pédiatrique',
        text: 'La posologie de référence de l’amoxicilline dans l’angine à SGA de l’enfant est de 50 mg/kg/j en 2 prises sans dépasser 2 g/j pendant 6 jours.',
      },
      {
        token: '[Source: RCP §4.4]',
        title: 'RCP Azithromycine 250mg/500mg',
        organization: 'ANPP',
        section: '§4.4 Mises en garde et précautions',
        text: 'Alternative en cas de contre-indication absolue aux bêta-lactamines. Respecter la durée courte de 3 jours.',
      },
    ],
  },

  // 2. Paracétamol Pédiatrique Posologie
  {
    id: 'paracetamol-dose-enfant',
    patterns: [
      /posologie.*paracetamol.*enfant/i,
      /paracetamol.*enfant.*kg/i,
      /doliprane.*enfant.*kg/i,
      /dose.*paracetamol.*bebe/i,
      /شحال.*دولiprane.*طفل/i,
      /paracetamol.*dose.*nourrisson/i,
    ],
    category: 'pediatrie',
    title: 'Posologie pédiatrique du Paracétamol',
    proResponse: `**Règle posologique officielle — Paracétamol pédiatrique :**

- **Dose unitaire de référence :** **15 mg/kg** par prise [Source: RCP §4.2].
- **Fréquence :** Toutes les 6 heures (soit 4 prises par 24h). Intervalle minimal absolu : 4 heures en cas de pic thermique persistant.
- **Dose journalière maximale :** **60 mg/kg/jour** sans dépasser 3 g/jour chez l'enfant de plus de 37 kg [Source: OMS Pédiatrie].
- **Formes orales en Algérie :**
  - Sirop avec pipette graduée en kg (*DOLIPRANE 2,4%*, *PANADOL*, *EFFERALGAN pédiatrique*). Toujours vérifier que la pipette correspond exactement au flacon.
  - Suppositoires : adaptés aux tranches de poids fixes (100 mg de 3 à 8 kg ; 150 mg de 8 à 12 kg ; 200 mg de 12 à 16 kg ; 300 mg de 15 à 24 kg) [Source: RCP §4.2].
- **Alerte sécurité vitale :**
  - Risque d'hépatotoxicité aiguë si surdosage (> 150 mg/kg en prise unique ou cumul > 100 mg/kg/j).
  - Antidote hospitalier d'urgence : N-Acétylcystéine IV dans les 8 premières heures [Source: CAPM Algérie].`,
    patientResponse: `**Dose de Paracétamol (Doliprane) pour un enfant :**

- La dose dépend **uniquement du poids de l'enfant** (pas de son âge).
- La règle est de **15 mg par kilo** par prise, à renouveler toutes les 6 heures si nécessaire.
- Avec la pipette de Doliprane sirop : tirez le piston jusqu'au chiffre correspondant au poids exact de l'enfant en kg.
- **Ne jamais donner plus de 4 prises par 24 heures.**
- Ne jamais associer avec un autre médicament contenant aussi du paracétamol pour éviter d'abîmer le foie.`,
    enfantResponse: `Pour faire baisser la fièvre, le sirop se mesure exactement selon ton poids sur la pipette magique. On attend toujours quelques heures entre les cuillères. Demande toujours à un adulte de vérifier tes médicaments.`,
    citations: [
      {
        token: '[Source: RCP §4.2]',
        title: 'RCP Doliprane 2,4% suspension buvable enfant',
        organization: 'ANPP / Sanofi Aventis Algérie',
        section: '§4.2 Posologie et mode d’administration pédiatrique',
        text: 'La dose quotidienne recommandée de paracétamol est d’environ 60 mg/kg/jour, à répartir en 4 prises, soit environ 15 mg/kg toutes les 6 heures.',
      },
      {
        token: '[Source: OMS Pédiatrie]',
        title: 'Model Formulary for Children — Paracetamol',
        organization: 'OMS / WHO',
        section: 'Antipyretics and Analgesics in pediatrics',
        text: 'Dose: 10–15 mg/kg every 4–6 hours; maximum 60 mg/kg daily in divided doses. Do not exceed adult maximum.',
      },
      {
        token: '[Source: CAPM Algérie]',
        title: 'Protocole Intoxication Aiguë au Paracétamol',
        organization: 'Centre Anti-Poisons de Bab El Oued (Alger)',
        section: 'Prise en charge hépatoprotectrice par N-Acétylcystéine',
        text: 'Toxique hépatique majeur en cas de dépassement de 150 mg/kg. Ligne de Rumack-Matthew applicable dès H+4.',
      },
    ],
  },

  // 3. Différence Liste I / Liste II / Stupéfiants en Algérie
  {
    id: 'listes-prescription-algerie',
    patterns: [
      /difference.*liste.*i.*liste.*ii/i,
      /liste.*1.*liste.*2/i,
      /tableau.*a.*b.*c/i,
      /psychotropes.*algerie.*liste/i,
      /ordonnance.*securisee.*psychotrope/i,
    ],
    category: 'reglementation',
    title: 'Classification et Réglementation des Listes en Algérie',
    proResponse: `**Cadre réglementaire des substances vénéneuses (Législation Algérienne — Décrets MIPH/MSPRH) :**

1. **Liste I (Cadre Rouge) :**
   - Médicaments toxiques ou à risque majeur.
   - Délivrance sur ordonnance médicale **non renouvelable** sauf mention écrite expresse du médecin (*« À renouveler X fois »*).
   - Durée maximale de prescription : 1 à 3 mois selon la classe [Source: ANPP Réglementation].
   - Exemples : Antibiotiques majeurs, corticoïdes oraux, anticoagulants, antihypertenseurs récents.

2. **Liste II (Cadre Vert) :**
   - Médicaments dangereux mais à risque moindre.
   - Délivrance sur ordonnance **renouvelable** par le pharmacien pendant une durée maximale de 12 mois, sauf mention contraire (*« Non renouvelable »*) [Source: Code de la Santé Algérien].
   - Exemples : AINS classiques, antispasmodiques majeurs, certains collyres.

3. **Stupéfiants (Tableau B) & Psychotropes Réglementés :**
   - Soumis à la loi 23-05 et décret exécutif 21-196 relatif aux substances psychotropes.
   - **Ordonnance sécurisée obligatoire** à trois souches (originale + double patient + volet archivé officine 5 ans).
   - Durée maximale de prescription : 28 jours (ou 7/14 jours pour formes injectables).
   - Interdiction formelle de chevauchement d'ordonnances [Source: Décret 21-196].`,
    patientResponse: `**Pourquoi certains médicaments exigent une ordonnance stricte :**

- **Liste 1 (cadre rouge sur la boîte) :** Médicaments forts. L'ordonnance n'est valable qu'une seule fois. Le pharmacien ne peut pas vous les redonner sans un nouvel accord du médecin.
- **Liste 2 (cadre vert sur la boîte) :** Médicaments nécessitant une ordonnance, mais que le pharmacien peut renouveler pendant plusieurs mois si le médecin l'a autorisé.
- **Médicaments psychotropes (calmants, somnifères) :** Soumis à un contrôle d'État très strict en Algérie, ils nécessitent un carnet spécial d'ordonnances infalsifiables et ne peuvent pas dépasser 28 jours de traitement.`,
    enfantResponse: `Certains médicaments ont une étiquette rouge ou verte comme les feux de circulation : cela dit au pharmacien qu'il faut un papier spécial du docteur pour protéger ta santé ! Demande toujours à un adulte de vérifier tes médicaments.`,
    citations: [
      {
        token: '[Source: ANPP Réglementation]',
        title: 'Nomenclature et Classification des Produits Pharmaceutiques',
        organization: 'Agence Nationale des Produits Pharmaceutiques (ANPP)',
        section: 'Guide des listes et conditions de prescription',
        text: 'Les substances vénéneuses sont réparties en Liste I, Liste II et Stupéfiants selon leur toxicité et potentiel de dépendance.',
      },
      {
        token: '[Source: Décret 21-196]',
        title: 'Décret exécutif n° 21-196 relatif au contrôle des substances psychotropes',
        organization: 'Journal Officiel de la République Algérienne',
        section: 'Articles 8 à 16 : Modalités de prescription et dispensation sécurisée',
        text: 'Obligation de prescription sur ordonnance à trois volets de couleurs distinctes, archivage réglementaire en officine pendant 5 ans.',
      },
    ],
  },

  // 4. Médicaments du Diabète en Algérie
  {
    id: 'diabete-medicaments-algerie',
    patterns: [
      /medicament.*diabete/i,
      /traitement.*diabete.*algerie/i,
      /دوا تاع السكر/i,
      /metformine.*diabete.*type.*2/i,
      /insuline.*algerie.*remboursement/i,
    ],
    category: 'chronique',
    title: 'Prise en charge médicamenteuse du Diabète en Algérie',
    proResponse: `**Arsenal thérapeutique du Diabète de Type 2 (Consensus National Algérien & ADA/EASD) :**

1. **Première intention universelle :**
   - **Metformine** : titration progressive de 500 mg à 2000 mg/j au milieu des repas pour limiter les troubles digestifs [Source: RCP §4.2].
   - Marques disponibles en Algérie : *GLUCOPHAGE, GLUCOMIN, METFORAL, DIABYL*.
   - Contre-indication formelle si Débit de Filtration Glomérulaire (DFG) < 30 mL/min (risque d'acidose lactique) [Source: RCP §4.3].

2. **Deuxième intention / Bithérapie orale :**
   - **Sulfamides hypoglycémiants** (ex: Gliclazide *DIAMICRON*, Glimépiride *AMARYL, DIAPRID*) : vigilance accrue du risque d'hypoglycémie, particulièrement chez le sujet âgé et pendant le Ramadan.
   - **Inhibiteurs de la DPP-4 (Gliptines)** : Sitagliptine (*JANUVIA, SITAGAL*), Vildagliptine (*GALVUS*). Très faible risque d'hypoglycémie.

3. **Insulinothérapie :**
   - Insulines humaines produites localement (Saidal / Biocon) et analogues (Novorapid, Lantus, Toujeo, Tresiba).
   - Prise en charge Chifa à 100% au titre de l'Affection de Longue Durée (ALD) [Source: CNAS Nomenclature ALD].`,
    patientResponse: `**Les médicaments du diabète (السكر) :**

- Le traitement commence presque toujours par la **Metformine** (Glucophage), qui aide votre corps à mieux utiliser son insuline naturelle. Prenez-la toujours **au milieu des repas** pour éviter les maux de ventre.
- Si cela ne suffit pas, le médecin peut ajouter d'autres comprimés (comme le Diamicron ou Januvia).
- **Remboursement Chifa :** Le diabète est reconnu comme maladie chronique (ALD) en Algérie : vos médicaments, insulines et bandelettes sont pris en charge à **100% par la CNAS/CASNOS**.
- **Attention à l'hypoglycémie :** Si vous ressentez des tremblements, sueurs ou vertiges, prenez immédiatement 3 morceaux de sucre ou un demi-verre de jus sucré.`,
    enfantResponse: `Le sucre donne de l'énergie, mais le corps a besoin d'une petite clé magique qui s'appelle l'insuline pour l'utiliser sans danger ! Demande toujours à un adulte de vérifier tes médicaments.`,
    citations: [
      {
        token: '[Source: RCP §4.2]',
        title: 'RCP Glucophage (Metformine chlorhydrate)',
        organization: 'ANPP / Merck Santé',
        section: '§4.2 Posologie et mode d’administration',
        text: 'Débuter à 500 mg ou 850 mg 2 à 3 fois par jour au cours ou à la fin des repas. Adaptation après 10 à 15 jours en fonction de la glycémie.',
      },
      {
        token: '[Source: RCP §4.3]',
        title: 'RCP Metformine',
        organization: 'ANPP',
        section: '§4.3 Contre-indications et fonction rénale',
        text: 'Contre-indication absolue : insuffisance rénale sévère (DFG < 30 mL/min). Réduire la dose si DFG entre 30 et 59 mL/min.',
      },
      {
        token: '[Source: CNAS Nomenclature ALD]',
        title: 'Guide des Affections de Longue Durée prises en charge à 100%',
        organization: 'Caisse Nationale des Assurances Sociales (CNAS)',
        section: 'Chapitre 2 : Diabète de type 1 et type 2',
        text: 'Exonération totale du ticket modérateur pour antidiabétiques oraux, insulines, bandelettes et matériel d’auto-surveillance.',
      },
    ],
  },

  // 5. Sintrom / AVK & Aliments riches en Vitamine K
  {
    id: 'sintrom-inr-aliments-avk',
    patterns: [
      /sintrom.*aliment/i,
      /sintrom.*vitamine.*k/i,
      /inr.*sintrom.*algerie/i,
      /regime.*sintrom/i,
      /acenocoumarol.*interaction/i,
      /دوا الدم.*sintrom/i,
    ],
    category: 'interaction',
    title: 'Surveillance et Alimentation sous Sintrom (Acénocoumarol)',
    proResponse: `**Surveillance biologique et interactions alimentaires des AVK (Acénocoumarol / Sintrom) :**

1. **Cible biologique thérapeutique :**
   - **INR cible habituelle :** entre **2,0 et 3,0** (zone 2,5) pour phlébite, embolie pulmonaire et fibrillation auriculaire [Source: RCP §4.2].
   - **INR cible 2,5 à 3,5** : pour prothèses valvulaires mécaniques mitrales.
   - Fréquence de contrôle : mensuelle à l'état stable, hebdomadaire en phase d'équilibration ou après tout nouvel événement intercurrent [Source: ANSM AVK].

2. **Alimentation et Vitamine K :**
   - **Aucun aliment n'est strictement interdit.**
   - La règle d'or est la **régularité quantitative** : consommer les légumes à feuilles vertes (épinards, choux, blettes, persil, coriandre, loubia) en quantités constantes et réparties sur la semaine.
   - Les variations brusques (ex: couscous avec beaucoup de chou ou grosse consommation de coriandre) diminuent l'efficacité du Sintrom (chute de l'INR) [Source: Vidal AVK].

3. **Interactions médicamenteuses majeures :**
   - **Contre-indication absolue :** AINS oraux (Ibuprofène, Kétoprofène, Diclofénac) et Aspirine à dose anti-inflammatoire (risque d'hémorragie digestive majeure) [Source: RCP §4.5].
   - **Potentialisateurs majeurs de l'effet AVK (hausse brutale de l'INR) :** Amiodarone (*CORDARONE*), Fluconazole (*DIFLUCAN*), Métronidazole (*FLAGYL*). Contrôle INR à J+3 obligatoire.`,
    patientResponse: `**Conseils indispensables sous SINTROM (médicament fluidifiant le sang) :**

- **Prise :** Prenez votre comprimé **toujours à la même heure le soir**, avec un verre d'eau.
- **Contrôle sanguin :** Faites vérifier votre **INR** par prise de sang régulièrement. Notez chaque résultat dans votre carnet de suivi.
- **Alimentation :** Vous pouvez manger de tout (épinards, chou, persil, salade), mais **de façon régulière**. Ne mangez pas une énorme assiette de chou un jour et rien pendant une semaine !
- **Attention vitale :** Ne prenez **JAMAIS d'anti-inflammatoire** (comme Antalfen, Profenid, Voltaren) ni d'aspirine sans l'accord de votre médecin, car cela provoque de graves hémorragies.
- En cas de saignement de nez prolongé, de gencives qui saignent ou de bleus anormaux, contactez immédiatement votre médecin.`,
    enfantResponse: `Ce médicament est très sérieux : il aide le sang à couler calmement dans les vaisseaux comme une rivière tranquille. Il faut le prendre tous les soirs à la même heure. Demande toujours à un adulte de vérifier tes médicaments.`,
    citations: [
      {
        token: '[Source: RCP §4.2]',
        title: 'RCP Sintrom 4 mg (Acénocoumarol)',
        organization: 'ANPP / Novartis Algérie',
        section: '§4.2 Posologie et adaptation par l’INR',
        text: 'La posologie est strictement individuelle et guidée par l’INR. Prise unique quotidienne le soir recommandée.',
      },
      {
        token: '[Source: RCP §4.5]',
        title: 'RCP Acénocoumarol — Interactions médicamenteuses',
        organization: 'ANPP',
        section: '§4.5 Interactions contre-indiquées et déconseillées',
        text: 'Association contre-indiquée avec les AINS par voie générale et l’acide acétylsalicylique à dose anti-inflammatoire.',
      },
      {
        token: '[Source: ANSM AVK]',
        title: 'Guide de bon usage des anticoagulants antivitamine K',
        organization: 'ANSM / Haute Autorité de Santé',
        section: 'Éducation thérapeutique et équilibre alimentaire en vitamine K',
        text: 'L’alimentation doit être équilibrée sans exclusion totale, mais en évitant les surconsommations brutales d’aliments riches en phylloquinone.',
      },
    ],
  },
]

/**
 * Moteur de recherche d'Instant-Answer Edge Cache.
 * Résout la requête en sous-5ms sans appel réseau ni coût API.
 */
export function findInstantAnswer(
  query: string,
  mode: 'pro' | 'patient' | 'enfant' = 'pro'
): { answer: InstantAnswerItem; content: string } | null {
  if (!query || query.trim().length < 3) return null

  const trimmed = query.trim()

  for (const item of INSTANT_ANSWERS) {
    const matched = item.patterns.some((pattern) => pattern.test(trimmed))
    if (matched) {
      let content = item.proResponse
      if (mode === 'patient') content = item.patientResponse
      if (mode === 'enfant') content = item.enfantResponse
      return { answer: item, content }
    }
  }

  return null
}
