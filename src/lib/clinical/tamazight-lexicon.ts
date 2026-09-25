/**
 * Lexique Posologique & Clinique Tamazight (W8-03).
 * Fournit la terminologie médicale amazighe normalisée (Tifinagh & transcription latine)
 * couvrant les parlers kabyle, chaoui, mozabite et touareg pour l'officine algérienne.
 */

export interface LexiconEntry {
  fr: string
  tifinagh: string
  latin: string
  category: 'forme' | 'moment' | 'frequence' | 'precaution'
}

export interface TamazightLine {
  tifinagh: string
  latin: string
  phonetic: string
}

export const TAMAZIGHT_LEXICON: LexiconEntry[] = [
  // Formes galéniques
  { fr: '1 comprimé', tifinagh: '1 ⵜⴰⴽⴰⴱⵙⵓⵍⵜ', latin: '1 tkebsult (tablest)', category: 'forme' },
  { fr: '2 comprimés', tifinagh: '2 ⵜⵉⴽⴰⴱⵙⵓⵍⵉⵏ', latin: '2 tkebsulin', category: 'forme' },
  { fr: '1 gélule', tifinagh: '1 ⵜⴰⴳⵉⵍⵓⵍⵜ', latin: '1 tagilult', category: 'forme' },
  { fr: '1 sachet', tifinagh: '1 ⵜⴰⵛⴽⴰⵔⵜ', latin: '1 tackart', category: 'forme' },
  { fr: '1 cuillère', tifinagh: '1 ⵜⴰⵖⵏⵊⴰⵡⵜ', latin: '1 taɣnjawt', category: 'forme' },
  { fr: 'Gouttes', tifinagh: 'ⵜⵉⵎⵇⵇⵉⵜⵉⵏ', latin: 'Timqqitin', category: 'forme' },
  { fr: 'Pommade / Crème', tifinagh: 'ⵜⴰⴷⵀⵉⵏⵜ', latin: 'Tadhint', category: 'forme' },
  { fr: 'Sirop', tifinagh: 'ⴰⵙⵉⵔⵓ', latin: 'Asiru', category: 'forme' },
  { fr: 'Injectable', tifinagh: 'ⵜⵉⵙⵏⵉⵜ', latin: 'Tisnit (tissegnit)', category: 'forme' },

  // Moments de la journée
  { fr: 'Matin', tifinagh: 'ⵜⴰⴼⴰⵡⵜ / ⵙⴱⴻⵃ', latin: 'Tifawin / Sbeḥ', category: 'moment' },
  { fr: 'Midi', tifinagh: 'ⴰⵣⴰⵍ / ⵎⴻⴷⴷⵉ', latin: 'Azal / Meddi', category: 'moment' },
  { fr: 'Soir', tifinagh: 'ⵜⴰⵎⴻⴷⴷⵉⵜ', latin: 'Tameddit', category: 'moment' },
  { fr: 'Au coucher', tifinagh: 'ⵉⴹ (ⵇⴱⴻⵍ ⵉⴹⴻⵙ)', latin: 'Iḍ (qbel iḍes)', category: 'moment' },
  { fr: 'À jeun', tifinagh: 'ⵖⴻⴼ ⵓⵄⴱⵓⴹ ⵢⴻⵍⵡⴰⵏ', latin: 'Ɣef uɛbuḍ yelwan', category: 'moment' },
  { fr: 'Avant les repas', tifinagh: 'ⵇⴱⴻⵍ ⵓⵜⵛⵉ', latin: 'Qbel učči (lmakla)', category: 'moment' },
  { fr: 'Après les repas', tifinagh: 'ⴷⴻⴼⴼⵉⵔ ⵓⵜⵛⵉ', latin: 'Deffir učči (mor lmakla)', category: 'moment' },
  { fr: 'Pendant le repas', tifinagh: 'ⴷⵉ ⵜⵍⴻⵎⵎⴰⵙⵜ ⵏ ⵓⵜⵛⵉ', latin: 'Di tlemmast n učči', category: 'moment' },

  // Fréquences
  { fr: '1 fois par jour', tifinagh: '1 ⵜⵉⴽⴽⴻⵍⵜ ⴳ ⵡⴰⵙⵙ', latin: '1 tikkelt g wass', category: 'frequence' },
  { fr: '2 fois par jour', tifinagh: '2 ⵜⵉⴽⴽⴰⵍ ⴳ ⵡⴰⵙⵙ', latin: '2 tikkal g wass (yal 12 saɛat)', category: 'frequence' },
  { fr: '3 fois par jour', tifinagh: '3 ⵜⵉⴽⴽⴰⵍ ⴳ ⵡⴰⵙⵙ', latin: '3 tikkal g wass (yal 8 saɛat)', category: 'frequence' },
  { fr: 'En cas de douleur', tifinagh: 'ⵎⵉ ⴰⵔⴰ ⵢⵉⵍⵉ ⵓⵇⵔⴰⵃ', latin: 'Mi ara yili uqraḥ (سطر)', category: 'frequence' },
  { fr: 'En cas de fièvre', tifinagh: 'ⵎⵉ ⴰⵔⴰ ⵜⵉⵍⵉ ⵜⴰⵡⵍⴰ', latin: 'Mi ara tili tawla (سخانة)', category: 'frequence' },

  // Précautions & Alertes
  { fr: 'Ne pas arrêter', tifinagh: 'ⵓⵔ ⵃⴻⴱⴱⴻⵙ ⴰⵔⴰ ⴰⵙⴰⴼⴰⵔ', latin: 'Ur ḥebbes ara asafar mbla rray n ṭbib', category: 'precaution' },
  { fr: 'Garder au frais', tifinagh: 'ⵃⵔⴻⵣ ⴷⵉ ⵜⴻⵙⵎⴻⴹⵜ', latin: 'Ḥrez di tesmeḍt (di frigidaire)', category: 'precaution' },
  { fr: 'Hors de portée', tifinagh: 'ⵃⵔⴻⵣ ⵙ ⵡⵓⴳⴳⵓⴳ ⵖⴻⴼ ⵡⴰⵔⵔⴰⵛ', latin: 'Ḥrez s wuggug ɣef warrac', category: 'precaution' },
  { fr: 'Boire beaucoup d\'eau', tifinagh: 'ⵙⴻⵡ ⴰⵟⴰⵙ ⵏ ⵡⴰⵎⴰⵏ', latin: 'Sew aṭas n waman', category: 'precaution' },
]

