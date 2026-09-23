/**
 * Glossaire pharmaceutique DzPharm — données statiques (visée pédagogique).
 * Terminologie française usuelle + spécificités réglementaires algériennes.
 */

export interface GlossaryTerm {
  term: string
  definition: string
  category: string
  seeAlso?: string[]
}

export const GLOSSARY_CATEGORIES = [
  'Forms & galénique',
  'Voies d’administration',
  'Pharmacocinétique',
  'Interactions',
  'Statuts réglementaires',
  'Dispensation & ordonnance',
  'Pharmacovigilance & sécurité',
  'Économie du médicament',
] as const

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  /* ---------------- Forms & galénique ---------------- */
  {
    term: 'Forme galénique',
    definition:
      'Forme sous laquelle un médicament est présenté : comprimé, gélule, sirop, injectable, pommade… La forme galénique conditionne la voie d’administration, la vitesse d’absorption et la stabilité du principe actif.',
    category: 'Forms & galénique',
    seeAlso: ['Principe actif', 'Comprimé', 'Voie orale'],
  },
  {
    term: 'Principe actif',
    definition:
      'Substance chimique ou biologique responsable de l’effet thérapeutique du médicament. Un produit peut contenir un ou plusieurs principes actifs (association fixe). C’est la DCI qui désigne le principe actif, par opposition au nom de marque.',
    category: 'Forms & galénique',
    seeAlso: ['DCI', 'Association fixe', 'Excipient'],
  },
  {
    term: 'Excipient',
    definition:
      'Substance inactive ajoutée au principe actif pour lui donner sa forme (liants, colorants, arômes, conservateurs…). Les excipients sont en principe inertes, mais certains peuvent provoquer des réactions chez des patients sensibles.',
    category: 'Forms & galénique',
    seeAlso: ['Excipient à effet notoire', 'Principe actif'],
  },
  {
    term: 'Excipient à effet notoire',
    definition:
      'Excipient dont la présence doit être signalée car il peut entraîner une réaction chez certains patients : aspartam, lactose, gluten, huile d’arachide, colorants azoïques, sulfites, benzoates… Leur mention est obligatoire sur l’emballage.',
    category: 'Forms & galénique',
    seeAlso: ['Aspartam / phénylcéturie', 'Sans gluten / sans lactose'],
  },
  {
    term: 'Aspartam / phénylcéturie',
    definition:
      'L’aspartam (édulcorant) libère de la phénylalanine lors de sa digestion. Il est contre-indiqué chez les patients atteints de phénylcéturie, maladie héréditaire où la phénylalanine s’accumule et devient toxique pour le cerveau. Mention obligatoire sur l’étui.',
    category: 'Forms & galénique',
    seeAlso: ['Excipient à effet notoire'],
  },
  {
    term: 'Sans gluten / sans lactose',
    definition:
      'Mention indiquant l’absence de gluten ou de lactose, utile pour les patients intolérants ou allergiques. À l’officine, vérifier la composition complète en cas de maladie cœliaque ou de déficit en lactase : la mention n’apparaît que si l’excipient est réellement absent.',
    category: 'Forms & galénique',
    seeAlso: ['Excipient à effet notoire', 'Intolérance médicamenteuse'],
  },
  {
    term: 'Comprimé',
    definition:
      'Forme solide obtenue par compression de poudres, la plus répandue à l’officine. Variantes : comprimé pelliculé (enrobé), effervescent, orodispersible, à croquer. Ne doit jamais être écrasé sans vérification : certains enrobagés ont un rôle de protection ou de masquage du goût.',
    category: 'Forms & galénique',
    seeAlso: ['Comprimé sécable', 'Forme à libération prolongée (LP)', 'Gélule'],
  },
  {
    term: 'Comprimé sécable',
    definition:
      'Comprimé comportant un sillon (barre de cassure) permettant de le diviser en deux demi-doses. Le sillon garantit que chaque moitié contient une demi-dose à peu près égale. Un comprimé non sécable ne doit pas être coupé : la répartition du principe actif n’est pas garantie.',
    category: 'Forms & galénique',
    seeAlso: ['Comprimé', 'Posologie'],
  },
  {
    term: 'Gélule',
    definition:
      'Enveloppe dure ou molle (gélatine) contenant le principe actif en poudre, granulés ou liquide. Ne doit pas être ouverte ni croquée sauf avis contraire : certaines gélules contiennent des microgranules à libération prolongée.',
    category: 'Forms & galénique',
    seeAlso: ['Forme à libération prolongée (LP)', 'Comprimé'],
  },
  {
    term: 'Forme à libération prolongée (LP)',
    definition:
      'Forme galénique conçue pour libérer le principe actif progressivement sur plusieurs heures, permettant de réduire le nombre de prises par jour et de lisser les concentrations sanguines. Abrégée LP, SR ou Retard. Ne jamais écraser, croquer ou broyer : cela libérerait toute la dose d’un coup (risque de surdosage).',
    category: 'Forms & galénique',
    seeAlso: ['Comprimé', 'État d’équilibre', 'Demi-vie d’élimination'],
  },
  {
    term: 'Forme orodispersible',
    definition:
      'Comprimé qui se désintègre rapidement dans la bouche au contact de la salive, sans eau. Pratique pour les patients qui ont du mal à avaler (personnes âgées, enfants), mais souvent plus sensible à l’humidité : conserver dans son blister jusqu’à l’emploi.',
    category: 'Forms & galénique',
    seeAlso: ['Comprimé'],
  },
  {
    term: 'Solution buvable / sirop',
    definition:
      'Forme liquide destinée à la voie orale, très utilisée en pédiatrie. La dose se mesure en cuillère-mesure, pipette ou gobelet gradué — jamais avec une cuillère à café de cuisine. Vérifier le dosage en mg par ml avant tout conseil et agiter si la mention l’indique.',
    category: 'Forms & galénique',
    seeAlso: ['Posologie', 'Voie orale'],
  },
  {
    term: 'Suppositoire',
    definition:
      'Forme solide introduite par voie rectale, où elle fond à la température du corps. Utile en cas de nausées, vomissements ou troubles de la déglutition. Conserver à l’abri de la chaleur ; à humecter éventuellement avec un peu d’eau avant l’insertion.',
    category: 'Forms & galénique',
    seeAlso: ['Voie rectale'],
  },
  {
    term: 'Dispositif inhalateur',
    definition:
      'Appareil délivrant le médicament directement dans les poumons : aérosol-doseur (spray), chambre d’inhalation, inhalateur de poudre (DPI) ou nébuliseur. La technique d’inhalation conditionne l’efficacité : rincer la bouche après un corticoïde inhalé pour éviter la candidose buccale.',
    category: 'Forms & galénique',
    seeAlso: ['Voie inhalée'],
  },
  {
    term: 'Patch transdermique',
    definition:
      'Patch adhésif qui diffuse le principe actif à travers la peau sur plusieurs heures ou jours (ex. douleur, sevrage tabagique, angine de poitrine). Coller sur une peau saine, propre, sèche et sans poils ; alterner les zones ; jamais de source de chaleur dessus (diffusion accélérée).',
    category: 'Forms & galénique',
    seeAlso: ['Voie transdermique'],
  },
  {
    term: 'Dosage',
    definition:
      'Quantité de principe actif contenue dans une unité de prise : milligrammes par comprimé, mg par ml de sirop, microgrammes par bouffée d’inhalateur. Deux spécialités de même DCI peuvent avoir des dosages très différents — toujours vérifier le dosage prescrit lors de la dispensation.',
    category: 'Forms & galénique',
    seeAlso: ['Posologie', 'Principe actif'],
  },
  {
    term: 'Association fixe',
    definition:
      'Médicament combinant deux ou plusieurs principes actifs à doses fixes dans une même unité de prise (ex. amoxicilline + acide clavulanique). Pratique pour l’observance mais moins flexible : impossible d’ajuster chaque composant séparément.',
    category: 'Forms & galénique',
    seeAlso: ['Principe actif', 'Générique'],
  },
  {
    term: 'Conditionnement primaire',
    definition:
      'Élément en contact direct avec le médicament : blister, flacon, tube, ampoule. Il protège le principe actif de la lumière, de l’humidité et de l’air. Conserver les comprimés dans leur blister d’origine — jamais de transvasement dans une boîte non adaptée.',
    category: 'Forms & galénique',
    seeAlso: ['Conditions de conservation', 'Chaîne du froid'],
  },

  /* ---------------- Voies d'administration ---------------- */
  {
    term: 'Voie orale',
    definition:
      'Voie la plus courante : le médicament est avalé (comprimé, gélule, sirop). Pratique et sûre, mais soumise à l’effet de premier passage hépatique et à un délai d’action plus long que les voies injectables. Certains médicaments irritants ou dégradés par l’estomac nécessitent une autre voie.',
    category: 'Voies d’administration',
    seeAlso: ['Effet de premier passage hépatique', 'Biodisponibilité'],
  },
  {
    term: 'Voie sublinguale',
    definition:
      'Le médicament est placé sous la langue où il se dissout et passe directement dans la circulation, court-circuitant le tube digestif et le foie. Action très rapide (ex. trinitrine lors d’une crise d’angine de poitrine). Ne pas avaler, ne pas mâcher.',
    category: 'Voies d’administration',
    seeAlso: ['Effet de premier passage hépatique', 'Voie orale'],
  },
  {
    term: 'Voie rectale',
    definition:
      'Administration par le rectum (suppositoire, lavement). La absorption partielle contourne le foie : utile si vomissements, impossibilité d’avaler ou patient inconscient. Action souvent plus rapide que la voie orale pour certains médicaments.',
    category: 'Voies d’administration',
    seeAlso: ['Suppositoire'],
  },
  {
    term: 'Voie vaginale',
    definition:
      'Administration locale dans le vagin : ovules, crèmes ou comprimés vaginaux (antimycosiques, traitements hormonaux locaux). Privilégier l’application le soir au coucher pour un temps de contact prolongé ; lire la notice concernant les rapports sexuels pendant le traitement.',
    category: 'Voies d’administration',
  },
  {
    term: 'Voie transdermique',
    definition:
      'Absorption du principe actif à travers la peau intacte jusqu’à la circulation sanguine, de façon lente et régulière. Évite l’effet de premier passage et permet des traitements continus de plusieurs jours (patch). La peau doit être saine et sans lésion.',
    category: 'Voies d’administration',
    seeAlso: ['Patch transdermique', 'Biodisponibilité'],
  },
  {
    term: 'Voie inhalée',
    definition:
      'Le médicament est inhalé dans les voies respiratoires : bronchodilatateurs et corticoïdes de l’asthme. Avantage majeur : action directe sur les poumons avec de très faibles doses, donc peu d’effets généraux. L’efficacité dépend étroitement de la technique d’inhalation.',
    category: 'Voies d’administration',
    seeAlso: ['Dispositif inhalateur'],
  },
  {
    term: 'Voie sous-cutanée (SC)',
    definition:
      'Injection juste sous la peau (bras, abdomen, cuisse), réservée aux médicaments bien absorbés par ce route : insulines, anticoagulants comme l’énoxaparine, certains vaccins. Résorption lente et régulière. Faire un pli cutané et alterner les points d’injection.',
    category: 'Voies d’administration',
  },
  {
    term: 'Voie intramusculaire (IM)',
    definition:
      'Injection profonde dans un muscle (deltoïde, fessier). Résorption plus rapide que la voie sous-cutanée ; volume injectable plus important. Certaines formes retard (ex. neuroleptiques, contraceptifs injectables) libèrent le produit sur plusieurs semaines.',
    category: 'Voies d’administration',
  },
  {
    term: 'Voie intraveineuse (IV)',
    definition:
      'Injection directement dans une veine : biodisponibilité de 100 %, effet immédiat. Réservée à l’hôpital ou aux situations d’urgence. Exige une asepsie stricte et une compatibilité vérifiée des produits mélangés à la perfusion.',
    category: 'Voies d’administration',
    seeAlso: ['Biodisponibilité'],
  },

  /* ---------------- Pharmacocinétique ---------------- */
  {
    term: 'Pharmacocinétique (ADME)',
    definition:
      'Étude du devenir du médicament dans l’organisme, résumée par ADME : Absorption (entrée dans le sang), Distribution (vers les organes), Métabolisme (transformation surtout hépatique) et Élimination (reins, bile). Elle explique la fréquence des prises et l’adaptation des doses.',
    category: 'Pharmacocinétique',
    seeAlso: ['Biodisponibilité', 'Demi-vie d’élimination', 'Cytochrome P450'],
  },
  {
    term: 'Biodisponibilité',
    definition:
      'Fraction de la dose administrée qui atteint la circulation sanguine sous forme active, et la vitesse avec laquelle elle y parvient. Elle est de 100 % par voie intraveineuse ; par voie orale elle varie selon la galénique, l’alimentation et le premier passage hépatique.',
    category: 'Pharmacocinétique',
    seeAlso: ['Effet de premier passage hépatique', 'Voie intraveineuse (IV)'],
  },
  {
    term: 'Demi-vie d’élimination',
    definition:
      'Temps nécessaire pour que la concentration du médicament dans le sang diminue de moitié. Une demi-vie courte impose des prises rapprochées (ex. 3 fois par jour) ; une demi-vie longue permet une seule prise quotidienne. Après environ 5 demi-vies, le médicament est quasi éliminé.',
    category: 'Pharmacocinétique',
    seeAlso: ['État d’équilibre', 'Posologie'],
  },
  {
    term: 'Effet de premier passage hépatique',
    definition:
      'Phénomène par lequel une partie du médicament avalé est détruite par le foie avant même d’atteindre la circulation générale. C’est pourquoi la dose orale est souvent plus forte que la dose injectable du même produit. La voie sublinguale et les patchs y échappent.',
    category: 'Pharmacocinétique',
    seeAlso: ['Biodisponibilité', 'Voie sublinguale', 'Cytochrome P450'],
  },
  {
    term: 'Cmax (concentration maximale)',
    definition:
      'Concentration plasmatique maximale atteinte après une prise ; elle marque l’intensité maximale de l’effet et souvent la zone des effets indésirables. Le temps pour l’atteindre (Tmax) correspond au délai d’action ressenti. Cmax trop haute = risque toxique.',
    category: 'Pharmacocinétique',
    seeAlso: ['Marge thérapeutique', 'État d’équilibre'],
  },
  {
    term: 'État d’équilibre',
    definition:
      'Plateau atteint après environ 5 demi-vies de prises régulières : la quantité éliminée entre deux prises égale la quantité absorbée. C’est à l’équilibre que le traitement est jugé efficace ou toxique. Une dose oubliée déstabilise temporairement cet équilibre.',
    category: 'Pharmacocinétique',
    seeAlso: ['Demi-vie d’élimination', 'Observance / adhésion au traitement'],
  },
  {
    term: 'Clairance de la créatinine',
    definition:
      'Indicateur de la fonction rénale, estimé à partir de la créatininémie, de l’âge, du poids et du sexe. De nombreux médicaments (antibiotiques, antidiabétiques, anticoagulants) doivent être réduits ou espacés quand la clairance baisse, faute de quoi le produit s’accumule.',
    category: 'Pharmacocinétique',
    seeAlso: ['Posologie', 'Surdosage'],
  },
  {
    term: 'Cytochrome P450',
    definition:
      'Famille d’enzymes hépatiques qui transforment la majorité des médicaments avant leur élimination. Certains médicaments accélèrent (inducteurs) ou ralentissent (inhibiteurs) ces enzymes, modifiant la concentration — et donc l’efficacité ou la toxicité — des autres traitements pris simultanément.',
    category: 'Pharmacocinétique',
    seeAlso: ['Inducteur enzymatique', 'Inhibiteur enzymatique', 'Interaction pharmacocinétique'],
  },
  {
    term: 'Inducteur enzymatique',
    definition:
      'Substance qui augmente la production des enzymes hépatiques (ex. rifampicine, certains antiépileptiques). Les autres médicaments métabolisés par ces enzymes sont dégradés plus vite : leur efficacité peut chuter, parfois jusqu’au échappement thérapeutique (ex. contraceptifs oraux + rifampicine).',
    category: 'Pharmacocinétique',
    seeAlso: ['Cytochrome P450', 'Inhibiteur enzymatique', 'Interaction pharmacocinétique'],
  },
  {
    term: 'Inhibiteur enzymatique',
    definition:
      'Substance qui ralentit l’activité des enzymes de dégradation (ex. clarithromycine, kétoconazole, jus de pamplemousse). Les médicaments associés s’accumulent : risque d’exagération des effets et de toxicité, parfois grave (ex. statines + certains antifongiques).',
    category: 'Pharmacocinétique',
    seeAlso: ['Cytochrome P450', 'Inducteur enzymatique', 'Interaction pharmacocinétique'],
  },
  {
    term: 'Marge thérapeutique',
    definition:
      'Écart entre la dose efficace minimale et la dose toxique. Les médicaments à marge étroite (digoxine, lithium, warfarine, certains antiépileptiques) exigent un dosage très précis, une observance rigoureuse et parfois un suivi sanguin régulier.',
    category: 'Pharmacocinétique',
    seeAlso: ['Surdosage', 'Titration', 'Cmax (concentration maximale)'],
  },

  /* ---------------- Interactions ---------------- */
  {
    term: 'Interaction médicamenteuse',
    definition:
      'Modification de l’effet d’un médicament par un autre produit (médicament, aliment, plante, alcool). Elle peut affaiblir le traitement (perte d’efficacité) ou l’exacerber (toxicité). Les patients polymédiqués et les personnes âgées y sont particulièrement exposés.',
    category: 'Interactions',
    seeAlso: ['Interaction pharmacocinétique', 'Interaction pharmacodynamique'],
  },
  {
    term: 'Interaction pharmacocinétique',
    definition:
      'Interaction portant sur le devenir du médicament : un produit modifie l’absorption, le métabolisme ou l’élimination de l’autre (ex. inhibiteur enzymatique qui fait grimper la concentration). La dose arrive modifiée au lieu d’action, sans changer son mode d’action propre.',
    category: 'Interactions',
    seeAlso: ['Interaction médicamenteuse', 'Cytochrome P450'],
  },
  {
    term: 'Interaction pharmacodynamique',
    definition:
      'Interaction portant sur l’effet lui-même : deux médicaments agissent sur le même mécanisme ou sur des mécanismes opposés. Exemple classique : deux sédatifs qui additionnent leur somnolence, ou AINS + anticoagulant qui additionnent le risque hémorragique.',
    category: 'Interactions',
    seeAlso: ['Interaction médicamenteuse'],
  },
  {
    term: 'Contre-indication',
    definition:
      'Situation dans laquelle un médicament ne doit PAS être utilisé : allergie connue à la molécule, grossesse, maladie sous-jacente, autre traitement incompatible. On distingue les contre-indications absolues (jamais) et relatives (seulement si bénéfice majeur, sous surveillance).',
    category: 'Interactions',
    seeAlso: ['Association déconseillée', 'Allergie médicamenteuse'],
  },
  {
    term: 'Association déconseillée',
    definition:
      'Niveau d’alerte du RCP : la combinaison de deux médicaments est à éviter sauf exception justifiée, car le risque deffet indésirable grave est documenté. Moins sévère que la contre-indication absolue, mais exige une vigilance renforcée et souvent une alternative.',
    category: 'Interactions',
    seeAlso: ['Contre-indication', 'Interaction médicamenteuse'],
  },

  /* ---------------- Statuts réglementaires ---------------- */
  {
    term: 'DCI (dénomination commune internationale)',
    definition:
      'Nom universel du principe actif, identique dans tous les pays (ex. paracétamol, amoxicilline, metformine). À l’opposé du nom de marque choisi par le laboratoire. En Algérie, la nomenclature nationale référence chaque produit par sa DCI et son nom de marque.',
    category: 'Statuts réglementaires',
    seeAlso: ['Princeps', 'Générique', 'Principe actif'],
  },
  {
    term: 'Princeps',
    definition:
      'Première spécialité mise sur le marché pour une DCI donnée, par le laboratoire qui l’a développée, et sur laquelle les génériques s’appuient. Son nom de marque sert souvent de référence d’usage (ex. « le princeps » face aux copies).',
    category: 'Statuts réglementaires',
    seeAlso: ['Générique', 'DCI', 'Brevet / domaine public'],
  },
  {
    term: 'Brevet / domaine public',
    definition:
      'Un principe actif est protégé par brevet pendant des années (monopole du princeps) ; à l’expiration, il entre dans le domaine public et d’autres laboratoires peuvent produire des génériques, ce qui fait baisser les prix.',
    category: 'Statuts réglementaires',
    seeAlso: ['Princeps', 'Générique'],
  },
  {
    term: 'Générique',
    definition:
      'Médicament copie d’un princeps, contenant la même DCI, le même dosage, la même forme et la même biodisponibilité (équivalence démontrée). Commercialisé après expiration du brevet, sous son nom de DCI ou une marque. Son développement coûte moins cher : il est vendu moins cher.',
    category: 'Statuts réglementaires',
    seeAlso: ['Princeps', 'Générique substituable', 'Groupe générique', 'Biosimilaire'],
  },
  {
    term: 'Biosimilaire',
    definition:
      'Version « générique » d’un médicament biologique (anticorps, insulines, hormones). La copie n’est pas identique au produit vivant d’origine mais hautement similaire, avec équivalence clinique démontrée. Les biomédicaments ne peuvent pas être copiés exactement comme les molécules chimiques.',
    category: 'Statuts réglementaires',
    seeAlso: ['Générique', 'Princeps'],
  },
  {
    term: 'AMM (autorisation de mise sur le marché)',
    definition:
      'Autorisation officielle délivrée par l’autorité compétente (ANPP en Algérie) après évaluation de la qualité, de l’efficacité et de la sécurité du produit. Aucun médicament ne peut être commercialisé sans AMM ; elle est identifiée par un numéro d’enregistrement.',
    category: 'Statuts réglementaires',
    seeAlso: ['RCP (résumé des caractéristiques du produit)', 'Nomenclature nationale'],
  },
  {
    term: 'RCP (résumé des caractéristiques du produit)',
    definition:
      'Document officiel de référence du médicament, approuvé lors de l’AMM : indications, posologies, contre-indications, mises en garde, interactions, effets indésirables, grossesse et allaitement. C’est la source qui fait foi pour tout professionnel — la notice patient en est la version simplifiée.',
    category: 'Statuts réglementaires',
    seeAlso: ['AMM (autorisation de mise sur le marché)', 'Posologie', 'Contre-indication'],
  },
  {
    term: 'Nomenclature nationale',
    definition:
      'En Algérie, liste officielle des produits pharmaceutiques enregistrés, publiée par le Ministère de l’Industrie Pharmaceutique. Elle précise pour chaque produit : numéro d’enregistrement, DCI, marque, forme, dosage, laboratoire et statut (actif, non renouvelé, retiré).',
    category: 'Statuts réglementaires',
    seeAlso: ['AMM (autorisation de mise sur le marché)', 'Retrait de marché / non-renouvellement'],
  },
  {
    term: 'Numéro d’enregistrement',
    definition:
      'Identifiant officiel figurant sur chaque emballage, attribué par l’autorité de régulation lors de l’AMM. Il permet de tracer le produit (laboratoire, pays, date d’autorisation) et figure dans la nomenclature nationale. En Algérie il commence souvent par un préfixe « 001 » suivi du numéro.',
    category: 'Statuts réglementaires',
    seeAlso: ['AMM (autorisation de mise sur le marché)', 'Nomenclature nationale'],
  },
  {
    term: 'Retrait de marché / non-renouvellement',
    definition:
      'Fin de commercialisation d’un produit : soit volontaire (motif commercial du détenteur), soit décidée par l’autorité (sécurité, non-conformité). Le produit n’est plus dispensable. Le statut « non renouvelé » signifie que le détenteur n’a pas renouvelé son enregistrement à échéance.',
    category: 'Statuts réglementaires',
    seeAlso: ['Nomenclature nationale', 'AMM (autorisation de mise sur le marché)'],
  },
  {
    term: 'Produit hospitalier (P1 HOP)',
    definition:
      'Produit réservé à l’usage hospitalier dans la nomenclature algérienne (mention P1 HOP) : il n’est pas disponible en officine de ville et fait l’objet d’une dispensation encadrée par les structures hospitalières.',
    category: 'Statuts réglementaires',
    seeAlso: ['Nomenclature nationale', 'Dispensation'],
  },

  /* ---------------- Dispensation & ordonnance ---------------- */
  {
    term: 'Ordonnance',
    definition:
      'Document rédigé et signé par un médecin (ou professionnel autorisé) précisant le(s) médicament(s), le dosage, la posologie et la durée. Seule une ordonnance valide autorise la dispensation des produits soumis à prescription. Vérifier la date, la signature et la lisibilité des doses.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance sécurisée', 'Renouvellement', 'Dispensation'],
  },
  {
    term: 'Ordonnance sécurisée',
    definition:
      'Ordonnance à format réglementé (papier sécurisé, mentions obligatoires, numérotation) exigée pour certaines prescriptions : stupéfiants, psychotropes, et en pratique pour les demandes de prise en charge ou l’assurance. Elle limite les falsifications et les abus.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Stupéfiant', 'Tableau (psychotropes)', 'Ordonnance'],
  },
  {
    term: 'Liste I / Liste II (toxiques)',
    definition:
      'En Algérie, classement des substances vénéneuses : les produits de Liste I (très toxiques) ne sont délivrés que sur ordonnance et avec des restrictions de durée ; ceux de Liste II (moins toxiques) restent soumis à prescription mais avec des règles de dispensation allégées. La mention figure sur l’étui.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance', 'Tableau (psychotropes)', 'Stupéfiant'],
  },
  {
    term: 'Tableau (psychotropes)',
    definition:
      'Classement international des psychotropes en tableaux (A, B, C…) selon leur potentiel d’abus et leur intérêt thérapeutique, transposé dans la réglementation algérienne. Les psychotropes figurent sur des ordonnances sécurisées avec des modalités de prescription et de conservation (registre, cahier) très encadrées.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance sécurisée', 'Pharmacodépendance', 'Liste I / Liste II (toxiques)'],
  },
  {
    term: 'Stupéfiant',
    definition:
      'Substance classée comme telle (opioïdes forts, certaines amphétamines, cocaïne…) dont la prescription et la dispensation obéissent à des règles strictes : ordonnance sécurisée, durée limitée, conservation en coffre, registre d’entrées/sorties, traçabilité complète des quantités.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance sécurisée', 'Pharmacodépendance'],
  },
  {
    term: 'Dispensation',
    definition:
      'Acte pharmaceutique de délivrance d’un médicament : analyse de l’ordonnance (dose, durée, interactions, contre-indications), substitution éventuelle, conseil au patient et traçabilité. La dispensation engage la responsabilité du pharmacien — c’est bien plus qu’une simple vente.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance', 'Conseil pharmaceutique', 'Générique substituable'],
  },
  {
    term: 'Renouvellement',
    definition:
      'Délivrance répétée d’un traitement sans nouvelle consultation. Selon la mention portée sur l’ordonnance, le renouvellement peut être libre, limité en nombre ou interdit. Attention aux traitements sensibles (psychotropes, stupéfiants) et à la péremption de l’ordonnance.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Ordonnance', 'Observance / adhésion au traitement'],
  },
  {
    term: 'Posologie',
    definition:
      'Dose de médicament à prendre par prise, la fréquence des prises et la durée totale du traitement. Elle dépend du poids (enfant), de la fonction rénale ou hépatique, de l’indication. Une posologie non respectée expose à l’échec du traitement ou à la toxicité.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Dosage', 'Titration', 'Clairance de la créatinine'],
  },
  {
    term: 'Titration',
    definition:
      'Augmentation progressive d’une dose, par paliers, jusqu’à la dose efficace et tolérée (ex. insuline, certains antidépresseurs, traitements cardiaques). Elle réduit le risque d’effets indésirables au démarrage. Chaque palier se stabilise avant d’augmenter à nouveau.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Posologie', 'Marge thérapeutique'],
  },
  {
    term: 'Conseil pharmaceutique',
    definition:
      'Conseil délivré au comptoir par le pharmacien : mode de prise, moments optimaux, effets indésirables à connaître, précautions, signes qui doivent amener à consulter. Il transforme la remise du médicament en véritable accompagnement et joue un rôle clé dans l’observance.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Dispensation', 'Éducation thérapeutique', 'Automédication'],
  },
  {
    term: 'Observance / adhésion au traitement',
    definition:
      'Degré auquel le patient suit la prescription : doses, horaires, durée. La mauvaise observance (oubli, arrêt prématuré « car on se sent mieux ») est une cause majeure d’échec thérapeutique, notamment pour les antibiotiques, les antihypertenseurs et les antidiabétiques.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Éducation thérapeutique', 'Posologie', 'Renouvellement'],
  },
  {
    term: 'Automédication',
    definition:
      'Prise d’un médicament sans prescription médicale, de sa propre initiative. Légitime pour des symptômes bénins et de courte durée avec des produits autorisés, elle devient dangereuse en cas de polypathologie, grossesse, traitement chronique ou symptômes persistants — d’où l’importance du conseil au comptoir.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Conseil pharmaceutique', 'Interaction médicamenteuse'],
  },
  {
    term: 'Éducation thérapeutique',
    definition:
      'Accompagnement structuré du patient pour qu’il comprenne sa maladie et son traitement : objectifs, technique d’injection ou d’inhalation, automesure (glycémie, tension), gestion des situations imprévues. Objectif : autonomie sécurisée et meilleure observance au long cours.',
    category: 'Dispensation & ordonnance',
    seeAlso: ['Observance / adhésion au traitement', 'Conseil pharmaceutique'],
  },

  /* ---------------- Pharmacovigilance & sécurité ---------------- */
  {
    term: 'Effet indésirable',
    definition:
      'Réaction nocive et non voulue survenant aux doses normalement utilisées (nausées, somnolence, éruption…). Tout effet indésirable suspecté doit être signalé — c’est la base de la pharmacovigilance. Ne pas confondre avec l’effet secondaire attendu et réversible.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Pharmacovigilance', 'Allergie médicamenteuse'],
  },
  {
    term: 'Pharmacovigilance',
    definition:
      'Surveillance des effets indésirables des médicaments après leur mise sur le marché : recueil des cas, analyse des signaux, alertes. En Algérie, le Centre National de Pharmacovigilance (relevant du Ministère de la Santé) coordonne ce dispositif ; les professionnels de santé doivent déclarer leurs observations.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Effet indésirable', 'Matériovigilance'],
  },
  {
    term: 'Matériovigilance',
    definition:
      'Surveillance des incidents ou risques d’incident liés aux dispositifs médicaux : seringues, perfuseurs, prothèses, matériel d’inhalation, tests de glycémie. Signaler tout dysfonctionnement ou défaut de matériel au circuit de matériovigilance.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Pharmacovigilance'],
  },
  {
    term: 'Centre anti-poison',
    definition:
      'Service d’urgence spécialisé dans les intoxications aiguës ou chroniques, joignable 24h/24. Il guide la prise en charge : produit ingéré, dose, délai, gestes immédiats, antidote éventuel. En Algérie, le Centre Anti-Poison d’Alger est joignable au 021 71 30 42 ; en urgence vitale, le SAMU est au 14.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Antidote', 'Surdosage'],
  },
  {
    term: 'Antidote',
    definition:
      'Substance capable de neutraliser ou contrer les effets toxiques d’un poison : N-acétylcystéine (paracétamol), naloxone (morphiniques), flumazénil (benzodiazépines), vitamine K (antivitamines K). L’administration d’un antidote se fait en milieu médical, souvent en urgence.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Centre anti-poison', 'Surdosage'],
  },
  {
    term: 'Effet indésirable grave (EIG)',
    definition:
      'Effet indésirable qui entraîne le décès, met en jeu le pronostic vital, provoque une hospitalisation ou une prolongation d’hospitalisation, une incapacité ou une malformation congénitale. Tout EIG doit être signalé immédiatement à la pharmacovigilance par le professionnel qui le constate.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Effet indésirable', 'Pharmacovigilance'],
  },
  {
    term: 'Surdosage',
    definition:
      'Prise d’une dose supérieure à la dose maximale recommandée — volontairement (tentative d’autolyse) ou accidentellement (confusion, double prise, enfant). Risque de toxicité grave selon le produit. Devant tout surdosage : contacter le centre anti-poison ou les urgences immédiatement.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Centre anti-poison', 'Marge thérapeutique', 'Antidote'],
  },
  {
    term: 'Allergie médicamenteuse',
    definition:
      'Réaction immunitaire anormale au médicament (ou à l’un de ses excipients) : urticaire, œdème, choc anaphylactique. Contrairement à l’intolérance, une allergie peut survenir à des doses minimes et se reproduire de façon plus grave à chaque réexposition. Toute allergie doit être documentée dans le dossier patient.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Intolérance médicamenteuse', 'Effet indésirable', 'Excipient à effet notoire'],
  },
  {
    term: 'Intolérance médicamenteuse',
    definition:
      'Réaction désagréable liée à un effet pharmacologique attendu, sans mécanisme immunitaire : troubles digestifs d’un antibiotique par exemple. Elle ne se répercute pas forcément plus gravement lors d’une nouvelle prise — à la différence de l’allergie véritable.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Allergie médicamenteuse', 'Effet indésirable'],
  },
  {
    term: 'Pharmacodépendance',
    definition:
      'Besoin compulsif de consommer une substance, avec tolérance (besoin d’augmenter les doses) et syndrome de sevrage à l’arrêt. Certains médicaments y exposent : opioïdes, benzodiazépines, certains stimulants — d’où leur classement en tableaux et la limitation des durées de prescription.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Stupéfiant', 'Tableau (psychotropes)'],
  },
  {
    term: 'Chaîne du froid',
    definition:
      'Maintien continu entre +2 °C et +8 °C des médicaments thermosensibles : insulines, vaccins, certains collyres, produits biologiques. Toute rupture (transport sans sac isotherme, coupure électrique prolongée, congélation par erreur) peut détruire le principe actif. Un produit resté à température ambiante doit être évalué avant utilisation.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Conditions de conservation', 'DLU (date limite d’utilisation)'],
  },
  {
    term: 'DLU (date limite d’utilisation)',
    definition:
      'Date au-delà de laquelle le médicament ne doit plus être utilisé, imprimée sur l’emballage (mois/année ou jour/mois/année). Après la DLU, la stabilité n’est plus garantie. À l’officine et à domicile : trier régulièrement l’armoire à pharmacie et rapporter les périmés en pharmacie pour destruction.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Conditions de conservation', 'Chaîne du froid'],
  },
  {
    term: 'Conditions de conservation',
    definition:
      'Précautions de stockage indiquées sur l’emballage : température maximale, protection de la lumière, de l’humidité, verticacité des flacons… Éviter la salle de bain (humidité) et le coffre de voiture (chaleur). Les indications « à conserver à une température ne dépassant pas 25/30 °C » doivent être respectées.',
    category: 'Pharmacovigilance & sécurité',
    seeAlso: ['Chaîne du froid', 'DLU (date limite d’utilisation)', 'Conditionnement primaire'],
  },

  /* ---------------- Économie du médicament ---------------- */
  {
    term: 'PPA (prix public algérien)',
    definition:
      'Prix de vente au public d’un médicament en Algérie, fixé par les autorités et publié dans la liste officielle des prix. Il figure sur la boîte. La liste PPA de l’officine (édition Août 2026) référence 1 791 produits avec leur identifiant CNAS. Le PPA s’entend taxes comprises.',
    category: 'Économie du médicament',
    seeAlso: ['Taux de remboursement', 'CNAS', 'Tarif de référence'],
  },
  {
    term: 'Taux de remboursement',
    definition:
      'Part du prix remboursée par l’assurance maladie : généralement 100 % pour les maladies chroniques graves (ALD) et 80 % pour les affections courantes. Le reste est à la charge du patient (ticket modérateur), selon les cas. Le taux est appliqué sur la base du tarif de référence.',
    category: 'Économie du médicament',
    seeAlso: ['CNAS', 'ALD (affection longue durée)', 'Tarif de référence'],
  },
  {
    term: 'CNAS (Caisse nationale des assurances sociales)',
    definition:
      'Organisme algérien qui couvre les assurés sociaux et leurs ayants droit pour les risques maladie, maternité, invalidité. Elle rembourse les médicaments prescrits et figurant sur la liste des produits remboursables, sur présentation de la carte Chifa en pharmacie.',
    category: 'Économie du médicament',
    seeAlso: ['Carte Chifa', 'CASNOS', 'Taux de remboursement'],
  },
  {
    term: 'Carte Chifa',
    definition:
      'Carte électronique de l’assuré social algérien, présentée en pharmacie pour la prise en charge des médicaments. Elle contient l’identifiant CNAS et permet la facturation directe à l’assurance (système de tiers payant) selon le taux applicable.',
    category: 'Économie du médicament',
    seeAlso: ['CNAS', 'Taux de remboursement'],
  },
  {
    term: 'CASNOS',
    definition:
      'Caisse nationale de sécurité sociale des non-salariés : couvre les travailleurs indépendants, artisans, commerçants et professions libérales. Même logique de remboursement des médicaments que la CNAS, avec des droits ouverts par le paiement des cotisations.',
    category: 'Économie du médicament',
    seeAlso: ['CNAS', 'Taux de remboursement'],
  },
  {
    term: 'ALD (affection longue durée)',
    definition:
      'Maladie chronique grave et coûteuse reconnue par la réglementation : diabète, hypertension, asthme sévère, cancers, insuffisance rénale… Le traitement de l’ALD est pris en charge à 100 % sur validation du protocole thérapeutique, ce qui conditionne la délivrance gratuite des médicaments concernés.',
    category: 'Économie du médicament',
    seeAlso: ['Taux de remboursement', 'CNAS'],
  },
  {
    term: 'Tarif de référence',
    definition:
      'Prix de référence d’une DCI (souvent celui du groupe générique ou du moins cher) retenu par l’assurance pour calculer le remboursement. Si le patient choisit une spécialité plus chère (ex. princeps), il paie la différence de sa poche. Ce mécanisme encourage la prescription en DCI.',
    category: 'Économie du médicament',
    seeAlso: ['Groupe générique', 'Taux de remboursement', 'PPA (prix public algérien)'],
  },
  {
    term: 'Faible volume / fort volume',
    definition:
      'Classification de la nomenclature algérienne selon les quantités vendues. Les produits à faible volume (maladies rares, usage hospitalier) bénéficient de conditions économiques particulières ; les fort volume (grande consommation) sont soumis à une régulation plus stricte des prix.',
    category: 'Économie du médicament',
    seeAlso: ['Nomenclature nationale', 'PPA (prix public algérien)'],
  },
  {
    term: 'Générique substituable',
    definition:
      'Générique appartenant au même groupe générique que le princeps prescrit, que le pharmacien peut délivrer à sa place (avec information du patient) lorsque la prescription n’exclut pas la substitution. Intérêt économique : même principe actif, même dosage, prix souvent inférieur.',
    category: 'Économie du médicament',
    seeAlso: ['Générique', 'Groupe générique', 'Dispensation'],
  },
  {
    term: 'Groupe générique',
    definition:
      'Ensemble des spécialités (princeps + génériques) partageant la même DCI, le même dosage et la même forme. La nomenclature algérienne structure les groupes génériques pour organiser la substitution et le tarif de référence.',
    category: 'Économie du médicament',
    seeAlso: ['Générique', 'Équivalence (générique)', 'Tarif de référence'],
  },
  {
    term: 'Équivalence (générique)',
    definition:
      'Démonstration scientifique qu’un générique présente la même biodisponibilité que le princeps (étude de bioéquivalence). À ce titre, le générique est réputé avoir la même efficacité et la même sécurité — la différence avec le princeps porte sur le prix et les excipients.',
    category: 'Économie du médicament',
    seeAlso: ['Générique', 'Biodisponibilité'],
  },
  {
    term: 'Spécialité pharmaceutique',
    definition:
      'Médicament tel qu’il est commercialisé sous un nom de marque, avec un dosage et un conditionnement précis, par un laboratoire déterminé. Une même DCI peut correspondre à de nombreuses spécialités (princeps et génériques) — c’est l’unité concrète dispensée à l’officine.',
    category: 'Économie du médicament',
    seeAlso: ['DCI', 'Princeps', 'Générique'],
  },
]

/** Normalisation sans accents pour recherche insensible. */
export function normalizeFr(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
}
