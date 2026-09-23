/**
 * Couche de normalisation DCI (Dénomination Commune Internationale).
 *
 * OBJECTIF — invariance du verdict par rapport au nom commercial :
 * tout produit (marque) est réduit à ses DCI canoniques AVANT toute
 * recherche d'interaction. Deux marques de la même molécule (PLAVIX,
 * PIDOGREL, CLOPIDOGREL LDM…) produisent donc EXACTEMENT les mêmes
 * jetons de correspondance, donc le même verdict et le même résumé.
 *
 * Gère :
 *  1. Les associations fixes (« CLOPIDOGREL/ACIDE ACÉTYLSALICYLIQUE »,
 *     « IRBESARTAN + HYDROCHLOROTHIAZIDE ») → éclatées en constituants,
 *     chaque DCI est testée individuellement.
 *  2. Les sels et hydrates (« OMEPRAZOLE SODIQUE EXPRIMÉ EN OMÉPRAZOLE »,
 *     « ESOMEPRAZOLE MAGNÉSIUM TRIHYDRATE ») → ramenés à la molécule mère.
 *  3. Les dérivés / énantiomères (dexkétoprofène → kétoprofène,
 *     phénprocoumone → AVK, nitroglycérine → trinitrine…) via alias.
 *  4. Les graphies du registre algérien (« ACIDE ACETYLSALICYTIQUE »…).
 */

/* ------------------------------------------------------------------ */
/* Normalisation de base                                               */
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

/* ------------------------------------------------------------------ */
/* Éclatement des associations                                         */
/* ------------------------------------------------------------------ */

/**
 * Sépare une DCI composée en ses constituants actifs.
 * Séparateurs observés dans le registre algérien : « + », « / », « , »,
 * « ET », « AVEC » (1135 produits avec « / », 26 avec « + », 9 avec « , »).
 * Le découpage se fait sur la chaîne BRUTE (avant normalisation) car
 * normalizeKey remplace « + » et « / » par des espaces.
 */
export function splitConstituents(rawDci: string): string[] {
  return rawDci
    .split(/\+|\/|,|;|\bET\b|\bAVEC\b|\bET\/|\bEXPRI/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => normalizeKey(p))
    .filter((p) => p.length > 0)
}

/* ------------------------------------------------------------------ */
/* Bruit galénique à retirer des constituants                          */
/* ------------------------------------------------------------------ */

/** Sels, hydrates et mentions galéniques — jamais porteurs d'interaction. */
const SALT_NOISE = new Set([
  'SODIQUE', 'SODIUM', 'POTASSIQUE', 'MAGNESIUM', 'CALCIQUE', 'ZINCIQUE',
  'HYDROCHLORIDE', 'CHLORHYDRATE', 'HYDROCHLORURE', 'BROMHYDRATE',
  'BISULFATE', 'HYDROGENOSULFATE', 'HYDROGENE', 'SULFATE', 'BESYLATE',
  'MALEATE', 'FUMARATE', 'HEMIFUMARATE', 'SUCCINATE', 'TARTRATE',
  'MESILATE', 'TOSYLATE', 'ESYLATE', 'ACETATE', 'PROPIONATE', 'VALERATE',
  'CITRATE', 'LACTATE', 'ENANTATE', 'DECANOATE', 'LAURATE', 'PALMITATE',
  'PIVALATE', 'TROMETAMOL', 'TROMETHAMINE', 'CLAVULANIQUE', 'MONOHYDRATE',
  'DIHYDRATE', 'TRIHYDRATE', 'SESQUIHYDRATE', 'HEMIHYDRATE', 'ANHYDRE',
  'BASE', 'MICRONISE', 'MICRONISEE', 'EXPRIME', 'EN', 'SOUS', 'FORME',
  'DE', 'DU', 'D', 'LA', 'LE', 'LES', 'ET', 'EQUIVALENT', 'EQUIVALENTS',
  'SE', 'ACTIVE', 'ACTIF', 'TOTAL', 'COMME', 'POUR', 'PAR', 'UNITES',
])

/** Mots d'un constituant qui portent le sens pharmacologique. */
export function constituentWords(constituent: string): string[] {
  return constituent
    .split(' ')
    .filter((w) => w.length >= 3 && !SALT_NOISE.has(w) && !GENERIC_WORDS.has(w))
}

/**
 * Mots trop génériques pour porter une identité d'interaction.
 * Ils restent présents dans le constituant COMPLET (qui, lui, est un jeton),
 * mais jamais comme mot isolé : « ACIDE » seul ne doit jamais faire matcher
 * « ACIDE MÉFÉNAMIQUE » (faux positif — ex. acide ascorbique ≠ AINS).
 */
const GENERIC_WORDS = new Set([
  'ACIDE', 'VITAMINE', 'VITAMINES', 'COMPLEXE', 'COMPLEXES',
  'OLIGOELEMENT', 'OLIGOELEMENTS', 'SOLUTION', 'EXCIPIENT',
  'ASSOCIES', 'ASSOCIEES', 'AUTRES', 'DIVERS', 'EQUIVALENTS',
])

