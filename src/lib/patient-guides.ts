/**
 * Guides d'éducation thérapeutique patients — contenu statique, sans IA.
 * Ton accessible (« vous »), phrases courtes, ancrage Algérie (ordonnance,
 * CNAS/Chifa, liste I/II, pharmacien d'officine).
 */

export interface PatientGuide {
  id: string
  title: string
  domain: string
  audience: 'patient'
  sections: { heading: string; body: string[] }[]
  /** DCI clés existant dans la base des monographies (dciKey du registre). */
  relatedDci: string[]
}

export const PATIENT_GUIDES: PatientGuide[] = [
  {
    id: 'antibiotiques',
    title: 'Bien prendre ses antibiotiques',
    domain: 'Antibiotiques',
    audience: 'patient',
    sections: [
      {
        heading: 'Pourquoi votre médecin a prescrit un antibiotique',
        body: [
          'Les antibiotiques agissent uniquement contre les bactéries. Ils ne soignent ni un rhume, ni une grippe, ni la plupart des angines : ces maladies sont virales et guérissent seules.',
          'Prendre un antibiotique « au cas où » ou garder une boîte entamée pour plus tard favorise la résistance : les bactéries apprennent à résister et les traitements deviennent moins efficaces pour tout le monde.',
          'En Algérie, la plupart des antibiotiques sont délivrés uniquement sur ordonnance. Cette règle vous protège : le bon antibiotique dépend de l’infection, de votre âge et de vos autres traitements.',
        ],
      },
      {
        heading: 'Pendant le traitement : les règles d’or',
        body: [
          'Respectez la dose et les horaires indiqués sur l’ordonnance, par exemple « 1 comprimé matin et soir ». Si vous oubliez une prise, prenez-la dès que vous y pensez — mais ne doublez jamais la dose suivante.',
          'Continuez le traitement jusqu’à la fin, même si vous vous sentez mieux au bout de 2 ou 3 jours. Arrêter trop tôt laisse survivre les bactéries les plus résistantes.',
          'Certains antibiotiques se prennent pendant les repas, d’autres loin des repas : suivez la notice ou demandez conseil à votre pharmacien. Évitez l’alcool pendant certains traitements (comme le métronidazole) : il provoque des malaises.',
          'Le yaourt ou le probiotique peut limiter la diarrhée parfois provoquée par les antibiotiques. Signalez toute diarrhée importante ou glairo-sanglante sans attendre.',
        ],
      },
      {
        heading: 'Signes qui doivent vous faire consulter',
        body: [
          'Si après 48 à 72 heures de traitement bien suivi la fièvre persiste ou que votre état s’aggrave, recontactez votre médecin : l’antibiotique n’est peut-être pas adapté.',
          'Éruption cutanée, gonflement du visage ou des lèvres, difficulté à respirer : arrêtez le médicament et rendez-vous immédiatement aux urgences — il peut s’agir d’une allergie.',
          'Notez dans un carnet les antibiotiques auxquels vous avez été allergique et signalez-les à chaque consultation. Cette information doit figurer dans votre dossier.',
        ],
      },
      {
        heading: 'Bon à savoir en Algérie',
        body: [
          'Si vous êtes couvert par la CNAS avec une carte Chifa, votre antibiotique prescrit peut être remboursé selon le taux applicable — présentez votre carte à la pharmacie.',
          'Ne rachetez pas « le même » sans ordonnance : une nouvelle infection peut nécessiter un autre antibiotique, à une autre dose.',
          'Rapportez à votre pharmacien les boîtes non utilisées ou périmées au lieu de les jeter à la poubelle.',
        ],
      },
    ],
    relatedDci: ['AMOXICILLINE', 'AMOXICILLINE ACIDE CLAVULANIQUE', 'AZITHROMYCINE', 'CLARITHROMYCINE'],
  },
  {
    id: 'diabete',
    title: 'Vivre avec son diabète : comprendre ses médicaments',
    domain: 'Diabétologie',
    audience: 'patient',
    sections: [
      {
        heading: 'À quoi servent vos médicaments',
        body: [
          'Le diabète de type 2 signifie que votre sucre sanguin reste trop élevé. La metformine est le médicament de départ le plus courant : il aide votre corps à mieux utiliser l’insuline qu’il produit encore.',
          'D’autres familles existent : certaines font produire plus d’insuline par le pancréas, d’autres freinent l’absorption du sucre ou prolongent l’effet des hormones de la satiété. Votre traitement est choisi selon votre glycémie, vos reins et votre poids.',
          'Si le médecin vous prescrit de l’insuline, cela ne veut pas dire que votre diabète « s’est aggravé à cause de vous » : c’est une étape normale de la maladie pour beaucoup de patients, et le moyen le plus sûr de protéger vos yeux, vos reins et votre cœur.',
        ],
      },
      {
        heading: 'Prendre son traitement tous les jours',
        body: [
          'La régularité compte plus que la perfection : prenez vos comprimés aux mêmes heures, en lien avec les repas comme indiqué (la metformine se prend pendant ou juste après le repas pour éviter les nausées).',
          'Ne jamais arrêter son traitement parce que « la glycémie est redevenue normale » : c’est justement le traitement qui la maintient. Tout arrêt doit être décidé avec votre médecin.',
          'Si vous vomissez ou avez de la diarrhée plus de 24 heures, prévenez votre médecin : certains traitements doivent être temporairement suspendus (risque d’acidose).',
          'En cas de fatigue inhabituelle, soif intense, urines très fréquentes ou perte de poids rapide, contrôlez votre glycémie et consultez : votre traitement est peut-être à réajuster.',
        ],
      },
      {
        heading: 'Hypoglycémie : la reconnaître et réagir',
        body: [
          'L’hypoglycémie se manifeste par tremblements, sueurs, faim soudaine, palpitations, puis maux de tête et confusion. Elle survient surtout avec l’insuline ou certains comprimés comme les sulfamides.',
          'La règle des 15 : prenez 15 g de sucre rapide (3 morceaux de sucre, un demi-verre de soda ou de jus), attendez 15 minutes, recontrôlez, et reprenez du sucre si besoin. Puis mangez une collation avec de l’amidon (pain, biscuits) pour éviter la rechute.',
          'Portez toujours sur vous 3 morceaux de sucre et une carte indiquant que vous êtes diabétique. Prévenez votre entourage de quoi il s’agit.',
        ],
      },
      {
        heading: 'Le suivi qui protège',
        body: [
          'Le diabète est une affection longue durée (ALD) : avec votre protocole validé, vos médicaments et vos bandelettes peuvent être pris en charge à 100 % par la CNAS — demandez votre protocole thérapeutique si vous ne l’avez pas.',
          'Faites contrôler votre hémoglobine glyquée (HbA1c) tous les 3 à 6 mois, vos yeux une fois par an, et vos reins selon le calendrier de votre médecin. Un petit contrôle régulier évite les grandes complications.',
          'Marche quotidienne, alimentation équilibrée et arrêt du tabac multiplient l’effet de vos médicaments. Le médicament accompagne vos efforts, il ne les remplace pas.',
        ],
      },
    ],
    relatedDci: ['METFORMINE', 'GLIBENCLAMIDE GLYBURIDE', 'INSULINE GLARGINE', 'INSULINE ASPARTE', 'SITAGLIPTINE'],
  },
  {
    id: 'douleur-fievre',
    title: 'Traiter sa douleur et sa fièvre efficacement',
    domain: 'Antalgiques',
    audience: 'patient',
    sections: [
      {
        heading: 'Le paracétamol : le réflexe de première intention',
        body: [
          'Pour la plupart des douleurs et des fièvres, le paracétamol suffit et c’est le produit le mieux toléré : il ne dérange ni l’estomac ni la tension.',
          'Ne dépassez jamais 3 grammes par jour (4 g sur avis médical) répartis en prises espacées d’au moins 4 à 6 heures, y compris si vous combinez des produits différents : le paracétamol est présent dans beaucoup de médicaments du rhume.',
          'Attention aux overdoses accidentelles : elles sont graves pour le foie. En cas de doute sur la quantité avalée, contactez immédiatement le centre anti-poison (Alger : 021 71 30 42).',
        ],
      },
      {
        heading: 'Les AINS : efficaces mais pas anodins',
        body: [
          'L’ibuprofène et le diclofénac soulagent douleurs et fièvre avec un effet anti-inflammatoire. Ils sont utiles, mais à la dose la plus faible et la durée la plus courte possible.',
          'Prenez-les toujours pendant un repas, jamais l’estomac vide. Ils peuvent irriter l’estomac, élever la tension et fatiguer les reins — évitez-les sans avis médical si vous avez un ulcère, une insuffisance rénale ou de l’hypertension non contrôlée.',
          'Ne combinez jamais deux anti-inflammatoires ensemble (par exemple ibuprofène + diclofénac) : les effets s’additionnent sans soulager davantage.',
          'Chez l’enfant, la fièvre se traite par le paracétamol en premier ; l’ibuprofène se donne seulement selon le poids et l’âge, sur conseil du médecin ou du pharmacien.',
        ],
      },
      {
        heading: 'Fièvre : quand s’inquiéter',
        body: [
          'La fièvre est une défense naturelle. Ce n’est pas son niveau exact qui compte, mais l’état général : une fièvre à 38,5 °C avec un nourrisson de moins de 3 mois, des convulsions, une raideur de la nuque, des taches violacées sur la peau ou une confusion impose une consultation en urgence.',
          'Hydratez-vous abondamment, aérez, ne surcouvrez pas. La douche tiède est possible mais l’alcool et les bains froids sont à proscrire.',
        ],
      },
      {
        heading: 'Douleur qui dure : parlez-en',
        body: [
          'Une douleur qui persiste plus de quelques jours ou qui revient sans cesse n’est pas « normale » : elle mérite un diagnostic, pas seulement des antalgiques répétés.',
          'Si votre douleur nécessite plusieurs prises par jour pendant plus de 5 jours, ou si vous prenez déjà d’autres médicaments (anticoagulants, antidépresseurs, traitement du cœur), demandez conseil à votre pharmacien avant d’automédiquer.',
          'Notez dans un carnet quand la douleur survient, sa durée, son intensité : ces informations aident beaucoup votre médecin à ajuster le traitement.',
        ],
      },
    ],
    relatedDci: ['PARACETAMOL', 'IBUPROFENE', 'DICLOFENAC', 'NAPROXENE'],
  },
  {
    id: 'asthme',
    title: 'Asthme : bien utiliser sa pompe',
    domain: 'Pneumologie',
    audience: 'patient',
    sections: [
      {
        heading: 'Deux sortes de « pompes », deux rôles différents',
        body: [
          'Le traitement de fond (souvent une pompe brune, orange ou rouge) contient un corticoïde : il calme l’inflammation des bronches jour après jour. Il se prend tous les jours, même quand tout va bien, sinon l’asthme revient.',
          'Le traitement de la crise (pompe bleue, salbutamol) ouvre les bronches en quelques minutes. Il soulage mais ne soigne pas l’inflammation. Si vous en avez besoin plus de 2 fois par semaine (hors effort), dites-le à votre médecin : le fond est sans doute insuffisant.',
          'Ne confondez pas les deux : utiliser uniquement la pompe de crise et oublier le fond, c’est éteindre l’incendie sans couper le courant.',
        ],
      },
      {
        heading: 'La bonne technique d’inhalation',
        body: [
          'Aérosol-doseur : secouez la pompe, videz vos poumons, embout entre les lèvres, appuyez et inspirez lentement et profondément en même temps, retenez votre souffle 5 à 10 secondes. Attendez 30 secondes entre deux bouffées.',
          'Avec une chambre d’inhalation (surtout enfants et personnes âgées) : appuyez sur la pompe dans la chambre, puis respirez calmement 5 à 6 fois dedans.',
          'Après chaque bouffée de votre corticoïde inhalé, rincez la bouche à l’eau et recrachez : cela évite le muguet (petites taches blanches) et l’enrouement.',
          'Demandez à votre pharmacien de vérifier votre technique devant lui, une fois par an au minimum : la moitié des mal inhalés viennent d’un mauvais geste.',
        ],
      },
      {
        heading: 'Vivre avec : prévenir les crises',
        body: [
          'Repérez et évitez vos déclencheurs : fumée de cigarette (y compris passive), poussière, poils d’animaux, pollen, effort par temps froid, certains médicaments (prévenez toujours que vous êtes asthmatique, l’aspirine et certains antalgiques sont mal tolérés par certains patients).',
          'Le réchauffement progressif avant un effort, une écharpe sur le nez par temps froid, et le contrôle régulier de la poussière à la maison réduisent les crises.',
          'Faites-vous vacciner contre la grippe chaque année : une grippe peut déclencher une crise sévère chez un asthmatique.',
        ],
      },
      {
        heading: 'Crise : que faire, quand consulter',
        body: [
          'Crise légère : 2 bouffées de votre pompe de secours, asseyez-vous, respirez calmement. Répétez si besoin au bout de quelques minutes.',
          'Consultez en urgence (SAMU 14) si : la pompe de secours ne fait pas effet, vous ne pouvez plus parler en phrases complètes, les lèvres ou les doigts bleuissent, ou la crise empire malgré 3 prises. N’hésitez jamais à appeler : une crise d’asthme sévère peut mettre la vie en danger en quelques minutes.',
          'Prévoyez toujours une boîte de secours d’avance et vérifiez le compteur de doses : tomber en panne d’inhalateur un soir de crise est un risque inutile.',
        ],
      },
    ],
    relatedDci: ['SALBUTAMOL', 'SALBUTAMOL IPRATROPIUM', 'PREDNISOLONE'],
  },
  {
    id: 'hypertension',
    title: 'Hypertension : traitement au long cours',
    domain: 'Cardiologie',
    audience: 'patient',
    sections: [
      {
        heading: 'Pourquoi traiter une maladie silencieuse',
        body: [
          'L’hypertension ne fait pas mal : c’est précisément le danger. Non traitée, elle abîme silencieusement le cœur, les reins, les yeux et le cerveau, et c’est la première cause d’AVC.',
          'Les médicaments (diurétiques, inhibiteurs de l’enzyme de conversion comme le ramipril, sartans comme le losartan, bêtabloquants comme le bisoprolol, inhibiteurs calciques comme l’amlodipine) n’ont pas le même mécanisme : beaucoup de patients en associent deux ou trois. C’est normal et plus efficace qu’une seule dose forte.',
          'Le but est de tenir une tension inférieure à la valeur fixée par votre médecin, durablement — pas seulement le jour de la consultation.',
        ],
      },
      {
        heading: 'Les effets indésirables fréquents : parler avant d’arrêter',
        body: [
          'Toux sèche avec les IEC ? Elle est fréquente et bénigne mais gênante : dites-le à votre médecin, il peut passer à une autre famille (sartan). N’arrêtez jamais seul.',
          'Cheville gonflée avec l’amlodipine ? Fréquent et sans gravité : surélevez les jambes, signalez-le en consultation.',
          'Sensation de jambes lourdes ou fatigue au début d’un diurétique ou d’un bêtabloquant : souvent transitoire, parlez-en au pharmacien.',
          'Ne jamais arrêter brutalement un bêtabloquant : l’arrêt doit être progressif, sinon la tension et le rythme cardiaque peuvent s’emballer.',
        ],
      },
      {
        heading: 'Mesurer sa tension chez soi',
        body: [
          'Installez-vous 5 minutes au calme, dos droit et appuyé, les deux pieds au sol, bras posé à hauteur du cœur. Pas de café ni de tabac dans l’heure précédente.',
          'Prenez 3 mesures le matin et 3 le soir, à quelques minutes d’intervalle, pendant 3 jours, et notez tout dans un carnet (ou l’application de votre tensiomètre). Montrez-le à votre médecin.',
          'Un tensiomètre à brassard automatique validé (pas de modèle « au poignet » si possible) est un investissement utile ; demandez conseil à votre pharmacien.',
        ],
      },
      {
        heading: 'Le traitement, c’est aussi le quotidien',
        body: [
          'Réduire le sel (attention au pain, aux olives, aux conserves et à la charcuterie), marcher 30 minutes par jour, limiter l’alcool et arrêter le tabac font baisser la tension autant que certains comprimés.',
          'L’hypertension est une affection longue durée (ALD) : votre protocole validé ouvre droit à la prise en charge à 100 % de vos médicaments par la CNAS.',
          'Si vous prenez d’autres produits « naturels » ou de la parapharmacie, signalez-les : certains (réglisse, plantes, anti-inflammatoires) font monter la tension ou perturbent vos traitements.',
        ],
      },
    ],
    relatedDci: ['AMLODIPINE', 'LOSARTAN', 'BISOPROLOL', 'RAMIPRIL'],
  },
  {
    id: 'ipp-rgo',
    title: 'RGO et ulcère : les IPP',
    domain: 'Gastro-entérologie',
    audience: 'patient',
    sections: [
      {
        heading: 'Ce que sont les IPP',
        body: [
          'Les inhibiteurs de la pompe à protons (IPP — oméprazole, ésoméprazole, pantoprazole, lansoprazole) réduisent fortement l’acidité de l’estomac. Ils soulagent le reflux (brûlures remontant derrière le sternum) et permettent la cicatrisation de l’œsophage et de l’estomac.',
          'Ils ne servent à rien contre les ballonnements ou les douleurs sans lien avec l’acidité : ce n’est pas un produit « digestif » général.',
          'Ils ne soulagent pas immédiatement comme un pansement gastrique : leur plein effet s’installe en 2 à 4 jours. La dose du début peut être plus forte, puis diminuée.',
        ],
      },
      {
        heading: 'Bien le prendre : le geste qui change tout',
        body: [
          'Prenez votre IPP le matin à jeun, 15 à 30 minutes avant le petit-déjeuner : c’est le moment où il bloque le plus efficacement les « pompes » activées par le repas.',
          'Avalez la gélule entière, ne la croquez pas. Si vous avez du mal à avaler, certaines formes se dispersent dans un peu d’eau — demandez à votre pharmacien.',
          'En cas de reflux, complétez par des gestes simples : surélevez la tête du lit, évitez les repas copieux et le coucher juste après manger, limitez café, alcool, plats gras et épices, arrêtez le tabac.',
        ],
      },
      {
        heading: 'Durée : ni trop court, ni à vie sans contrôle',
        body: [
          'Pour un simple reflux, la durée habituelle est de 4 à 8 semaines, puis on essaie d’arrêter ou de réduire. Une prise prolongée plusieurs années sans réévaluation n’est pas anodine (risque de carence en fer, vitamine B12 ou magnésium, fragilisation osseuse).',
          'N’arrêtez pas brutalement un IPP pris depuis longtemps : l’acidité rebondit et les brûlures reviennent, souvent plus fortes. Une diminution progressive avec votre médecin est plus confortable.',
          'Si l’ulcère est lié à une bactérie (Helicobacter pylori), l’IPP accompagne une cure courte d’antibiotiques — suivez-la à la lettre et faites vérifier l’éradication après.',
        ],
      },
      {
        heading: 'Signaux d’alerte : consultez sans attendre',
        body: [
          'Difficulté à avaler qui s’installe, perte de poids involontaire, vomissements répétés ou avec du sang, selles noires comme du goudron, anémie : consultez rapidement, ces signes imposent un examen.',
          'Brûlures d’estomac depuis plus de 45 ans pour la première fois, ou douleur qui irradie vers la poitrine, le bras ou la mâchoire : ne concluez pas seul au « reflux » — cela peut être le cœur, appelez le SAMU (14) au moindre doute.',
          'Les anti-inflammatoires (ibuprofène, diclofénac…) attaquent l’estomac : si vous devez en prendre alors que vous avez un ulcère ou un reflux soigné, parlez-en d’abord à votre médecin ou pharmacien.',
        ],
      },
    ],
    relatedDci: ['OMEPRAZOLE', 'ESOMEPRAZOLE', 'PANTOPRAZOLE', 'LANSOPRAZOLE', 'FAMOTIDINE'],
  },
  {
    id: 'allergies',
    title: 'Allergies : antihistaminiques et conduite à tenir',
    domain: 'Dermatologie/ORL',
    audience: 'patient',
    sections: [
      {
        heading: 'Bien comprendre son allergie',
        body: [
          'L’allergie est une réaction exagérée du système immunitaire contre une substance inoffensive (pollen, acariens, poils d’animaux, certains aliments ou médicaments). L’histamine libérée provoque éternuements, démangeaisons, urticaire ou larmoiements.',
          'Les antihistaminiques (cétirizine, loratadine, desloratadine, ébastine, rupatadine…) bloquent cette histamine. Ils soulagent les symptômes mais ne « guérissent » pas l’allergie : l’éviction de l’allergène reste la base.',
          'Les antihistaminiques « de nouvelle génération » (cétirizine, loratadine…) assomment peu ou pas, contrairement aux anciens produits. Un par jour suffit pour la plupart.',
        ],
      },
      {
        heading: 'Bien utiliser son antihistaminique',
        body: [
          'En période de rhinite allergique, commencez le traitement dès les premiers symptômes — idéalement un peu avant la saison des pollens si vous la connaissez — et poursuivez régulièrement plutôt qu’au coup par coup.',
          'Certains sont marqués « non somnolent » mais restent sédatifs chez l’enfant ou l’adulte sensible : ne conduisez pas après la première prise tant que vous ne connaissez pas votre réaction.',
          'Les formes « sans ordonnance » se prennent au respect de la dose selon l’âge : chez le jeune enfant, seules certaines formes sirop sont adaptées — demandez systématiquement au pharmacien.',
          'Si l’urticaire ou les démangeaisons durent plus de 6 semaines, ou reviennent sans cause trouvée, il faut un avis médical.',
        ],
      },
      {
        heading: 'Œdème et choc : les urgences vraies',
        body: [
          'Gonflement rapide des lèvres, de la langue, de la gorge, voix modifiée, difficulté à respirer : c’est une urgence vitale — appelez le SAMU (14) immédiatement. Ne prenez pas seulement un comprimé et n’attendez pas.',
          'Après une réaction forte à un aliment, une piqûre ou un médicament, demandez au médecin de noter précisément le produit en cause, et signalez-le à chaque nouvelle prescription et à votre pharmacien.',
          'Si votre médecin vous a prescrit une trousse d’urgence (adrénaline injectable), portez-la toujours sur vous et entraînez-vous au geste avec votre pharmacien : en crise, on n’a pas le temps de lire la notice.',
        ],
      },
      {
        heading: 'Vivre avec au quotidien',
        body: [
          'Contre les acariens : laver la literie à 60 °C, aérer la chambre, limiter tapis et peluches. Contre les pollens : rincer le nez au sérum physiologique le soir, lunettes de soleil dehors, éviter de dormir fenêtre ouverte en saison.',
          'Attention aux associations : les produits du rhume combinent souvent déjà un antihistaminique — vérifiez la composition pour ne pas doubler les doses.',
          'La parapharmacie ne remplace pas un traitement validé ; certains sprays nasaux « naturels » peuvent irriter la muqueuse sur la durée.',
        ],
      },
    ],
    relatedDci: ['CETIRIZINE', 'LORATADINE', 'DESLORATADINE', 'EBASTINE', 'RUPATADINE'],
  },
  {
    id: 'ains-articulations',
    title: 'Douleurs articulaires et AINS',
    domain: 'Rhumatologie',
    audience: 'patient',
    sections: [
      {
        heading: 'Ce que les AINS peuvent (et ne peuvent pas) faire',
        body: [
          'Les AINS (ibuprofène, diclofénac, kétoprofène, naproxène…) soulagent efficacement les douleurs des arthroses, tendinites et poussées inflammatoires en calmant l’inflammation.',
          'Ils traitent la douleur, pas la maladie : ils n’empêchent pas l’articulation de s’user et ne remplacent pas les traitements de fond prescrits pour les maladies comme la polyarthrite.',
          'La règle : dose la plus faible, durée la plus courte. Chez la personne âgée surtout, un AINS prolongé sans surveillance est dangereux (estomac, reins, cœur, tension).',
        ],
      },
      {
        heading: 'Limiter les risques : les bons réflexes',
        body: [
          'Prenez toujours votre AINS au milieu d’un repas avec un grand verre d’eau, jamais le ventre vide.',
          'Un seul AINS à la fois : vérifiez les produits du rhume et les gels, beaucoup en contiennent aussi. Le paracétamol, lui, peut s’y associr si besoin.',
          'Si vous avez un ulcère, une insuffisance rénale, de l’hypertension, une insuffisance cardiaque ou prenez un anticoagulant, ne prenez pas d’AINS en automédication : demandez conseil à votre pharmacien.',
          'Gels et crèmes AINS : utiles sur une articulation superficielle (poignet, genou), ils passent peu dans le sang — mais ne doublez pas gel + comprimé du même produit.',
        ],
      },
      {
        heading: 'Douleur chronique : au-delà des comprimés',
        body: [
          'L’activité physique adaptée (marche, natation, kinésithérapie) est un vrai traitement de l’arthrose : elle réduit la douleur et entretient la mobilité. Une articulation qu’on ménage trop se raidit.',
          'La perte de quelques kilos soulage nettement les genoux et les hanches. Chaque kilo perdu compte.',
          'Le chaud (douleur mécanique) ou le froid (poussée inflammatoire chaude) appliqué 15 minutes soulagent sans médicament — demandez lequel convient à votre cas.',
        ],
      },
      {
        heading: 'Signaux à ne pas ignorer',
        body: [
          'Gros orteil rouge, chaud et douloureux la nuit : c’est probablement une crise de goutte — un AINS la soulage, mais le traitement de fond et le régime se discutent avec le médecin (la colchicine reste le produit classique).',
          'Douleur articulaire avec fièvre, gonflement important, rougeur étendue ou altération de l’état général : consultez rapidement, une infection doit être écartée.',
          'Selles noires, vomissements avec sang ou douleur d’estomac sous AINS : arrêtez le produit et consultez en urgence (saignement digestif).',
        ],
      },
    ],
    relatedDci: ['IBUPROFENE', 'DICLOFENAC', 'NAPROXENE', 'KETOPROFENE', 'COLCHICINE'],
  },
  {
    id: 'securite-maison',
    title: 'Sécuriser ses médicaments à la maison (enfants, chaîne du froid, péremption)',
    domain: 'Transversal',
    audience: 'patient',
    sections: [
      {
        heading: 'Le bon rangement : hors de portée, hors de vue',
        body: [
          'Installez vos médicaments dans une armoire fermée, haute, hors de portée des enfants — jamais sur une table basse, un plan de travail ou dans un sac à main laissé au sol. Les blisters colorés ressemblent à des bonbons.',
          'Ne retirez jamais un médicament de son emballage : le blister protège de l’humidité et la boîte porte le dosage, la date de péremption et les mentions essentielles.',
          'Refermez bien les bouchons de sécurité et ne les remplacez pas par des bouchons ordinaires « plus faciles » : ce sont eux qui freinent un enfant.',
          'Donnez les médicaments comme un acte sérieux : ne dites jamais que c’est « un bonbon » ou « quelque chose de sucré » — l’enfant cherchera à en reprendre seul.',
        ],
      },
      {
        heading: 'Chaîne du froid : insulines, vaccins et produits fragiles',
        body: [
          'Certains médicaments doivent rester entre +2 °C et +8 °C : insulines non ouvertes, vaccins, certains collyres et produits biologiques. Ils se conservent au réfrigérateur (porte ou bac à légumes frais — jamais au congélateur).',
          'Après ouverture, la plupart des insulines se conservent à température ambiante (moins de 25–30 °C) pendant quelques semaines : lisez la notice, chaque produit a sa règle.',
          'Transport : sac isotherme avec accumulateur de froid pour rentrer de la pharmacie, surtout en été. Une insuline restée plusieurs heures dans une voiture au soleil perd son efficacité — même si elle paraît normale.',
          'En cas de coupure d’électricité prolongée, n’ouvrez pas le réfrigérateur inutilement et demandez conseil à votre pharmacien avant de continuer le traitement.',
        ],
      },
      {
        heading: 'Dates de péremption et ouverture des flacons',
        body: [
          'La date sur la boîte (DLU) est valable pour un produit fermé, conservé correctement. Après ouverture, la durée d’utilisation est souvent plus courte : sirop, collyre, pommade, gouttes nasales se jettent généralement 1 à 3 mois après ouverture — notez la date d’ouverture sur le flacon.',
          'Faites le tri deux fois par an dans votre armoire à pharmacie : rapportez les périmés et les non utilisés à votre pharmacie pour destruction, ne les jetez ni à la poubelle ni aux toilettes.',
          'Un comprimé cassé en deux dont l’autre moitié traîne, un sirop qui a changé de couleur ou qui trouble : ne le prenez plus.',
        ],
      },
      {
        heading: 'Les erreurs les plus fréquentes à éviter',
        body: [
          'Ne transvasez jamais un liquide dans un autre flacon et ne mélangez pas des comprimés de produits différents dans une même boîte.',
          'Ne partagez pas vos médicaments avec un proche « qui a les mêmes symptômes » : dose, allergie, contre-indications diffèrent d’une personne à l’autre.',
          'En cas d’ingestion accidentelle par un enfant : ne le faites pas vomir, gardez la boîte et appelez immédiatement le centre anti-poison (Alger : 021 71 30 42) ou le SAMU (14), même en l’absence de symptômes.',
          'Gardez toujours sous la main le numéro du centre anti-poison et une liste de vos traitements permanents (utile aussi en cas d’urgence pour les secours).',
        ],
      },
    ],
    relatedDci: ['PARACETAMOL', 'INSULINE GLARGINE', 'SALBUTAMOL'],
  },
  {
    id: 'grossesse',
    title: 'Grossesse et médicaments : les réflexes essentiels',
    domain: 'Gynécologie',
    audience: 'patient',
    sections: [
      {
        heading: 'La règle de base : rien sans avis',
        body: [
          'Pendant la grossesse, tout ce que vous absorbez peut atteindre votre bébé. Certains médicaments sans danger hors grossesse deviennent risqués pour l’embryon, surtout durant les 3 premiers mois, période de construction des organes.',
          'Avant de prendre le moindre produit — comprimé, sirop, gélule de parapharmacie, plante ou tisane — demandez l’avis de votre médecin ou de votre pharmacien. Ce réflexe simple protège votre grossesse.',
          'Si vous suivez un traitement permanent (diabète, épilepsie, thyroïde, tension…), ne l’arrêtez jamais seul : l’arrêt brutal est souvent plus dangereux pour le bébé que le médicament lui-même. Consultez dès que la grossesse est connue — ou idéalement avant, si vous planifiez une grossesse.',
        ],
      },
      {
        heading: 'Ce que l’on peut faire, ce qu’il faut éviter',
        body: [
          'Pour la douleur ou la fièvre, le paracétamol reste la référence pendant la grossesse, à la dose efficace la plus faible et la plus courte possible.',
          'Les anti-inflammatoires (ibuprofène, diclofénac…) sont à éviter, surtout à partir du 6e mois : ils peuvent perturber le cœur et les reins du bébé. Le médecin peut exceptionnellement en prescrire en début de grossesse, mais jamais en automédication.',
          'Certains traitements de l’acné, de l’épilepsie ou de l’humeur demandent un suivi spécial : ne modifiez rien de vous-même, parlez-en à votre médecin.',
          'Automédication « naturelle » n’est pas synonyme de sûreté : plusieurs plantes déclenchent des contractions ou touchent le bébé. Validez toujours avec un professionnel.',
        ],
      },
      {
        heading: 'Acide folique et suivi',
        body: [
          'L’acide folique (vitamine B9) est recommandé dès le projet de grossesse et durant le premier trimestre : il réduit nettement le risque de malformations du système nerveux du bébé.',
          'Le fer, la vitamine D ou d’autres compléments ne se prennent pas systématiquement : ils se prescrivent selon vos bilans sanguins.',
          'Respectez vos consultations prénatales et vos échographies : elles permettent d’ajuster vos traitements à chaque étape.',
        ],
      },
      {
        heading: 'Allaitement : attention aussi',
        body: [
          'La plupart des médicaments passent dans le lait, en quantité variable. Le paracétamol et l’ibuprofène restent compatibles avec l’allaitement ; d’autres produits imposent d’attendre quelques heures ou de choisir une alternative.',
          'Signalez toujours que vous allaitez — y compris pour un traitement ponctuel (antibiotique, antidouleur, produit du rhume) — et demandez si vous devez décaler la prise par rapport à la tétée.',
          'Arrêter l’allaitement pour un médicament reste rare : il existe presque toujours une option compatible, à valider avec votre médecin ou pharmacien.',
        ],
      },
    ],
    relatedDci: ['ACIDE FOLIQUE VITAMINE B9 FER', 'PARACETAMOL'],
  },
]

/** Filtrage insensible à la casse et aux accents (titre + domaine). */
export function filterGuides(guides: PatientGuide[], q: string): PatientGuide[] {
  const needle = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (!needle) return guides
  return guides.filter(
    (g) =>
      g.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(needle) ||
      g.domain.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(needle)
  )
}
