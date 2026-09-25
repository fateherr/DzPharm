/**
 * Dictionnaire de traduction arabe officiel pour DzPharm (W8-02 Native RTL Arabic Interface).
 * Traduction clinique et réglementaire conforme à la nomenclature algérienne.
 */

export type Language = 'fr' | 'ar'

export const AR_TRANSLATIONS: Record<string, string> = {
  // Navigation principale
  'nav.home': 'الرئيسية',
  'nav.directory': 'دليل الأدوية',
  'nav.interactions': 'التفاعلات الدوائية',
  'nav.tools': 'الأدوات السريرية',
  'nav.copilot': 'المساعد الذكي (IA)',
  'nav.stats': 'الإحصائيات',
  'nav.about': 'حول المنصة',
  'nav.emergency': 'أرقام الطوارئ',

  // Actions globales & recherche
  'search.placeholder': 'ابحث بالاسم التجاري، المادة الفعالة (DCI)، المخبر، أو رقم التسجيل...',
  'search.cta': 'بحث',
  'search.scanning': 'مسح الرمز الشريطي',
  'search.clear': 'مسح',
  'search.filters': 'تصفية النتائج',
  'search.recent': 'عمليات البحث الأخيرة',
  'search.popular': 'الأكثر بحثاً في الجزائر',
  'search.no_results': 'لم يتم العثور على أدوية مطابقة',
  'search.offline_notice': 'البحث يعمل محلياً من قاعدة البيانات IndexedDB',

  // Statuts réglementaires & Tarifs
  'status.active': 'نشط ومصرح (AMM)',
  'status.non_renewed': 'غير مجدد',
  'status.withdrawn': 'مسحوب من السوق',
  'status.refundable': 'قابل للتعويض (CNAS)',
  'status.not_refundable': 'غير معوض',
  'status.ppa': 'السعر العمومي (د.ج)',
  'status.reference_price': 'التعريفة المرجعية',

  // 17 Outils Cliniques DzPharm
  'tool.counter.title': 'الصرف عند شباك الصيدلية',
  'tool.counter.desc': 'سير عمل الصرف الموحد: مسح الرمز، الضمان الاجتماعي، والتفاعلات',
  'tool.picto.title': 'مولد الإرشادات المصورة',
  'tool.picto.desc': 'تصميم بطاقات الجرعات والملصقات البصرية للمرضى محدودي القراءة',
  'tool.pediatrie.title': 'حاسبة جرعات الأطفال',
  'tool.pediatrie.desc': 'تحديد الجرعات الدقيقة حسب الوزن، العمر ومجالات الأمان',
  'tool.chifa.title': 'دليل تعويضات الشفاء (CNAS)',
  'tool.chifa.desc': 'فحص شروط التعويض، النسب، وحساب مبالغ الدفع الإضافي',
  'tool.renal.title': 'حاسبة القصور الكلوي (ClCr)',
  'tool.renal.desc': 'معادلة كوكروفت-غولت ومواءمة جرعات الأدوية حسب تصفية الكرياتينين',
  'tool.hepatique.title': 'تقييم القصور الكبدي (Child-Pugh)',
  'tool.hepatique.desc': 'حساب درجات تشايلد-بو وملاءمة جرعات الأدوية ذات الاستقلاب الكبدي',
  'tool.avk.title': 'مراقبة مضادات التخثر (AVK & INR)',
  'tool.avk.desc': 'مخطط سينتروم وتعديل الجرعات وبروتوكولات الطوارئ والنزيف',
  'tool.antidotes.title': 'مضادات السموم والطوارئ',
  'tool.antidotes.desc': 'البروتوكولات الفورية للمركز الجزائري لمكافحة التسمم (CAPM)',
  'tool.grossesse.title': 'سلامة الحمل والرضاعة',
  'tool.grossesse.desc': 'تصنيف خطورة الأدوية خلال الثلث الأول، الثاني، الثالث والرضاعة',
  'tool.ramadan.title': 'الصيام والأدوية (58 ولاية)',
  'tool.ramadan.desc': 'تعديل مواعيد الجرعات بالتوافق مع أوقات الإمساك والإفطار',
  'tool.halal.title': 'فاحص الحلال والمكونات الإضافية',
  'tool.halal.desc': 'كشف الكحول، الجيلاتين الخنزيري والمواد المشتقة',
  'tool.comparateur.title': 'مقارنة الأدوية والبدائل',
  'tool.comparateur.desc': 'البدائل الجنيسة المتاحة في الجزائر وفوارق الأسعار',
  'tool.economies.title': 'دليل التوفير والبدائل الأقل كلفة',
  'tool.economies.desc': 'اقتراح أدوية متطابقة سريرياً بأسعار أنسب للمريض',
  'tool.penuries.title': 'خريطة رصد ندرة الأدوية',
  'tool.penuries.desc': 'متابعة ندرة الأدوية وتبادل المخزون بين الصيدليات',
  'tool.pharmacies.title': 'صيدليات الحراسة (58 ولاية)',
  'tool.pharmacies.desc': 'دليل الصيدليات المفتوحة الآن مع تحديد الموقع الجغرافي',
  'tool.traduction.title': 'ترجمة وتفسير الوصفات',
  'tool.traduction.desc': 'شرح طبي مبسط باللغة العربية، الدارجة الجزائرية، والأمازيغية',
  'tool.livret.title': 'الكتيب الصيدلاني الوطني',
  'tool.livret.desc': 'الملخصات والبيانات الرسمية لخصائص المنتجات (RCP)',

  // Raccourcis & Accessibilité
  'a11y.title': 'إمكانية الوصول وبيئة العمل',
  'a11y.night_mode': 'وضع حراسة الليل (Counter-Night)',
  'a11y.night_mode_desc': 'شاشة داكنة وإضاءة كهرمانية مضادة للوهج لتقليل إجهاد العين في نوبات الليل',
  'a11y.font_scale': 'حجم الخط',
  'a11y.font_family': 'نوع الخط المساعد',
  'a11y.audio_cues': 'التنبيهات الصوتية الصيدلانية',
  'a11y.audio_cues_desc': 'نغمات صوتية ملطفة لتأكيد المسح والتنبيه عند وجود تفاعلات خطيرة',
  'a11y.lang_label': 'لغة الواجهة',

  // Contexte patient épinglé
  'shift.pinned_patient': 'المريض المثبت في النوبة',
  'shift.unpin': 'إلغاء التثبيت',
  'shift.age': 'العمر',
  'shift.weight': 'الوزن',
  'shift.clcr': 'تصفية الكرياتينين',
  'shift.years': 'سنة',
  'shift.kg': 'كغ',
  'shift.ml_min': 'مل/دقيقة',

  // Mode Hors-ligne
  'offline.badge': 'وضع العمل بدون إنترنت',
  'offline.sync': 'مزامنة القاعدة المحلية',
  'offline.syncing': 'جاري تحميل الأدوية...',
  'offline.cached_count': 'دواء محفوظ محلياً',
}

/**
 * Traduit une clé selon la langue sélectionnée
 */
export function t(key: string, lang: Language = 'fr'): string {
  if (lang === 'ar' && AR_TRANSLATIONS[key]) {
    return AR_TRANSLATIONS[key]
  }
  return key
}