/** Constituant nettoyé de son bruit galénique (ex. « OMEPRAZOLE SODIQUE EXPRIME EN OMEPRAZOLE » → « OMEPRAZOLE OMEPRAZOLE » → dédupouillé). */
export function cleanConstituent(constituent: string): string {
  const seen = new Set<string>()
  const words: string[] = []
  for (const w of constituent.split(' ')) {
    if (w.length < 2 || SALT_NOISE.has(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    words.push(w)
  }
  return words.join(' ').trim()
}

/* ------------------------------------------------------------------ */
/* Dérivés / apparentés → DCI canonique d'interaction                  */
/* ------------------------------------------------------------------ */

/**
 * Dérivés dont le nom NE CONTIENT PAS le mot de la molécule mère
 * (donc introuvables par correspondance de mots) : on ajoute la
 * molécule de référence comme jeton canonique.
 * [Extensions cliniques — en attente de validation pharmaceutique]
 */
const DCI_DERIVATIVES: Record<string, string> = {
  // Anti-inflammatoires (dérivés énantiomériques / apparentés classe AINS)
  DEXKETOPROFENE: 'KETOPROFENE',
  DEXIBUPROFENE: 'IBUPROFENE',
  // Antivitamines K (dérivés coumariniques)
  PHENPROCOUMON: 'ACENOCOUMAROL',
  // Dérivés nitrés
  NITROGLYCERINE: 'TRINITRINE',
  // IPP (énantiomères)
  DEXLANSOPRAZOLE: 'LANSOPRAZOLE',
  // Xanthines (prodrogue de la théophylline)
  AMINOPHYLLINE: 'THEOPHYLLINE',
  // Salicylés
  CARBASALATE: 'ASPIRINE',
  SALICYLATE: 'ASPIRINE',
  // Benzodiazépines apparentées
  PRAZEPAM: 'DIAZEPAM',
  BROTIZOLAM: 'TRIAZOLAM',
  // Corticoïdes systémiques (désonide = topique, exclu)
  TRIAMCINOLONE: 'PREDNISOLONE',
  // Opioïdes
  PETHIDINE: 'MORPHINE',
  // Éthinylestradiol graphies composées
  MESTRANOL: 'ETHINYLESTRADIOL',
}

/**
 * Jetons canoniques additionnels dérivés d'un constituant :
 *  - mot du constituant présent dans DCI_DERIVATIVES → ajoute la molécule mère ;
 *  - mot FER/FERREUX/FERRIQUE → ajoute FER (jeton court de 3 lettres
 *    sinon non appariable par correspondance de mots) ;
 *  - graphies register « ACIDE ACETYLSALICYLIQUE/TIQUE » → ASPIRINE.
 */
function derivativeTokens(constituent: string): string[] {
  const out = new Set<string>()
  const words = constituent.split(' ')
  for (const w of words) {
    if (DCI_DERIVATIVES[w]) out.add(DCI_DERIVATIVES[w])
    if (w === 'FER' || w === 'FERREUX' || w === 'FERRIQUE' || w === 'FERROSE') out.add('FER')
  }
  // Graphies aspirine du registre officiel
  if (constituent.includes('ACETYLSALICYL')) {
    out.add('ASPIRINE')
    out.add('ACIDE ACETYLSALICYLIQUE')
    out.add('ACIDE ACETYLSALICYTIQUE')
  }
  return Array.from(out)
}

/* ------------------------------------------------------------------ */
/* Identité canonique d'un médicament                                  */
/* ------------------------------------------------------------------ */

export interface CanonicalDrugIdentity {
  /** Libellé saisi par l'utilisateur (affichage uniquement). */
  input: string
  /** DCI brute du registre (affichage). */
  dciRaw: string | null
  /** Constituants normalisés et nettoyés (ex. ['CLOPIDOGREL', 'ACIDE ACETYLSALICYLIQUE']). */
  constituents: string[]
  /**
   * Jetons de correspondance canoniques — UNIQUE source du moteur de règles.
   * Marques et saisies utilisateur volontairement EXCLUES : le verdict ne
   * doit jamais dépendre du nom commercial.
   */
  tokens: Set<string>
}

/** Construit l'identité canonique d'un produit à partir de sa DCI (et repli sur la saisie si DCI absente). */
export function buildCanonicalIdentity(
  input: string,
  dciRaw: string | null | undefined
): CanonicalDrugIdentity {
  const tokens = new Set<string>()
  let constituents: string[] = []

  if (dciRaw && dciRaw.trim().length > 0) {
    constituents = splitConstituents(dciRaw)
      .map((c) => cleanConstituent(c))
      .filter((c) => c.length >= 3)
    // Dé-duplication des constituants identiques
    constituents = Array.from(new Set(constituents))

    for (const c of constituents) {
      tokens.add(c) // constituant complet (« ACIDE ACETYLSALICYLIQUE »)
      for (const w of constituentWords(c)) tokens.add(w) // mots porteurs (« OMEPRAZOLE »)
      for (const d of derivativeTokens(c)) tokens.add(d) // dérivés (« KETOPROFENE » depuis DEXKETOPROFENE)
    }
  }

  // Repli : produit non résolu — la saisie sert de jeton (avec avertissement amont)
  if (tokens.size === 0 && input.trim().length > 0) {
    const n = normalizeKey(input)
    if (n) {
      tokens.add(n)
      for (const w of constituentWords(n)) tokens.add(w)
    }
  }

  return { input, dciRaw: dciRaw ?? null, constituents, tokens }
}

/** Vrai si deux identités partagent au moins un constituant actif identique (détection de doublon de DCI). */
export function sharedConstituents(a: CanonicalDrugIdentity, b: CanonicalDrugIdentity): string[] {
  const setB = new Set(b.constituents)
  return a.constituents.filter((c) => setB.has(c))
}
