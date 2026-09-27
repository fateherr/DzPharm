export interface HealthEvent {
  id: string
  title: string
  date: string // 'MM-DD' for annual, or 'MM-DD to MM-DD' for periods
  month: number // 1-12
  dayStart: number
  dayEnd?: number
  category: 'prevention' | 'depistage' | 'vaccination' | 'sensibilisation' | 'securite'
  icon: string // lucide icon name
  description: string // 2-3 sentences in French
  pharmacistRole: string[] // what the pharmacist can do
  relatedDci: string[] // DCI keys that relate (must exist in registry)
  source: string // WHO, Ministère de la Santé, etc.
  algeriaSpecific?: boolean // true if specific to Algeria
}

export const healthEvents: HealthEvent[] = [
  // Janvier
  {
    id: 'janvier-col-uterus',
    title: 'Mois de sensibilisation au cancer du col de l\'utérus',
    date: '01-01 au 01-31',
    month: 1,
    dayStart: 1,
    dayEnd: 31,
    category: 'depistage',
    icon: 'Ribbon',
    description: 'Campagne de sensibilisation à l\'importance du frottis de dépistage et de la vaccination contre le papillomavirus (HPV). Une détection précoce permet de guérir la majorité de ces cancers.',
    pharmacistRole: [
      'Orienter les femmes vers les centres de dépistage',
      'Informer sur le vaccin anti-HPV et sa disponibilité',
      'Casser les tabous liés aux examens gynécologiques de prévention'
    ],
    relatedDci: ['vaccin papillomavirus humain'],
    source: 'OMS / Ministère de la Santé'
  },
  {
    id: 'jan-journee-lèpre',
    title: 'Journée mondiale de la lèpre',
    date: '01-28',
    month: 1,
    dayStart: 28,
    category: 'sensibilisation',
    icon: 'Microscope',
    description: 'La lèpre est encore présente dans certaines régions du monde. Cette journée vise à rappeler que la maladie est curable et à lutter contre la stigmatisation.',
    pharmacistRole: [
      'Sensibiliser à cette maladie tropicale négligée'
    ],
    relatedDci: ['rifampicine', 'dapsone'],
    source: 'OMS'
  },
  // Février
  {
    id: 'fev-cancer',
    title: 'Journée mondiale contre le cancer',
    date: '02-04',
    month: 2,
    dayStart: 4,
    category: 'sensibilisation',
    icon: 'Activity',
    description: 'Initiative mondiale pour unir le monde entier dans la lutte contre l\'épidémie mondiale de cancer. Met l\'accent sur la prévention, le dépistage et l\'accès équitable aux soins.',
    pharmacistRole: [
      'Promouvoir un mode de vie sain (lutte contre tabac, obésité)',
      'Orienter vers les examens de dépistage (sein, côlon, col de l\'utérus)',
      'Accompagner les patients sous traitement antinéoplasique'
    ],
    relatedDci: ['paclitaxel', 'doxorubicine', 'tamoxifène'],
    source: 'UICC / Ministère de la Santé'
  },
  {
    id: 'fev-vaccin-dz',
    title: 'Semaine nationale de vaccination',
    date: '02-24', // Approximatif
    month: 2,
    dayStart: 24,
    dayEnd: 28,
    category: 'vaccination',
    icon: 'Syringe',
    description: 'Campagne nationale en Algérie pour rattraper les retards vaccinaux chez les enfants et rappeler l\'importance du calendrier vaccinal obligatoire.',
    pharmacistRole: [
      'Vérifier le carnet de vaccination des enfants',
      'Rassurer les parents sur l\'innocuité des vaccins',
      'Assurer la chaîne du froid lors de la délivrance des vaccins'
    ],
    relatedDci: ['vaccin dtc', 'vaccin hépatite b'],
    source: 'Ministère de la Santé (Algérie)',
    algeriaSpecific: true
  },
  {
    id: 'fev-maladies-rares',
    title: 'Journée internationale des maladies rares',
    date: '02-28',
    month: 2,
    dayStart: 28,
    category: 'sensibilisation',
    icon: 'Dna',
    description: 'Sensibilisation au grand public et aux décideurs sur les maladies rares et leur impact sur la vie des patients. L\'Algérie compte des milliers de patients atteints de maladies rares (souvent liées à la consanguinité).',
    pharmacistRole: [
      'Soutenir les associations de patients',
      'Faciliter l\'accès aux médicaments orphelins (en lien avec la PCH)'
    ],
    relatedDci: [],
    source: 'EURORDIS'
  },
  // Mars
  {
    id: 'mars-pharmacie-dz',
    title: 'Journée de la pharmacie algérienne',
    date: '03-01',
    month: 3,
    dayStart: 1,
    category: 'sensibilisation',
    icon: 'Cross',
    description: 'Célébration du rôle du pharmacien en Algérie comme acteur de santé publique de proximité, essentiel dans l\'orientation et le suivi des patients.',
    pharmacistRole: [
      'Mettre en avant le rôle de conseil et d\'éducation thérapeutique',
      'Organiser des journées portes ouvertes'
    ],
    relatedDci: [],
    source: 'SNAPO / Ordre des Pharmaciens',
    algeriaSpecific: true
  },
  {
    id: 'mars-rein',
    title: 'Journée mondiale du rein',
    date: '03-14', // 2e jeudi (approx)
    month: 3,
    dayStart: 14,
    category: 'prevention',
    icon: 'Droplets',
    description: 'Campagne pour la santé rénale pour tous. L\'insuffisance rénale est en forte augmentation en Algérie, souvent liée au diabète et à l\'hypertension.',
    pharmacistRole: [
      'Sensibiliser à l\'hydratation et à la réduction de la consommation de sel',
      'Prévenir l\'automédication néphrotoxique (AINS)',
      'Alerter les patients diabétiques et hypertendus'
    ],
    relatedDci: ['ibuprofène', 'diclofénac'],
    source: 'ISN / IFKF'
  },
  {
    id: 'mars-glaucome',
    title: 'Journée mondiale du glaucome',
    date: '03-12',
    month: 3,
    dayStart: 12,
    category: 'depistage',
    icon: 'Eye',
    description: 'Sensibilisation à cette maladie de l\'œil, deuxième cause de cécité dans le monde. Le dépistage de la tension oculaire est crucial après 40 ans.',
    pharmacistRole: [
      'Conseiller une consultation ophtalmologique après 40 ans',
      'Expliquer l\'importance de l\'observance des collyres hypotenseurs',
      'Montrer la bonne technique d\'instillation des collyres'
    ],
    relatedDci: ['timolol', 'latanoprost', 'pilocarpine'],
    source: 'Association Mondiale du Glaucome'
  },
  // Avril
  {
    id: 'avr-sante',
    title: 'Journée mondiale de la santé',
    date: '04-07',
    month: 4,
    dayStart: 7,
    category: 'sensibilisation',
    icon: 'HeartPulse',
    description: 'Célébration de la création de l\'OMS. Chaque année aborde un thème de santé publique majeur (couverture sanitaire universelle, changement climatique...).',
    pharmacistRole: [
      'Relayer le thème de l\'année au comptoir'
    ],
    relatedDci: [],
    source: 'OMS'
  },
  {
    id: 'avr-paludisme',
    title: 'Journée mondiale du paludisme',
    date: '04-25',
    month: 4,
    dayStart: 25,
    category: 'prevention',
    icon: 'Bug',
    description: 'L\'Algérie a été certifiée exempte de paludisme par l\'OMS en 2019, mais la vigilance reste de mise (cas importés, voyages dans les pays endémiques).',
    pharmacistRole: [
      'Conseiller les voyageurs (chimioprophylaxie, moustiquaires)',
      'Orienter les voyageurs présentant une fièvre au retour'
    ],
    relatedDci: ['chloroquine', 'artéméther', 'luméfantrine'],
    source: 'OMS / Ministère de la Santé',
    algeriaSpecific: true
  },
  {
    id: 'avr-vaccination',
    title: 'Semaine mondiale de la vaccination',
    date: '04-24 au 04-30',
    month: 4,
    dayStart: 24,
    dayEnd: 30,
    category: 'vaccination',
    icon: 'ShieldCheck',
    description: 'Promouvoir l\'utilisation des vaccins pour protéger les personnes de tout âge contre la maladie.',
    pharmacistRole: [
      'Combattre la désinformation vaccinale',
      'Rappeler l\'importance de la vaccination pédiatrique'
    ],
    relatedDci: ['vaccin dtc', 'vaccin ror'],
    source: 'OMS'
  },
  // Mai
  {
    id: 'mai-asthme',
    title: 'Journée mondiale de l\'asthme',
    date: '05-07', // 1er mardi (approx)
    month: 5,
    dayStart: 7,
    category: 'sensibilisation',
    icon: 'Wind',
    description: 'Améliorer la prise en charge de l\'asthme. En Algérie, l\'asthme touche une part importante de la population, aggravée par la pollution et les allergènes.',
    pharmacistRole: [
      'Vérifier la bonne utilisation des dispositifs d\'inhalation',
      'Rappeler l\'importance du traitement de fond par rapport au traitement de crise',
      'Sensibiliser aux facteurs déclenchants (tabac, acariens)'
    ],
    relatedDci: ['salbutamol', 'budésonide', 'fluticasone'],
    source: 'GINA'
  },
  {
    id: 'mai-hypertension',
    title: 'Journée mondiale de l\'hypertension artérielle',
    date: '05-17',
    month: 5,
    dayStart: 17,
    category: 'depistage',
    icon: 'Activity',
    description: 'L\'hypertension est un tueur silencieux très prévalent en Algérie (environ 35% des adultes). Objectif : mesurer sa tension artérielle, la contrôler et vivre plus longtemps.',
    pharmacistRole: [
      'Proposer des mesures de tension gratuites au comptoir',
      'Insister sur l\'observance du traitement anti-hypertenseur',
      'Conseiller sur l\'hygiène de vie (régime pauvre en sel, activité physique)'
    ],
    relatedDci: ['amlodipine', 'ramipril', 'losartan', 'bisoprolol'],
    source: 'Ligue Mondiale contre l\'Hypertension'
  },
  {
    id: 'mai-tabac',
    title: 'Journée mondiale sans tabac',
    date: '05-31',
    month: 5,
    dayStart: 31,
    category: 'prevention',
    icon: 'Ban',
    description: 'Sensibilisation aux dangers du tabac. Le tabagisme reste un problème majeur de santé publique en Algérie, notamment chez les hommes et de plus en plus chez les jeunes.',
    pharmacistRole: [
      'Proposer un accompagnement au sevrage tabagique',
      'Expliquer l\'usage des substituts nicotiniques',
      'Alerter sur les dangers de la cigarette électronique et de la chicha'
    ],
    relatedDci: ['nicotine', 'bupropione'],
    source: 'OMS'
  },
  // Juin
  {
    id: 'juin-don-sang',
    title: 'Journée mondiale du donneur de sang',
    date: '06-14',
    month: 6,
    dayStart: 14,
    category: 'sensibilisation',
    icon: 'Droplets',
    description: 'Remercier les donneurs volontaires et sensibiliser au besoin continu de dons de sang pour assurer la qualité, la sécurité et la disponibilité.',
    pharmacistRole: [
      'Encourager le don de sang (orienter vers les centres de transfusion)',
      'Afficher les appels aux dons locaux'
    ],
    relatedDci: [],
    source: 'OMS / Agence Nationale du Sang (Algérie)'
  },
  {
    id: 'juin-vitiligo',
    title: 'Mois de sensibilisation au vitiligo',
    date: '06-01 au 06-30',
    month: 6,
    dayStart: 1,
    dayEnd: 30,
    category: 'sensibilisation',
    icon: 'Sun',
    description: 'Le vitiligo affecte la pigmentation de la peau et peut avoir un fort retentissement psychologique. Juin culmine avec la journée mondiale le 25 juin.',
    pharmacistRole: [
      'Conseiller une haute protection solaire sur les zones dépigmentées',
      'Apporter un soutien psychologique (lutte contre le regard des autres)'
    ],
    relatedDci: ['écran solaire', 'tacrolimus'],
    source: 'VRF'
  },
  // Juillet
  {
    id: 'juil-hepatite',
    title: 'Journée mondiale contre l\'hépatite',
    date: '07-28',
    month: 7,
    dayStart: 28,
    category: 'prevention',
    icon: 'Activity',
    description: 'Intensifier la lutte mondiale contre l\'hépatite virale. En Algérie, les programmes de vaccination ont réduit l\'hépatite B, mais l\'hépatite C nécessite encore un dépistage.',
    pharmacistRole: [
      'Informer sur les modes de transmission',
      'Orienter vers le dépistage (notamment pour l\'hépatite C)',
      'Rappeler l\'importance de la vaccination anti-hépatite B'
    ],
    relatedDci: ['sofosbuvir', 'entécavir', 'vaccin hépatite b'],
    source: 'OMS'
  },
  // Août
  {
    id: 'aout-allaitement',
    title: 'Semaine mondiale de l\'allaitement maternel',
    date: '08-01 au 08-07',
    month: 8,
    dayStart: 1,
    dayEnd: 7,
    category: 'prevention',
    icon: 'Baby',
    description: 'Promouvoir l\'allaitement maternel exclusif pendant les 6 premiers mois de la vie. Bénéfique pour l\'enfant et la mère.',
    pharmacistRole: [
      'Soutenir les mères allaitantes (conseils, tire-lait, crèmes pour crevasses)',
      'Déconseiller le sevrage précoce injustifié',
      'Vérifier la compatibilité des médicaments avec l\'allaitement'
    ],
    relatedDci: ['paracétamol'], // Médicament sûr
    source: 'OMS / UNICEF'
  },
  // Septembre
  {
    id: 'sept-alzheimer',
    title: 'Journée mondiale de la maladie d\'Alzheimer',
    date: '09-21',
    month: 9,
    dayStart: 21,
    category: 'sensibilisation',
    icon: 'Brain',
    description: 'Sensibilisation à la démence et lutte contre la stigmatisation. L\'espérance de vie augmentant en Algérie, ces maladies sont de plus en plus fréquentes.',
    pharmacistRole: [
      'Accompagner les aidants familiaux (souvent épuisés)',
      'Aider à l\'organisation des traitements (piluliers)',
      'Repérer les signes d\'alerte et orienter vers un neurologue'
    ],
    relatedDci: ['donépézil', 'mémantine'],
    source: 'ADI'
  },
  {
    id: 'sept-coeur',
    title: 'Journée mondiale du cœur',
    date: '09-29',
    month: 9,
    dayStart: 29,
    category: 'prevention',
    icon: 'Heart',
    description: 'Les maladies cardiovasculaires sont la première cause de mortalité. Promouvoir les actions pour garder un cœur sain.',
    pharmacistRole: [
      'Encourager la reprise de l\'activité physique',
      'Conseiller sur l\'alimentation (huile d\'olive, réduire le gras/sel)',
      'Rappeler l\'observance stricte des traitements (statines, antiagrégants)'
    ],
    relatedDci: ['atorvastatine', 'acide acétylsalicylique', 'clopidogrel'],
    source: 'Fédération Mondiale du Cœur'
  },
  {
    id: 'sept-contraception',
    title: 'Journée mondiale de la contraception',
    date: '09-26',
    month: 9,
    dayStart: 26,
    category: 'sensibilisation',
    icon: 'Pill',
    description: 'Améliorer la sensibilisation à la contraception et permettre des choix éclairés sur la santé sexuelle et reproductive.',
    pharmacistRole: [
      'Informer sur les différentes méthodes contraceptives disponibles',
      'Conseiller sur la conduite à tenir en cas d\'oubli de pilule',
      'Délivrer la contraception d\'urgence avec conseil et bienveillance'
    ],
    relatedDci: ['lévonorgestrel', 'éthinylestradiol'],
    source: 'Coalition Internationale'
  },
  // Octobre
  {
    id: 'oct-rose',
    title: 'Octobre Rose - Sensibilisation au cancer du sein',
    date: '10-01 au 10-31',
    month: 10,
    dayStart: 1,
    dayEnd: 31,
    category: 'depistage',
    icon: 'Ribbon',
    description: 'Le cancer du sein est le cancer le plus fréquent chez la femme en Algérie. Le dépistage précoce (mammographie) sauve des vies.',
    pharmacistRole: [
      'Décorer la pharmacie en rose et afficher des messages de prévention',
      'Expliquer l\'autopalpation mammaire',
      'Orienter systématiquement les femmes de plus de 40 ans vers la mammographie de dépistage'
    ],
    relatedDci: ['tamoxifène', 'anastrozole', 'trastuzumab'],
    source: 'Ministère de la Santé / Associations (El Amel)'
  },
  {
    id: 'oct-sante-mentale',
    title: 'Journée mondiale de la santé mentale',
    date: '10-10',
    month: 10,
    dayStart: 10,
    category: 'sensibilisation',
    icon: 'Brain',
    description: 'Sensibilisation aux problèmes de santé mentale, souvent tabous dans notre société, et mobilisation des efforts en faveur de la santé mentale.',
    pharmacistRole: [
      'Écouter avec empathie et sans jugement',
      'Dédramatiser la consultation psychiatrique',
      'Assurer le suivi des psychotropes (surveillance du carnet, explications)'
    ],
    relatedDci: ['sertraline', 'fluoxétine', 'diazépam'],
    source: 'OMS'
  },
  {
    id: 'oct-grippe',
    title: 'Campagne de vaccination antigrippale',
    date: '10-15 au 11-30',
    month: 10,
    dayStart: 15,
    dayEnd: 30, // Dépasse sur novembre
    category: 'vaccination',
    icon: 'Syringe',
    description: 'Lancement de la campagne nationale de vaccination contre la grippe saisonnière, vitale pour les personnes âgées, chroniques et les femmes enceintes.',
    pharmacistRole: [
      'Dispenser et parfois administrer le vaccin en officine (selon agrément)',
      'Identifier les patients à risque (Chifa) et les inciter à se vacciner',
      'Gérer les stocks et la chaîne du froid rigoureusement'
    ],
    relatedDci: ['vaccin antigrippal'],
    source: 'Ministère de la Santé / Institut Pasteur d\'Algérie',
    algeriaSpecific: true
  },
  // Novembre
  {
    id: 'nov-diabete',
    title: 'Journée mondiale du diabète',
    date: '11-14',
    month: 11,
    dayStart: 14,
    category: 'depistage',
    icon: 'Activity',
    description: 'Le diabète (surtout de type 2) est une véritable épidémie en Algérie (plus de 15% de prévalence). Cette journée souligne l\'importance du dépistage et de l\'équilibre glycémique.',
    pharmacistRole: [
      'Organiser des dépistages capillaires gratuits à la pharmacie',
      'Éduquer sur l\'utilisation des lecteurs de glycémie (stylos, tigettes)',
      'Vérifier les pieds des patients diabétiques (conseil chaussures/soins)',
      'Rappeler les règles hygiéno-diététiques'
    ],
    relatedDci: ['metformine', 'insuline glargine', 'glimépiride', 'sitagliptine'],
    source: 'FID / Ministère de la Santé',
    algeriaSpecific: true
  },
  {
    id: 'nov-movember',
    title: 'Movember (Santé masculine)',
    date: '11-01 au 11-30',
    month: 11,
    dayStart: 1,
    dayEnd: 30,
    category: 'sensibilisation',
    icon: 'User',
    description: 'Sensibilisation aux maladies masculines : cancer de la prostate, cancer testiculaire, et santé mentale des hommes.',
    pharmacistRole: [
      'Aborder le sujet du cancer de la prostate (PSA) avec les hommes > 50 ans',
      'Briser les tabous autour de la santé mentale masculine'
    ],
    relatedDci: ['dutastéride', 'tamsulosine'],
    source: 'Movember Foundation'
  },
  {
    id: 'nov-bpco',
    title: 'Journée mondiale de la BPCO',
    date: '11-20', // 3e mercredi de novembre (approx)
    month: 11,
    dayStart: 20,
    category: 'prevention',
    icon: 'Wind',
    description: 'Sensibilisation à la Broncho-Pneumopathie Chronique Obstructive, une maladie pulmonaire grave principalement causée par le tabac.',
    pharmacistRole: [
      'Inciter fortement à l\'arrêt du tabac',
      'Orienter les fumeurs de longue date essoufflés vers un pneumologue',
      'Vérifier la bonne technique d\'inhalation des bronchodilatateurs'
    ],
    relatedDci: ['tiotropium', 'salmétérol', 'formotérol'],
    source: 'GOLD'
  },
  {
    id: 'nov-antibio',
    title: 'Semaine mondiale de sensibilisation aux antibiotiques',
    date: '11-18 au 11-24',
    month: 11,
    dayStart: 18,
    dayEnd: 24,
    category: 'securite',
    icon: 'ShieldAlert',
    description: 'Lutte contre l\'antibiorésistance, un fléau mondial et algérien. Objectif : faire comprendre que les antibiotiques ne sont pas automatiques.',
    pharmacistRole: [
      'Refuser la délivrance d\'antibiotiques sans ordonnance médicale',
      'Expliquer au patient qu\'un rhume ou une grippe (virale) ne nécessite pas d\'antibiotique',
      'Insister sur le respect de la durée prescrite (ne pas arrêter prématurément)'
    ],
    relatedDci: ['amoxicilline', 'azithromycine', 'ciprofloxacine'],
    source: 'OMS / Ministère de la Santé'
  },
  // Décembre
  {
    id: 'dec-sida',
    title: 'Journée mondiale de lutte contre le SIDA',
    date: '12-01',
    month: 12,
    dayStart: 1,
    category: 'prevention',
    icon: 'Ribbon', // Rouge
    description: 'Soutien aux personnes vivant avec le VIH et commémoration de ceux qui sont décédés. L\'accent est mis sur la prévention, le dépistage et la non-stigmatisation.',
    pharmacistRole: [
      'Conseiller sur l\'utilisation des préservatifs pour la prévention des IST',
      'Orienter vers les centres de dépistage anonyme et gratuit (CDAG)',
      'Lutter contre la discrimination des patients'
    ],
    relatedDci: ['ténofovir', 'emtricitabine', 'lamivudine'],
    source: 'ONUSIDA'
  },
  {
    id: 'dec-handicap',
    title: 'Journée internationale des personnes handicapées',
    date: '12-03',
    month: 12,
    dayStart: 3,
    category: 'sensibilisation',
    icon: 'Accessibility', // Lucide icon Accessibility / wheelchair
    description: 'Promouvoir les droits et le bien-être des personnes handicapées dans toutes les sphères de la société et du développement.',
    pharmacistRole: [
      'Faciliter l\'accessibilité de l\'officine (rampe, espace)',
      'Proposer du matériel médical adapté (chaises roulantes, déambulateurs)',
      'Aider dans les démarches administratives complexes (Chifa, CNAS)'
    ],
    relatedDci: [],
    source: 'ONU'
  },
  // Période Variable (Ramadan)
  {
    id: 'var-ramadan',
    title: 'Préparation santé Ramadan',
    date: 'Variable',
    month: 3, // Mis en mars pour l'exemple, mais avance de 11 jours chaque année
    dayStart: 1,
    category: 'prevention',
    icon: 'Moon',
    description: 'Avant le mois sacré du Ramadan, il est crucial de réévaluer les traitements des patients chroniques (diabète, HTA) avec leur médecin pour adapter les prises et éviter les complications.',
    pharmacistRole: [
      'Conseiller l\'utilisation du module "Adaptateur Ramadan" de DzPharm',
      'Alerter les patients diabétiques sous insuline des risques d\'hypoglycémie',
      'Rappeler les conditions d\'exemption religieuse (Roukha) pour raisons de santé graves'
    ],
    relatedDci: ['insuline', 'glimépiride', 'lévothyroxine'],
    source: 'Ministère des Affaires Religieuses / Ministère de la Santé',
    algeriaSpecific: true
  }
]
