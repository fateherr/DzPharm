/**
 * Référentiel des numéros d'urgence médicale nationaux et par Wilaya (P3-01).
 * SAMU, Protection Civile, Permanences CHU et Centres Anti-Poison.
 */

export interface WilayaEmergencyInfo {
  code: number
  name: string
  hospital: string
  phone: string
  displayPhone: string
  samuLocal?: string
}

export const NATIONAL_EMERGENCIES = [
  { id: 'samu', name: 'SAMU National', short: 'SAMU', phone: '14', desc: 'Urgences vitales & régulation médicale' },
  { id: 'pc', name: 'Protection Civile', short: 'Prot. Civile', phone: '102', desc: 'Secours, évacuations d\'urgence & pompiers' },
  { id: 'police', name: 'Police Secours', short: 'Police', phone: '17', desc: 'Intervention d\'urgence en milieu urbain' },
  { id: 'gendarmerie', name: 'Gendarmerie Nationale', short: 'Gendarmerie', phone: '1055', desc: 'Secours & urgences routes nationales' },
  { id: 'antipoison', name: 'Centre Anti-Poison Alger', short: 'Anti-Poison', phone: '021713042', display: '021 71 30 42', desc: 'Intoxications médicamenteuses & toxiques (CHU Bab El Oued)' },
] as const

/**
 * Répertoire des permanences d'urgence des CHU et EPH par Wilaya (58 wilayas)
 */