/**
 * Traduit automatiquement une ligne de posologie française vers le Tamazight
 * (Tifinagh, transcription latine et guide phonétique oral).
 */
export function translateLineToTamazight(line: {
  original: string
  arabicInstructions?: string
  timing?: string
  precaution?: string
}): TamazightLine {
  const orig = line.original.toLowerCase()

  // Détection de la forme & quantité
  let formTifinagh = '1 ⵜⴰⴽⴰⴱⵙⵓⵍⵜ'
  let formLatin = '1 tkebsult'
  let formPhonetic = 'Yiwet tkebsult'

  if (orig.includes('2 comprimé') || orig.includes('2 cp')) {
    formTifinagh = '2 ⵜⵉⴽⴰⴱⵙⵓⵍⵉⵏ'
    formLatin = '2 tkebsulin'
    formPhonetic = 'Snath tkebsulin'
  } else if (orig.includes('3 comprimé') || orig.includes('3 cp')) {
    formTifinagh = '3 ⵜⵉⴽⴰⴱⵙⵓⵍⵉⵏ'
    formLatin = '3 tkebsulin'
    formPhonetic = 'Krad tkebsulin'
  } else if (orig.includes('gélule')) {
    formTifinagh = '1 ⵜⴰⴳⵉⵍⵓⵍⵜ'
    formLatin = '1 tagilult'
    formPhonetic = 'Yiwet tagilult'
  } else if (orig.includes('sachet')) {
    formTifinagh = '1 ⵜⴰⵛⴽⴰⵔⵜ'
    formLatin = '1 tackart'
    formPhonetic = 'Yiwet tackart'
  } else if (orig.includes('cuillère') || orig.includes('càs') || orig.includes('càc')) {
    formTifinagh = '1 ⵜⴰⵖⵏⵊⴰⵡⵜ'
    formLatin = '1 taɣnjawt'
    formPhonetic = 'Yiwet ta-rehn-jawt'
  }

  // Détection de la fréquence
  let freqTifinagh = '1 ⵜⵉⴽⴽⴻⵍⵜ ⴳ ⵡⴰⵙⵙ'
  let freqLatin = '1 tikkelt g wass'
  let freqPhonetic = 'yiwet tikkelt deg wass'

  if (orig.includes('3 fois') || orig.includes('3x/j') || orig.includes('3/jour')) {
    freqTifinagh = '3 ⵜⵉⴽⴽⴰⵍ ⴳ ⵡⴰⵙⵙ (ⵢⴰⵍ 8 ⵙⴰⵄⴰⵜ)'
    freqLatin = '3 tikkal g wass (yal 8 saɛat)'
    freqPhonetic = 'tlata tikwal deg wass (yal tmenya sa3at)'
  } else if (orig.includes('2 fois') || orig.includes('2x/j') || orig.includes('2/jour')) {
    freqTifinagh = '2 ⵜⵉⴽⴽⴰⵍ ⴳ ⵡⴰⵙⵙ (ⵙⴱⴻⵃ ⴷ ⵜⴰⵎⴻⴷⴷⵉⵜ)'
    freqLatin = '2 tikkal g wass (sbeḥ d tameddit)'
    freqPhonetic = 'snath tikwal deg wass (sbeh d tmeddit)'
  } else if (orig.includes('douleur') || orig.includes('fièvre') || orig.includes('si besoin')) {
    freqTifinagh = 'ⵎⵉ ⴰⵔⴰ ⵢⵉⵍⵉ ⵓⵇⵔⴰⵃ ⵏⴻⵖ ⵜⴰⵡⵍⴰ'
    freqLatin = 'Mi ara yili uqraḥ neɣ tawla (max 3 g wass)'
    freqPhonetic = 'mi ara yili uqrah negh tawla (3 deg wass ma tketer)'
  }

  // Détection des repas / timing
  let timingTifinagh = ''
  let timingLatin = ''
  let timingPhonetic = ''

  if (orig.includes('après les repas') || orig.includes('après repas')) {
    timingTifinagh = ' · ⴷⴻⴼⴼⵉⵔ ⵓⵜⵛⵉ'
    timingLatin = ' · Deffir učči'
    timingPhonetic = ' · deffir ouch-tchi (mor lmakla)'
  } else if (orig.includes('avant les repas') || orig.includes('avant repas') || orig.includes('à jeun')) {
    timingTifinagh = ' · ⵇⴱⴻⵍ ⵓⵜⵛⵉ (ⵖⴻⴼ ⵓⵄⴱⵓⴹ ⵢⴻⵍⵡⴰⵏ)'
    timingLatin = ' · Qbel učči (ɣef uɛbuḍ yelwan)'
    timingPhonetic = ' · qbel ouch-tchi (ghef ou-3boudh yelwan)'
  } else if (orig.includes('au coucher')) {
    timingTifinagh = ' · ⵉⴹ (ⵇⴱⴻⵍ ⵉⴹⴻⵙ)'
    timingLatin = ' · Iḍ (qbel iḍes)'
    timingPhonetic = ' · idh (qbel idhes)'
  } else if (orig.includes('matin') || orig.includes('petit-déjeuner')) {
    timingTifinagh = ' · ⵜⴰⴼⴰⵡⵜ ⴷⴻⴳ ⵓⵚⴻⴱⵃⵉ'
    timingLatin = ' · Tifawin deg uṣebḥi'
    timingPhonetic = ' · tifawin deg usebhi'
  }

  // Précautions essentielles
  let alertTifinagh = ' · ⵓⵔ ⵃⴻⴱⴱⴻⵙ ⴰⵔⴰ ⴰⵙⴰⴼⴰⵔ'
  let alertLatin = ' · Ur ḥebbes ara asafar'
  let alertPhonetic = ' · Our hebbes ara asafar'

  if (orig.includes('6 jours') || orig.includes('7 jours') || orig.includes('antibiotique') || orig.includes('amoxicilline')) {
    alertTifinagh = ' · ⴽⴻⵎⵎⴻⵍ ⴰⴽⴽ ⴰⵙⴰⴼⴰⵔ ⴰⵍⴰⵎⵎⴰ ⵜⴼⵓⴽ ⵜⴻⵛⴽⴰⵔⵜ (ⵓⵔ ⵃⴻⴱⴱⴻⵙ ⴰⵔⴰ)'
    alertLatin = ' · Kemmel akk asafar alamma tfuk teckart (ur ḥebbes ara)'
    alertPhonetic = ' · Kemmel akk asafar alamma thefka teckart (our hebbes ara)'
  }

  return {
    tifinagh: `${formTifinagh} — ${freqTifinagh}${timingTifinagh}${alertTifinagh}`,
    latin: `${formLatin} — ${freqLatin}${timingLatin}${alertLatin}`,
    phonetic: `Prononciation au comptoir : « ${formPhonetic} — ${freqPhonetic}${timingPhonetic}${alertPhonetic} »`,
  }
}
