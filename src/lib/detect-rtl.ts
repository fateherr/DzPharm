/**
 * P1-14 — RTL + language detection for Arabic content.
 * Audit: docs/audit/06_tool_deep_dives/DzPharm_Tool06_i18n_DeepDive.pdf
 *
 * The browser's `dir="auto"` handles visual direction automatically, but it does
 * NOT set `lang` — which screen readers need to pronounce Arabic correctly and
 * search engines need for language attribution. This helper provides explicit
 * `dir` + `lang` attributes for content that may contain Arabic / Darija.
 *
 * Arabic Unicode range: U+0600–U+06FF (Arabic), U+0750–U+077F (Arabic Supplement),
 * U+08A0–U+08FF (Arabic Extended-A/B), U+FB50–U+FDFF (Arabic Presentation Forms-A),
 * U+FE70–U+FEFF (Arabic Presentation Forms-B).
 */

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Returns true if the text contains at least one Arabic-script character. */
export function containsArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/**
 * Returns 'rtl' if the text contains Arabic characters (so the browser should
 * render right-to-left), else 'ltr'. Use as `dir={detectDir(text)}`.
 *
 * For mixed-content input fields where the user types, prefer `dir="auto"`
 * (the browser detects per-paragraph). Use this helper for STATIC rendered
 * content (chat messages, suggestion chips, labels).
 */
export function detectDir(text: string): "rtl" | "ltr" {
  return containsArabic(text) ? "rtl" : "ltr";
}

/**
 * Returns the BCP-47 language tag for the text: 'ar' for Arabic, 'fr' for
 * French (the platform default), or undefined if not determinable. Use as
 * `lang={detectLang(text)}`.
 */
export function detectLang(text: string): "ar" | "fr" | undefined {
  if (containsArabic(text)) return "ar";
  // Latin script → French is the platform default language.
  if (/[A-Za-zÀ-ÿ]/.test(text)) return "fr";
  return undefined;
}

/** Convenience: returns { dir, lang } props for a text node. */
export function rtlProps(text: string): { dir: "rtl" | "ltr"; lang?: "ar" | "fr" } {
  return { dir: detectDir(text), lang: detectLang(text) };
}