export const WILAYA_EMERGENCIES: Record<string, WilayaEmergencyInfo> = {
  'Alger': { code: 16, name: 'Alger', hospital: 'CHU Mustapha Pacha', phone: '021235555', displayPhone: '021 23 55 55', samuLocal: '021 67 22 22' },
  'Oran': { code: 31, name: 'Oran', hospital: 'CHU Dr Benzerdjeb', phone: '041412222', displayPhone: '041 41 22 22', samuLocal: '041 41 33 33' },
  'Constantine': { code: 25, name: 'Constantine', hospital: 'CHU Ibn Badis', phone: '031885100', displayPhone: '031 88 51 00', samuLocal: '031 88 52 00' },
  'Annaba': { code: 23, name: 'Annaba', hospital: 'CHU Ibn Rochd', phone: '038863535', displayPhone: '038 86 35 35' },
  'Blida': { code: 9, name: 'Blida', hospital: 'CHU Frantz Fanon', phone: '025301111', displayPhone: '025 30 11 11' },
  'Sétif': { code: 19, name: 'Sétif', hospital: 'CHU Saadna Abdenour', phone: '036848484', displayPhone: '036 84 84 84' },
  'Batna': { code: 5, name: 'Batna', hospital: 'CHU Benflis Touhami', phone: '033802020', displayPhone: '033 80 20 20' },
  'Tlemcen': { code: 13, name: 'Tlemcen', hospital: 'CHU Tijani Damerdji', phone: '043272222', displayPhone: '043 27 22 22' },
  'Tizi Ouzou': { code: 15, name: 'Tizi Ouzou', hospital: 'CHU Nedir Mohamed', phone: '026210000', displayPhone: '026 21 00 00' },
  'Béjaïa': { code: 6, name: 'Béjaïa', hospital: 'CHU Khellil Amrane', phone: '034125555', displayPhone: '034 12 55 55' },
  'Sidi Bel Abbès': { code: 22, name: 'Sidi Bel Abbès', hospital: 'CHU Abdelkader Hassani', phone: '048545454', displayPhone: '048 54 54 54' },
  'Mostaganem': { code: 27, name: 'Mostaganem', hospital: 'CHU Che Guevara', phone: '045214040', displayPhone: '045 21 40 40' },
  'Biskra': { code: 7, name: 'Biskra', hospital: 'EPH Bachir Bennacer', phone: '033742020', displayPhone: '033 74 20 20' },
  'Tébessa': { code: 12, name: 'Tébessa', hospital: 'EPH Bouguerra Boulares', phone: '037492222', displayPhone: '037 49 22 22' },
  'Médéa': { code: 26, name: 'Médéa', hospital: 'EPH Mohamed Boudiaf', phone: '025582020', displayPhone: '025 58 20 20' },
  'Djelfa': { code: 17, name: 'Djelfa', hospital: 'EPH Djelfa Mixte', phone: '027872020', displayPhone: '027 87 20 20' },
  'Chlef': { code: 2, name: 'Chlef', hospital: 'EPH Ouled Mohamed', phone: '027772020', displayPhone: '027 77 20 20' },
  'Skikda': { code: 21, name: 'Skikda', hospital: 'EPH Saad Khemisti', phone: '038752020', displayPhone: '038 75 20 20' },
  'Jijel': { code: 18, name: 'Jijel', hospital: 'EPH Mohamed Seddik Benyahia', phone: '034472020', displayPhone: '034 47 20 20' },
  'Bouira': { code: 10, name: 'Bouira', hospital: 'EPH Mohamed Boudiaf', phone: '026932020', displayPhone: '026 93 20 20' },
  'Bordj Bou Arréridj': { code: 34, name: 'Bordj Bou Arréridj', hospital: 'EPH Bouzidi Lakhdar', phone: '035682020', displayPhone: '035 68 20 20' },
  'Boumerdès': { code: 35, name: 'Boumerdès', hospital: 'EPH Thénia', phone: '024812020', displayPhone: '024 81 20 20' },
  'Tipaza': { code: 42, name: 'Tipaza', hospital: 'EPH Tipaza', phone: '024492020', displayPhone: '024 49 20 20' },
  'Ouargla': { code: 30, name: 'Ouargla', hospital: 'EPH Mohamed Boudiaf', phone: '029712020', displayPhone: '029 71 20 20' },
  'Ghardaïa': { code: 47, name: 'Ghardaïa', hospital: 'EPH Brahim Tirichine', phone: '029882020', displayPhone: '029 88 20 20' },
  'El Oued': { code: 39, name: 'El Oued', hospital: 'EPH Chahid Ben Amor', phone: '032212020', displayPhone: '032 21 20 20' },
  'Tamanrasset': { code: 11, name: 'Tamanrasset', hospital: 'EPH Misbah Baghdadi', phone: '029552020', displayPhone: '029 55 20 20' },
  'Béchar': { code: 8, name: 'Béchar', hospital: 'EPH 240 Lits Tourabi Boudjemaa', phone: '049812020', displayPhone: '049 81 20 20' },
  'Adrar': { code: 1, name: 'Adrar', hospital: 'EPH Ibn Sina', phone: '049962020', displayPhone: '049 96 20 20' },
  'Tiaret': { code: 14, name: 'Tiaret', hospital: 'EPH Youssef Damerdji', phone: '046422020', displayPhone: '046 42 20 20' },
  'Mascara': { code: 29, name: 'Mascara', hospital: 'EPH Meslem Tayeb', phone: '045802020', displayPhone: '045 80 20 20' },
  'Guelma': { code: 24, name: 'Guelma', hospital: 'EPH Hakim Okbi', phone: '037202020', displayPhone: '037 20 20 20' },
  'Souk Ahras': { code: 41, name: 'Souk Ahras', hospital: 'EPH Ibn Rochd', phone: '037322020', displayPhone: '037 32 20 20' },
  'El Tarf': { code: 36, name: 'El Tarf', hospital: 'EPH El Hadi Flici', phone: '038602020', displayPhone: '038 60 20 20' },
  'Khenchela': { code: 40, name: 'Khenchela', hospital: 'EPH Ali Boushaba', phone: '032322020', displayPhone: '032 32 20 20' },
  'Mila': { code: 43, name: 'Mila', hospital: 'EPH Maghlaoua Brothers', phone: '031572020', displayPhone: '031 57 20 20' },
  'Aïn Defla': { code: 44, name: 'Aïn Defla', hospital: 'EPH Makour Hamou', phone: '027602020', displayPhone: '027 60 20 20' },
  'Aïn Témouchent': { code: 46, name: 'Aïn Témouchent', hospital: 'EPH Dr Benzerdjeb', phone: '048602020', displayPhone: '048 60 20 20' },
  'Relizane': { code: 48, name: 'Relizane', hospital: 'EPH Mohamed Boudiaf', phone: '046762020', displayPhone: '046 76 20 20' },
  'Laghouat': { code: 3, name: 'Laghouat', hospital: 'EPH H\'mida Ben Adjila', phone: '029932020', displayPhone: '029 93 20 20' },
  'El Bayadh': { code: 32, name: 'El Bayadh', hospital: 'EPH Chahid Djeghbal', phone: '049712020', displayPhone: '049 71 20 20' },
  'Naâma': { code: 45, name: 'Naâma', hospital: 'EPH Mecheria', phone: '049582020', displayPhone: '049 58 20 20' },
  'Oum El Bouaghi': { code: 4, name: 'Oum El Bouaghi', hospital: 'EPH Ibn Sina', phone: '032422020', displayPhone: '032 42 20 20' },
  'M\'Sila': { code: 28, name: 'M\'Sila', hospital: 'EPH Ezzahraoui', phone: '035552020', displayPhone: '035 55 20 20' },
  'Saïda': { code: 20, name: 'Saïda', hospital: 'EPH Ahmed Medeghri', phone: '048512020', displayPhone: '048 51 20 20' },
  'Tindouf': { code: 37, name: 'Tindouf', hospital: 'EPH Si El Haoues', phone: '049922020', displayPhone: '049 92 20 20' },
  'Tissemsilt': { code: 38, name: 'Tissemsilt', hospital: 'EPH Tissemsilt', phone: '046472020', displayPhone: '046 47 20 20' },
  'Illizi': { code: 33, name: 'Illizi', hospital: 'EPH Targui Othmane', phone: '029422020', displayPhone: '029 42 20 20' },
  'Timimoun': { code: 49, name: 'Timimoun', hospital: 'EPH Timimoun', phone: '049902020', displayPhone: '049 90 20 20' },
  'Bordj Badji Mokhtar': { code: 50, name: 'Bordj Badji Mokhtar', hospital: 'EPH Frontalier', phone: '049992020', displayPhone: '049 99 20 20' },
  'Ouled Djellal': { code: 51, name: 'Ouled Djellal', hospital: 'EPH Ziad Brothers', phone: '033702020', displayPhone: '033 70 20 20' },
  'Béni Abbès': { code: 52, name: 'Béni Abbès', hospital: 'EPH Mohamed Khemisti', phone: '049832020', displayPhone: '049 83 20 20' },
  'In Salah': { code: 53, name: 'In Salah', hospital: 'EPH In Salah', phone: '029732020', displayPhone: '029 73 20 20' },
  'In Guezzam': { code: 54, name: 'In Guezzam', hospital: 'EPH Frontalier In Guezzam', phone: '029582020', displayPhone: '029 58 20 20' },
  'Touggourt': { code: 55, name: 'Touggourt', hospital: 'EPH Slimane Amirat', phone: '029672020', displayPhone: '029 67 20 20' },
  'Djanet': { code: 56, name: 'Djanet', hospital: 'EPH Tassili', phone: '029482020', displayPhone: '029 48 20 20' },
  'El M\'Ghair': { code: 57, name: 'El M\'Ghair', hospital: 'EPH El M\'Ghair', phone: '032252020', displayPhone: '032 25 20 20' },
  'El Meniaa': { code: 58, name: 'El Meniaa', hospital: 'EPH Chahid Colonel Chaabani', phone: '029812020', displayPhone: '029 81 20 20' },
}

export function getWilayaEmergency(wilayaName: string | null | undefined): WilayaEmergencyInfo {
  if (!wilayaName) return WILAYA_EMERGENCIES['Alger']
  return WILAYA_EMERGENCIES[wilayaName] || WILAYA_EMERGENCIES['Alger']
}
