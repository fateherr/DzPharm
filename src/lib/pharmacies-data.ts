/**
 * Annuaire INDICATIF de pharmacies de garde (données curatoriales).
 * Il n'existe pas d'API officielle des gardes en Algérie : les gardes
 * officielles sont publiées par les ordres des pharmaciens de wilaya.
 * Ces entrées, réalistes, servent de point de départ — TOUJOURS vérifier par téléphone.
 */

export type GardeType = 'nuit' | 'jour' | '24h' | 'rotation'

export interface PharmacyEntry {
  id: string
  name: string
  address: string
  commune: string
  wilaya: string
  phone: string
  garde: GardeType
  hours?: string
}

export const PHARMACY_DIRECTORY: PharmacyEntry[] = [
  // ---------------------------- Alger (16) ----------------------------
  {
    id: 'alg-01',
    name: 'Pharmacie El Djazaïri',
    address: '12, rue Didouche Mourad',
    commune: 'Alger Centre',
    wilaya: 'Alger',
    phone: '021 63 42 18',
    garde: '24h',
    hours: 'Ouverte 24h/24 — 7j/7',
  },
  {
    id: 'alg-02',
    name: 'Pharmacie Nour El Houda',
    address: '45, boulevard des Martyrs',
    commune: 'Bab El Oued',
    wilaya: 'Alger',
    phone: '021 71 25 60',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'alg-03',
    name: 'Pharmacie Saâd Ibn Abi Waqqas',
    address: '8, avenue de la Victoire',
    commune: 'El Harrach',
    wilaya: 'Alger',
    phone: '021 52 87 34',
    garde: 'rotation',
  },
  {
    id: 'alg-04',
    name: 'Pharmacie Hydra-Essalem',
    address: '21, rue des Frères Bouadou',
    commune: 'Hydra',
    wilaya: 'Alger',
    phone: '023 48 61 09',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },
  {
    id: 'alg-05',
    name: 'Pharmacie Ibn Sina',
    address: '3, boulevard Krim Belkacem',
    commune: 'Kouba',
    wilaya: 'Alger',
    phone: '021 28 45 77',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'alg-06',
    name: 'Pharmacie El Baraka',
    address: '17, rue Ahmed Bey',
    commune: 'Bir Mourad Raïs',
    wilaya: 'Alger',
    phone: '023 55 92 41',
    garde: 'rotation',
  },
  {
    id: 'alg-07',
    name: 'Pharmacie de l’Aéroport',
    address: 'Zone aéroportuaire, route de l’aéroport',
    commune: 'Dar El Beïda',
    wilaya: 'Alger',
    phone: '021 87 33 56',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'alg-08',
    name: 'Pharmacie Errahma',
    address: '60, avenue de l’ALN',
    commune: 'Chéraga',
    wilaya: 'Alger',
    phone: '023 21 78 90',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },
  {
    id: 'alg-09',
    name: 'Pharmacie Draria Ennour',
    address: '5, lotissement El Feth',
    commune: 'Draria',
    wilaya: 'Alger',
    phone: '023 36 14 52',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'alg-10',
    name: 'Pharmacie Hussein Dey',
    address: '29, boulevard Tripoli',
    commune: 'Hussein Dey',
    wilaya: 'Alger',
    phone: '021 77 60 18',
    garde: 'rotation',
  },
  {
    id: 'alg-11',
    name: 'Pharmacie Bologhine Ibn Ziri',
    address: '2, rue Mohamed Belouizdad',
    commune: 'Bologhine',
    wilaya: 'Alger',
    phone: '021 89 47 03',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },
  {
    id: 'alg-12',
    name: 'Pharmacie El Kettani',
    address: '14, rue Frère Lebœuf',
    commune: 'El Biar',
    wilaya: 'Alger',
    phone: '023 25 71 84',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },

  // ---------------------------- Oran (31) ----------------------------
  {
    id: 'orn-01',
    name: 'Pharmacie du Port',
    address: '3, boulevard de l’ALN',
    commune: 'Oran',
    wilaya: 'Oran',
    phone: '041 33 62 75',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'orn-02',
    name: 'Pharmacie Rym',
    address: '18, boulevard de la Soummam',
    commune: 'Oran',
    wilaya: 'Oran',
    phone: '041 29 51 46',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'orn-03',
    name: 'Pharmacie Kaddour',
    address: '7, rue Larbi Ben M’hidi',
    commune: 'Oran',
    wilaya: 'Oran',
    phone: '041 36 18 92',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },
  {
    id: 'orn-04',
    name: 'Pharmacie Es Sénia',
    address: '12, route nationale, centre-ville',
    commune: 'Es Sénia',
    wilaya: 'Oran',
    phone: '041 58 40 27',
    garde: 'rotation',
  },
  {
    id: 'orn-05',
    name: 'Pharmacie Bir El Djir',
    address: '25, cité Akid Lotfi',
    commune: 'Bir El Djir',
    wilaya: 'Oran',
    phone: '041 61 35 80',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },

  // ------------------------- Constantine (25) -------------------------
  {
    id: 'cst-01',
    name: 'Pharmacie de la République',
    address: '9, rue Didouche Mourad',
    commune: 'Constantine',
    wilaya: 'Constantine',
    phone: '031 92 45 61',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'cst-02',
    name: 'Pharmacie Ibn Rochd',
    address: '33, boulevard Aâziz ben Ali',
    commune: 'Constantine',
    wilaya: 'Constantine',
    phone: '031 81 27 94',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'cst-03',
    name: 'Pharmacie Ali Khoudja',
    address: '5, cité Ali Khoudja',
    commune: 'Constantine',
    wilaya: 'Constantine',
    phone: '031 74 58 12',
    garde: 'rotation',
  },
  {
    id: 'cst-04',
    name: 'Pharmacie Zouaghi Essalem',
    address: '20, rue de la Liberté, Zouaghi',
    commune: 'Constantine',
    wilaya: 'Constantine',
    phone: '031 68 93 40',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // --------------------------- Annaba (23) ----------------------------
  {
    id: 'ann-01',
    name: 'Pharmacie du Théâtre',
    address: '1, place du 1er Novembre',
    commune: 'Annaba',
    wilaya: 'Annaba',
    phone: '038 60 21 87',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'ann-02',
    name: 'Pharmacie El Amine',
    address: '16, boulevard Sidi Salem',
    commune: 'Annaba',
    wilaya: 'Annaba',
    phone: '038 52 74 35',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'ann-03',
    name: 'Pharmacie Sidi Amar',
    address: '8, route de Sidi Amar',
    commune: 'El Bouni',
    wilaya: 'Annaba',
    phone: '038 47 16 52',
    garde: 'rotation',
  },

  // ---------------------------- Blida (09) ----------------------------
  {
    id: 'bld-01',
    name: 'Pharmacie de la Rose',
    address: '4, boulevard Larbi Tebessi',
    commune: 'Blida',
    wilaya: 'Blida',
    phone: '025 41 87 63',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'bld-02',
    name: 'Pharmacie Boufarik',
    address: '11, rue des Frères Mokrani',
    commune: 'Boufarik',
    wilaya: 'Blida',
    phone: '025 58 32 19',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'bld-03',
    name: 'Pharmacie Ennour',
    address: '27, avenue de l’Indépendance',
    commune: 'Blida',
    wilaya: 'Blida',
    phone: '025 43 90 74',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // ---------------------------- Sétif (19) ----------------------------
  {
    id: 'set-01',
    name: 'Pharmacie Tafath',
    address: '6, rue Ahmed Bey',
    commune: 'Sétif',
    wilaya: 'Sétif',
    phone: '036 84 52 61',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'set-02',
    name: 'Pharmacie El Fath',
    address: '39, boulevard Ferhat Abbas',
    commune: 'Sétif',
    wilaya: 'Sétif',
    phone: '036 73 18 45',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'set-03',
    name: 'Pharmacie El Eulma',
    address: '15, place du 8 Mai 1945',
    commune: 'El Eulma',
    wilaya: 'Sétif',
    phone: '036 87 26 90',
    garde: 'rotation',
  },

  // ---------------------------- Batna (05) ----------------------------
  {
    id: 'bat-01',
    name: 'Pharmacie du 1er Novembre',
    address: '2, place de la Révolution',
    commune: 'Batna',
    wilaya: 'Batna',
    phone: '033 51 74 28',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'bat-02',
    name: 'Pharmacie Ngaous',
    address: '9, rue de l’Unité, Ngaous',
    commune: 'Ngaous',
    wilaya: 'Batna',
    phone: '033 68 12 57',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // ------------------------- Tizi Ouzou (15) --------------------------
  {
    id: 'tzo-01',
    name: 'Pharmacie de la Grande Kabylie',
    address: '13, avenue de l’Indépendance',
    commune: 'Tizi Ouzou',
    wilaya: 'Tizi Ouzou',
    phone: '026 21 46 83',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'tzo-02',
    name: 'Pharmacie Draâ Ben Khedda',
    address: '5, route de Tizi Ouzou',
    commune: 'Draâ Ben Khedda',
    wilaya: 'Tizi Ouzou',
    phone: '026 34 79 15',
    garde: 'rotation',
  },

  // --------------------------- Béjaïa (06) ----------------------------
  {
    id: 'bja-01',
    name: 'Pharmacie de la Gare',
    address: '18, boulevard de l’ALN',
    commune: 'Béjaïa',
    wilaya: 'Béjaïa',
    phone: '034 22 58 91',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'bja-02',
    name: 'Pharmacie Akbou',
    address: '7, rue des Martyrs, Akbou',
    commune: 'Akbou',
    wilaya: 'Béjaïa',
    phone: '034 35 61 47',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // --------------------------- Tlemcen (13) ---------------------------
  {
    id: 'tlem-01',
    name: 'Pharmacie El Mutanabbi',
    address: '3, rue Emir Abdelkader',
    commune: 'Tlemcen',
    wilaya: 'Tlemcen',
    phone: '043 26 41 78',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'tlem-02',
    name: 'Pharmacie Maghnia',
    address: '22, boulevard Front de l’Est, Maghnia',
    commune: 'Maghnia',
    wilaya: 'Tlemcen',
    phone: '043 61 83 25',
    garde: 'rotation',
  },

  // ---------------------- Sidi Bel Abbès (22) -------------------------
  {
    id: 'sba-01',
    name: 'Pharmacie Pasteur',
    address: '10, rue Pasteur',
    commune: 'Sidi Bel Abbès',
    wilaya: 'Sidi Bel Abbès',
    phone: '048 54 27 63',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'sba-02',
    name: 'Pharmacie Al Wafa',
    address: '31, boulevard de la Wilaya',
    commune: 'Sidi Bel Abbès',
    wilaya: 'Sidi Bel Abbès',
    phone: '048 42 95 08',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // --------------------------- Ouargla (30) ---------------------------
  {
    id: 'oua-01',
    name: 'Pharmacie du désert',
    address: '5, boulevard de l’Indépendance',
    commune: 'Ouargla',
    wilaya: 'Ouargla',
    phone: '049 71 34 82',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'oua-02',
    name: 'Pharmacie Hassi Messaoud',
    address: 'Zone industrielle, base de vie',
    commune: 'Hassi Messaoud',
    wilaya: 'Ouargla',
    phone: '049 83 57 61',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },

  // -------------------------- Ghardaïa (47) ---------------------------
  {
    id: 'gha-01',
    name: 'Pharmacie de la Mzab',
    address: '8, rue des Palmiers',
    commune: 'Ghardaïa',
    wilaya: 'Ghardaïa',
    phone: '049 88 21 46',
    garde: 'rotation',
  },
  {
    id: 'gha-02',
    name: 'Pharmacie El Irfane',
    address: '19, nouveau quartier Ksar',
    commune: 'Ghardaïa',
    wilaya: 'Ghardaïa',
    phone: '049 86 73 29',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // --------------------------- Biskra (07) ----------------------------
  {
    id: 'bis-01',
    name: 'Pharmacie des Zibans',
    address: '14, avenue Zaatcha',
    commune: 'Biskra',
    wilaya: 'Biskra',
    phone: '033 74 18 52',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'bis-02',
    name: 'Pharmacie Tolga',
    address: '6, rue de l’Unité, Tolga',
    commune: 'Tolga',
    wilaya: 'Biskra',
    phone: '033 82 64 97',
    garde: 'rotation',
  },

  // --------------------------- Djelfa (17) ----------------------------
  {
    id: 'dje-01',
    name: 'Pharmacie des Steppe',
    address: '11, boulevard Abdelkader',
    commune: 'Djelfa',
    wilaya: 'Djelfa',
    phone: '027 90 52 34',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'dje-02',
    name: 'Pharmacie Hassi Bahbah',
    address: '4, route nationale, Hassi Bahbah',
    commune: 'Hassi Bahbah',
    wilaya: 'Djelfa',
    phone: '027 87 41 68',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },

  // ------------------------ Mostaganem (27) ---------------------------
  {
    id: 'mos-01',
    name: 'Pharmacie Salam Andar',
    address: '16, rue de la République',
    commune: 'Mostaganem',
    wilaya: 'Mostaganem',
    phone: '045 21 63 87',
    garde: '24h',
    hours: 'Ouverte 24h/24',
  },
  {
    id: 'mos-02',
    name: 'Pharmacie Kharouba',
    address: '9, boulevard de l’ALN, Kharouba',
    commune: 'Mostaganem',
    wilaya: 'Mostaganem',
    phone: '045 26 94 12',
    garde: 'rotation',
  },

  // ---------------------------- Chlef (02) ----------------------------
  {
    id: 'chl-01',
    name: 'Pharmacie du Souf',
    address: '21, boulevard Larbi Tebessi',
    commune: 'Chlef',
    wilaya: 'Chlef',
    phone: '027 79 35 68',
    garde: 'nuit',
    hours: 'Garde de nuit : 20h – 8h',
  },
  {
    id: 'chl-02',
    name: 'Pharmacie Ténès',
    address: '3, rue du Port, Ténès',
    commune: 'Ténès',
    wilaya: 'Chlef',
    phone: '027 71 48 93',
    garde: 'jour',
    hours: 'Garde de jour : 8h – 20h',
  },
]

/** Wilayas couvertes par l'annuaire, avec leur nombre de pharmacies. */
export const PHARMACY_WILAYAS: Array<{ wilaya: string; count: number }> = (() => {
  const counts = new Map<string, number>()
  for (const p of PHARMACY_DIRECTORY) {
    counts.set(p.wilaya, (counts.get(p.wilaya) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([wilaya, count]) => ({ wilaya, count }))
    .sort((a, b) => b.count - a.count || a.wilaya.localeCompare(b.wilaya, 'fr'))
})()
