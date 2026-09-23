import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";
import {
  findPhoneticAndFuzzyMatches,
  pharmaPhoneticKey,
  toCleanKey,
} from "@/lib/search-phonetics";

/**
 * Dictionnaire arabe / darija (usage maghrébin et algérien) -> clés de recherche réelles
 * du registre. Permet de chercher « باراسيتامول », « بومادا صفراء », « كاشي زرق »
 * et de retrouver le produit correspondant dans la nomenclature nationale.
 */
const ARABIC_SEARCH_MAP: Record<string, string> = {
  // --- Antalgiques / fièvre ---
  "\u0628\u0627\u0631\u0627\u0633\u064a\u062a\u0627\u0645\u0648\u0644": "PARACETAMOL", // باراسيتامول
  "\u0633\u064a\u062a\u0627\u0645\u0648\u0644": "PARACETAMOL", // سيتامول
  "\u0627\u0644\u0633\u064a\u062a\u0627\u0645\u0648\u0644": "PARACETAMOL", // السيتامول
  "\u0628\u0646\u0627\u062f\u0648\u0644": "PARACETAMOL", // بنادول
  "\u0627\u0644\u0628\u0646\u0627\u062f\u0648\u0644": "PARACETAMOL",
  "\u062f\u0648\u0644\u064a\u0628\u0631\u0627\u0646": "DOLIPRANE", // دوليبران
  "\u0627\u0644\u0645\u0633\u0643\u0646": "PARACETAMOL", // المسكن
  "\u0645\u0633\u0643\u0646": "PARACETAMOL", // مسكن
  "\u0627\u0644\u0635\u062f\u0627\u0639": "PARACETAMOL", // الصداع
  "\u062f\u0648\u0627 \u0627\u0644\u0631\u0627\u0633": "PARACETAMOL", // دوا الراس
  "\u0627\u0644\u062d\u0645\u0649": "PARACETAMOL", // الحمى
  "\u0633\u062e\u0648\u0646\u064a\u0629": "PARACETAMOL", // سخونية
  "\u0628\u0631\u0641\u064a\u0646": "IBUPROFENE", // برفين
  "\u0628\u0631\u0648\u0641\u064a\u0646": "IBUPROFENE", // بروفين
  "\u0623\u0633\u0628\u0631\u064a\u0646": "ACIDE ACETYLSALICYLIQUE", // أسبرين
  "\u0627\u0633\u0628\u0631\u064a\u0646": "ACIDE ACETYLSALICYLIQUE",
  "\u0641\u0648\u0644\u062a\u0627\u0631\u064a\u0646": "DICLOFENAC", // فولتارين
  "\u062f\u064a\u0643\u0644\u0648\u0641\u064a\u0646\u0627\u0643": "DICLOFENAC", // ديكلوفيناك
  "\u0633\u0628\u0627\u0633\u0641\u0648\u0646": "PHLOROGLUCINOL", // سباسفون
  "\u0627\u0644\u0633\u0628\u0627\u0633\u0641\u0648\u0646": "PHLOROGLUCINOL",
  "\u0627\u0644\u0645\u063a\u0635": "PHLOROGLUCINOL", // المغص
  "\u0627\u0644\u0633\u0637\u0631": "PHLOROGLUCINOL", // السطر (وجع البطن)

  // --- Antibiotiques & Anti-infectieux ---
  "\u0645\u0636\u0627\u062f \u062d\u064a\u0648\u064a": "AMOXICILLINE",
  "\u0623\u0645\u0648\u0643\u0633\u064a\u0633\u064a\u0644\u064a\u0646": "AMOXICILLINE",
  "\u0627\u0645\u0648\u0643\u0633\u064a\u0633\u064a\u0644\u064a\u0646": "AMOXICILLINE",
  "\u0623\u0648\u062c\u0645\u0646\u062a\u064a\u0646": "AUGMENTIN",
  "\u0627\u0648\u063a\u0645\u0646\u062a\u064a\u0646": "AUGMENTIN",
  "\u0623\u0648\u063a\u0645\u0646\u062a\u0627\u0646": "AUGMENTIN",
  "\u0632\u064a\u062b\u0631\u0648\u0645\u0627\u064a\u0633\u064a\u0646": "AZITHROMYCINE",
  "\u0633\u064a\u0628\u0631\u0648\u0641\u0644\u0648\u0643\u0633\u0627\u0633\u064a\u0646": "CIPROFLOXACINE",
  "\u0641\u0644\u0627\u062c\u064a\u0644": "METRONIDAZOLE", // فلاجيل
  "\u0643\u0627\u0634\u064a \u0632\u0631\u0642": "METRONIDAZOLE", // كاشي زرق (شائع في الجزائر للفلاجيل)
  "\u0627\u0644\u0643\u0627\u0634\u064a \u0627\u0644\u0632\u0631\u0642": "METRONIDAZOLE",
  "\u0628\u0648\u0645\u0627\u062f\u0627 \u0635\u0641\u0631\u0627\u0621": "CHLORTETRACYCLINE", // بومادا صفراء (شائعة للعين والجلد)
  "\u0627\u0644\u0628\u0648\u0645\u0627\u062f\u0627 \u0627\u0644\u0635\u0641\u0631\u0627\u0621": "CHLORTETRACYCLINE",
  "\u0628\u0648\u0645\u0627\u062f\u0627 \u0643\u062d\u0644\u0629": "SULFOBITUMINATE", // بومادا كحلة (إيكتيول)
  "\u0627\u0644\u0628\u0648\u0645\u0627\u062f\u0627 \u0627\u0644\u0643\u062d\u0644\u0629": "SULFOBITUMINATE",

  // --- Diabète ---
  "\u0645\u064a\u062a\u0641\u0648\u0631\u0645\u064a\u0646": "METFORMINE",
  "\u0645\u064a\u062a\u0631\u0641\u0648\u0631\u0645\u064a\u0646": "METFORMINE",
  "\u0627\u0644\u0633\u0643\u0631": "METFORMINE",
  "\u062f\u0648\u0627 \u0627\u0644\u0633\u0643\u0631": "METFORMINE",
  "\u062f\u0648\u0627\u0621 \u0627\u0644\u0633\u0643\u0631": "METFORMINE",
  "\u0633\u0643\u0631 \u0627\u0644\u062f\u0645": "METFORMINE",
  "\u0625\u0646\u0633\u0648\u0644\u064a\u0646": "INSULINE",
  "\u0627\u0646\u0633\u0648\u0644\u064a\u0646": "INSULINE",

  // --- Cardiovasculaire ---
  "\u0627\u0644\u0636\u063a\u0637": "AMLODIPINE",
  "\u0636\u063a\u0637 \u0627\u0644\u062f\u0645": "AMLODIPINE",
  "\u062f\u0648\u0627 \u0627\u0644\u0636\u063a\u0637": "AMLODIPINE",
  "\u0627\u0644\u0636\u063a\u0637 \u0627\u0644\u0639\u0627\u0644\u064a": "AMLODIPINE",
  "\u0627\u0644\u0642\u0644\u0628": "ACIDE ACETYLSALICYLIQUE",
  "\u0627\u0644\u0643\u0648\u0644\u064a\u0633\u062a\u0631\u0648\u0644": "ATORVASTATINE",
  "\u0643\u0648\u0644\u064a\u0633\u062a\u0631\u0648\u0644": "ATORVASTATINE",
  "\u0645\u062f\u0631 \u0627\u0644\u0628\u0648\u0644": "FUROSEMIDE",
  "\u0627\u0644\u0645\u062f\u0631 \u0644\u0644\u0628\u0648\u0644": "FUROSEMIDE",

  // --- Gastro-entérologie ---
  "\u0627\u0644\u0631\u0648": "OMEPRAZOLE", // الرو (الحموضة)
  "\u0627\u0644\u062d\u0645\u0648\u0636\u0629": "OMEPRAZOLE",
  "\u062d\u0631\u0642\u0629 \u0627\u0644\u0645\u0639\u062f\u0629": "OMEPRAZOLE",
  "\u0627\u0644\u0645\u0639\u062f\u0629": "OMEPRAZOLE",
  "\u062f\u0648\u0627 \u0627\u0644\u062d\u0631\u064a\u0642": "OMEPRAZOLE", // دوا الحريق
  "\u0627\u0644\u0625\u0633\u0647\u0627\u0644": "LOPERAMIDE",
  "\u0625\u0633\u0647\u0627\u0644": "LOPERAMIDE",
  "\u0627\u0644\u062c\u0631\u064a\u0629": "LOPERAMIDE", // الجرية (إسهال بالدارجة)
  "\u0627\u0644\u0625\u0645\u0633\u0627\u0643": "LACTULOSE",
  "\u0625\u0645\u0633\u0627\u0643": "LACTULOSE",
  "\u0627\u0644\u063a\u062b\u064a\u0627\u0646": "DOMPERIDONE",
  "\u0627\u0644\u0642\u064a\u0621": "DOMPERIDONE",
  "\u0627\u0644\u0631\u062f\u0627\u0646": "DOMPERIDONE", // الردان
  "\u0627\u0644\u062a\u0642\u064a\u0627": "DOMPERIDONE",
  "\u0645\u064a\u062a\u0648\u0643\u0644\u0648\u0628\u0631\u0627\u0645\u064a\u062f": "METOCLOPRAMIDE",

  // --- Respiratoire / ORL ---
  "\u0627\u0644\u0631\u0628\u0648": "SALBUTAMOL",
  "\u0627\u0644\u0631\u0628\u0648\u0629": "SALBUTAMOL",
  "\u0641\u064a\u0646\u062a\u0648\u0644\u064a\u0646": "SALBUTAMOL",
  "\u0641\u0646\u062a\u0648\u0644\u064a\u0646": "SALBUTAMOL",
  "\u0627\u0644\u0633\u0639\u0627\u0644": "CARBOCISTEINE",
  "\u0627\u0644\u0643\u062d\u0629": "CARBOCISTEINE",
  "\u0643\u062d\u0629": "CARBOCISTEINE",
  "\u062f\u0648\u0627 \u0627\u0644\u0633\u0639\u0644\u0629": "CARBOCISTEINE",
  "\u0633\u064a\u0631\u0648 \u0627\u0644\u0633\u0639\u0644\u0629": "CARBOCISTEINE",
  "\u0631\u0634\u062d": "PSEUDOEPHEDRINE",
  "\u0627\u0644\u0628\u0631\u062f": "PSEUDOEPHEDRINE",
  "\u0627\u0644\u062f\u0648\u062e\u0629": "BETAHISTINE", // الدوخة (طنين/دوار)
  "\u062f\u0648\u062e\u0629": "BETAHISTINE",

  // --- Allergies ---
  "\u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629": "CETIRIZINE",
  "\u062d\u0633\u0627\u0633\u064a\u0629": "CETIRIZINE",
  "\u062f\u0648\u0627 \u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629": "CETIRIZINE",
  "\u0633\u064a\u062a\u064a\u0631\u064a\u0632\u064a\u0646": "CETIRIZINE",
  "\u0644\u0648\u0631\u0627\u062a\u0627\u062f\u064a\u0646": "LORATADINE",

  // --- Vitamines / fer / thyroïde ---
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646": "VITAMINE",
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646 \u062f": "CHOLECALCIFEROL",
  "\u0641\u064a\u062a\u0627\u0645\u064a\u0646 \u0633\u064a": "ACIDE ASCORBIQUE",
  "\u0627\u0644\u062d\u062f\u064a\u062f": "FER",
  "\u062d\u0628\u0648\u0628 \u0627\u0644\u062d\u062f\u064a\u062f": "FER",
  "\u0627\u0644\u063a\u062f\u0629": "LEVOTHYROXINE",
  "\u0627\u0644\u063a\u062f\u0629 \u0627\u0644\u062f\u0631\u0642\u064a\u0629": "LEVOTHYROXINE",
  "\u0644\u064a\u0641\u0648\u062b\u064a\u0631\u0648\u0643\u0633\u064a\u0646": "LEVOTHYROXINE",

  // --- SNC ---
  "\u062d\u0628\u0648\u0628 \u0627\u0644\u0646\u0648\u0645": "ZOLPIDEM",
  "\u0627\u0644\u0646\u0648\u0645": "ZOLPIDEM",
  "\u0645\u0647\u062f\u0626": "DIAZEPAM",
  "\u062a\u0631\u0627\u0646\u0643\u064a\u0644\u0627\u0646": "DIAZEPAM",
  "\u0627\u0643\u062a\u0626\u0627\u0628": "SERTRALINE",
  "\u062a\u0631\u0627\u0645\u0627\u062f\u0648\u0644": "TRAMADOL",

  // --- Divers & Darija algérienne ---
  "\u0627\u0644\u062f\u064a\u062f\u0627\u0646": "ALBENDAZOLE",
  "\u0645\u0646\u0639 \u0627\u0644\u062d\u0645\u0644": "ETHINYLESTRADIOL",
  "\u062d\u0628 \u0627\u0644\u0634\u0628\u0627\u0628": "ISOTRETINOINE",
  "\u062f\u0648\u0627 \u0627\u0644\u0633\u062e\u0627\u0646\u0629": "PARACETAMOL", // دوا السخانة
  "\u0627\u0644\u0633\u062e\u0627\u0646\u0629": "PARACETAMOL", // السخانة
  "\u062f\u0648\u0627 \u0627\u0644\u0643\u0648\u0644\u0648\u0646": "MEBEVERINE", // دوا الكولون
  "\u0627\u0644\u0643\u0648\u0644\u0648\u0646": "MEBEVERINE", // الكولون
  "\u0627\u0644\u0642\u0648\u0644\u0648\u0646": "MEBEVERINE", // القولون
  "\u0627\u0646\u062a\u064a\u0628\u064a\u0648\u062a\u064a\u0643": "AMOXICILLINE", // انتيبيوتيك
  "\u0627\u0644\u0627\u0646\u062a\u064a\u0628\u064a\u0648\u062a\u064a\u0643": "AMOXICILLINE",
  "\u062f\u0648\u0627 \u0627\u0644\u062a\u0642\u064a\u0624": "DOMPERIDONE", // دوا التقيؤ
  "\u0628\u0648\u0645\u0627\u062f\u0627 \u0628\u064a\u0636\u0627\u0621": "ZINC", // بومادا بيضاء
};

function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

function mapArabicQuery(q: string): string | null {
  const trimmed = q.trim();
  if (trimmed in ARABIC_SEARCH_MAP) return ARABIC_SEARCH_MAP[trimmed];
  for (const [ar, fr] of Object.entries(ARABIC_SEARCH_MAP)) {
    if (trimmed.includes(ar) || ar.includes(trimmed)) return fr;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Laboratoires algériens & Extraction d'entités                      */
/* ------------------------------------------------------------------ */

const ALGERIAN_LABS: Array<{ name: string; alias: string[] }> = [
  { name: "SAIDAL", alias: ["SAIDAL"] },
  { name: "BIOPHARM", alias: ["BIOPHARM"] },
  { name: "MERINAL", alias: ["MERINAL"] },
  { name: "INPHA-MEDIS", alias: ["INPHA", "MEDIS", "INPHA-MEDIS"] },
  { name: "FRATER-RAZES", alias: ["FRATER", "RAZES", "FRATER-RAZES", "FRATER RAZES"] },
  { name: "BEKER", alias: ["BEKER"] },
  { name: "HIKMA", alias: ["HIKMA"] },
  { name: "SOPHAL", alias: ["SOPHAL"] },
  { name: "GENPHARMA", alias: ["GENPHARMA"] },
  { name: "DAR ESSAYDALI", alias: ["DAR ESSAYDALI", "ESSAYDALI"] },
  { name: "NOVOPHARMA", alias: ["NOVOPHARMA"] },
  { name: "LDM", alias: ["LDM"] },
  { name: "BIOGALENIC", alias: ["BIOGALENIC"] },
  { name: "SANOFI", alias: ["SANOFI"] },
  { name: "PHARMALLIANCE", alias: ["PHARMALLIANCE"] },
  { name: "HUP PHARMA", alias: ["HUP", "HUP PHARMA"] },
  { name: "NAD PHARMAC", alias: ["NAD", "NAD PHARMAC"] },
  { name: "BIOCARE", alias: ["BIOCARE"] },
  { name: "ELEA", alias: ["ELEA"] },
  { name: "TAPHARM", alias: ["TAPHARM"] },
];

function extractLabFromQuery(workingKey: string): { labName: string; matchedAlias: string } | null {
  const words = workingKey.toUpperCase().split(" ");
  // Only extract lab if there is at least one other word so searching "SAIDAL" alone remains a normal query
  if (words.length < 2) return null;
  for (const lab of ALGERIAN_LABS) {
    for (const alias of lab.alias) {
      const aliasWords = alias.split(" ");
      if (aliasWords.length === 1 && words.includes(alias)) {
        return { labName: lab.name, matchedAlias: alias };
      }
      if (aliasWords.length > 1 && workingKey.includes(alias)) {
        return { labName: lab.name, matchedAlias: alias };
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Dosage Parser V2 (Ratios, %, UI, Concentrations, Microgrammes)     */
/* ------------------------------------------------------------------ */

interface ParsedDosage {
  raw: string;
  tokens: string[];
  display: string;
}

function parseDosageFromQuery(originalQuery: string): ParsedDosage | null {
  const original = originalQuery.trim();
  if (!original) return null;
  const tokens = new Set<string>();
  let raw = "";

  // 1. Ratios multi-composants avec unités (ex: "1g/200mg", "1g/125mg", "500mg/125mg", "250mg/62.5mg/5ml")
  const ratioMatch = original.match(
    /\b(\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|µg|ui))\s*\/\s*(\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|µg|ui))(?:\s*\/\s*(\d+(?:[.,]\d+)?\s*ml))?\b/i
  );
  if (ratioMatch) {
    raw = ratioMatch[0];
    const cleanRatio = raw.toUpperCase().replace(/\s+/g, "");
    tokens.add(cleanRatio);
    tokens.add(raw.toUpperCase());
    const p1 = ratioMatch[1].toUpperCase().replace(/\s+/g, "");
    const p2 = ratioMatch[2].toUpperCase().replace(/\s+/g, "");
    tokens.add(`${p1}/${p2}`);
    if (p1.endsWith("G") && !p1.endsWith("MG")) {
      const gNum = parseFloat(p1.replace(",", "."));
      if (!isNaN(gNum)) {
        tokens.add(`${gNum * 1000}MG/${p2}`);
      }
    }
    return { raw, tokens: Array.from(tokens), display: raw };
  }

  // 2. Ratios nus sans unité (ex: "80/12.5", "160/12.5", "10/160", "500/125")
  const bareRatioMatch = original.match(/\b(\d{1,4})\s*\/\s*(\d{1,4}(?:[.,]\d{1,2})?)\b/);
  if (bareRatioMatch) {
    raw = bareRatioMatch[0];
    const n1 = bareRatioMatch[1];
    const n2 = bareRatioMatch[2].replace(",", ".");
    const n2fr = bareRatioMatch[2].replace(".", ",");
    tokens.add(raw);
    tokens.add(`${n1}MG/${n2}MG`);
    tokens.add(`${n1}MG/${n2fr}MG`);
    tokens.add(`${n1} MG / ${n2} MG`);
    tokens.add(`${n1} MG/${n2fr} MG`);
    return { raw, tokens: Array.from(tokens), display: raw };
  }

  // 3. Pourcentages (formes cutanées & ophtalmiques : "0.05%", "0,05%", "1%", "2%", "0.1%")
  const pctMatch = original.match(/\b(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    raw = pctMatch[0];
    const num = pctMatch[1].replace(",", ".");
    const numFr = pctMatch[1].replace(".", ",");
    tokens.add(`${num}%`);
    tokens.add(`${numFr}%`);
    tokens.add(`${num} %`);
    tokens.add(`${numFr} %`);
    tokens.add(numFr);
    tokens.add(num);
    return { raw, tokens: Array.from(tokens), display: raw };
  }

  // 4. Fortes Unités Internationales UI (ex: "200 000 UI", "100 000 UI", "200000UI", "50 000 UI", "400 UI")
  const uiMatch = original.match(/\b(\d{1,3}(?:\s*\d{3})*|\d{2,7})\s*(ui|iu)\b/i);
  if (uiMatch) {
    raw = uiMatch[0];
    const digitsOnly = uiMatch[1].replace(/\s+/g, "");
    const withSpace = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    tokens.add(`${digitsOnly}UI`);
    tokens.add(`${digitsOnly} UI`);
    tokens.add(`${withSpace}UI`);
    tokens.add(`${withSpace} UI`);
    tokens.add(`${withSpace}UI/ML`);
    tokens.add(`${withSpace} UI/ML`);
    tokens.add(digitsOnly);
    tokens.add(withSpace);
    return { raw, tokens: Array.from(tokens), display: `${withSpace} UI` };
  }

  // 5. Concentrations liquides (ex: "250mg/5ml", "125mg/5ml", "100mg/ml", "0.5mg/5ml")
  const liqMatch = original.match(/\b(\d+(?:[.,]\d+)?\s*mg)\s*\/\s*(\d*\s*ml)\b/i);
  if (liqMatch) {
    raw = liqMatch[0];
    const cleanLiq = raw.toUpperCase().replace(/\s+/g, "");
    tokens.add(cleanLiq);
    tokens.add(raw.toUpperCase());
    const val = parseFloat(liqMatch[1].replace(",", "."));
    if (!isNaN(val)) {
      tokens.add(`${val}MG`);
      tokens.add(`${val} MG`);
      tokens.add(String(val));
    }
    return { raw, tokens: Array.from(tokens), display: raw };
  }

  // 6. Microgrammes (ex: "75 µg", "75µg", "75mcg", "75ug")
  const mcgMatch = original.match(/\b(\d+(?:[.,]\d+)?)\s*(µg|ug|mcg)\b/i);
  if (mcgMatch) {
    raw = mcgMatch[0];
    const num = mcgMatch[1].replace(",", ".");
    tokens.add(`${num}µG`);
    tokens.add(`${num} µG`);
    tokens.add(`${num}UG`);
    tokens.add(`${num}MCG`);
    tokens.add(`${num} MCG`);
    tokens.add(num);
    return { raw, tokens: Array.from(tokens), display: `${num} µg` };
  }

  // 7. Unités standards g et mg (ex: "1000mg", "1g", "500mg")
  const unitMatch = original.match(/\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(mg|g)\b/i);
  if (unitMatch) {
    raw = unitMatch[0];
    const num = parseFloat(unitMatch[1].replace(",", "."));
    const unit = unitMatch[2].toLowerCase();
    const valueMg = unit === "mg" ? num : num * 1000;
    const mgStr = valueMg % 1 === 0 ? String(Math.round(valueMg)) : String(valueMg);
    tokens.add(raw.toUpperCase());
    tokens.add(`${mgStr}MG`);
    tokens.add(`${mgStr} MG`);
    tokens.add(mgStr);
    if (unit === "g") {
      tokens.add(`${num}G`);
      tokens.add(`${num} G`);
    } else if (valueMg >= 1000 && valueMg % 1000 === 0) {
      const gVal = valueMg / 1000;
      tokens.add(`${gVal}G`);
      tokens.add(`${gVal} G`);
    }
    return { raw, tokens: Array.from(tokens), display: `${mgStr}mg` };
  }

  // 8. Nombre isolé dans une requête multi-mots (ex: "doliprane 1000", "vitamine d 200000", "amoxicilline 500")
  const words = original.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    for (const w of words) {
      if (/^\d{2,6}(?:[.,]\d{1,2})?$/.test(w)) {
        const numVal = parseFloat(w.replace(",", "."));
        raw = w;
        if (numVal >= 10000) {
          // Forte probabilité d'UI (ex: 200000, 100000, 50000)
          const digitsOnly = String(Math.round(numVal));
          const withSpace = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
          tokens.add(`${digitsOnly}UI`);
          tokens.add(`${digitsOnly} UI`);
          tokens.add(`${withSpace}UI`);
          tokens.add(`${withSpace} UI`);
          tokens.add(digitsOnly);
          tokens.add(withSpace);
          return { raw, tokens: Array.from(tokens), display: `${withSpace} UI` };
        } else if (numVal >= 0.25 && numVal <= 5000) {
          const mgStr = numVal % 1 === 0 ? String(Math.round(numVal)) : String(numVal);
          tokens.add(mgStr);
          tokens.add(`${mgStr}MG`);
          tokens.add(`${mgStr} MG`);
          if (numVal === 1 || numVal === 2) {
            tokens.add(`${numVal}G`);
            tokens.add(`${numVal} G`);
            tokens.add(`${numVal * 1000}MG`);
            tokens.add(String(numVal * 1000));
          } else if (numVal === 1000 || numVal === 2000) {
            tokens.add(`${numVal / 1000}G`);
            tokens.add(`${numVal / 1000} G`);
          }
          return { raw, tokens: Array.from(tokens), display: `${mgStr}mg` };
        }
      }
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Form-in-main-search Parser V2                                      */
/* ------------------------------------------------------------------ */

const FORM_TOKENS: Array<{ tokens: string[]; formKeys: string[] }> = [
  { tokens: ["sirop", "sirops", "liquide", "oral"], formKeys: ["SIROP", "BUVABLE", "SUSP"] },
  { tokens: ["buvable", "buvables", "suspension", "susp"], formKeys: ["BUVABLE", "SIROP", "SUSP"] },
  { tokens: ["goutte", "gouttes", "gtt"], formKeys: ["GOUTTE"] },
  { tokens: ["comprime", "comprimes", "cp", "cpr", "cps", "tablette", "tablettes", "cachet", "cachets"], formKeys: ["COMP"] },
  { tokens: ["gelule", "gelules", "capsule", "capsules"], formKeys: ["GELULE", "GLES", "GLE"] },
  {
    tokens: ["injectable", "injection", "injections", "ampoule", "ampoules", "perfusion", "iv", "im", "inj"],
    formKeys: ["INJ", "PDRE.SOL.INJ", "PDRE. SOL.INJ", "PERF"],
  },
  { tokens: ["pommade", "pommades"], formKeys: ["POMMADE"] },
  { tokens: ["creme", "cremes", "topique", "dermique"], formKeys: ["CREME"] },
  { tokens: ["collyre", "collyres", "ophtalmique"], formKeys: ["COLLYRE"] },
  { tokens: ["suppositoire", "suppositoires", "suppo"], formKeys: ["SUPPO"] },
  { tokens: ["sachet", "sachets", "granule", "granules", "poudre"], formKeys: ["SACHET", "SACHET DOSE"] },
  { tokens: ["spray", "aerosol", "aerosols", "inhalateur", "nasal"], formKeys: ["SPRAY", "AEROSOL"] },
  { tokens: ["patch", "dispositif", "timbre"], formKeys: ["PATCH"] },
];

interface ParsedForm {
  formKeys: string[];
  matchedToken: string;
}

function parseFormFromQuery(key: string): ParsedForm | null {
  const words = key.toLowerCase().split(" ");
  for (const entry of FORM_TOKENS) {
    for (const token of entry.tokens) {
      if (words.includes(token)) {
        return { formKeys: entry.formKeys, matchedToken: token.toUpperCase() };
      }
    }
  }
  return null;
}

function stripMetaTokens(key: string, toRemove: string[]): string {
  let result = key;
  for (const t of toRemove) {
    if (!t) continue;
    result = result.replace(new RegExp(`\\b${t}\\b`, "gi"), " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Pertinence & Scoring N-gram                                        */
/* ------------------------------------------------------------------ */

function scoreResult(
  dciKey: string | null,
  brandKey: string | null,
  queryKey: string,
  dosageTokens: string[] = []
): number {
  const dk = dciKey ?? "";
  const bk = brandKey ?? "";
  const tokens = queryKey.split(" ").filter((t) => t.length >= 2);

  let base = 8;
  // Exact matches (Priorité maximale)
  if (bk === queryKey) base = 0;
  else if (dk === queryKey) base = 1;
  // Début de terme (Starts with)
  else if (bk.startsWith(queryKey)) base = 2;
  else if (dk.startsWith(queryKey)) base = 3;
  // Début de mot (Word boundary start)
  else if (new RegExp(`(?:^|\\s)${queryKey}`).test(bk)) base = 4;
  else if (new RegExp(`(?:^|\\s)${queryKey}`).test(dk)) base = 5;
  // Tous les tokens présents comme débuts de mots
  else if (
    tokens.length > 1 &&
    tokens.every(
      (t) =>
        new RegExp(`(?:^|\\s)${t}`).test(bk) ||
        new RegExp(`(?:^|\\s)${t}`).test(dk)
    )
  ) {
    base = 6;
  }
  // Inclusion simple
  else if (bk.includes(queryKey) || dk.includes(queryKey)) base = 7;

  // Dosage proximity boost
  if (dosageTokens.length > 0) {
    const hasDosage = dosageTokens.some((tok) => bk.includes(tok));
    if (hasDosage) base -= 0.5;
  }

  return base;
}

/**
 * GET /api/drugs
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const rawUserQuery = (sp.get("q") || "").trim();
    let q = rawUserQuery;

    // Recherche arabe : traduire vers le mot-clé français
    let arabicMapped = false;
    if (q && hasArabic(q)) {
      const mapped = mapArabicQuery(q);
      if (mapped) {
        q = mapped;
        arabicMapped = true;
      }
    }

    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10) || 20));
    const status = sp.get("status") || "";
    const domain = sp.get("domain") || "";
    let form = sp.get("form") || "";
    const liste = sp.get("liste") || "";
    const country = sp.get("country") || "";
    let lab = (sp.get("lab") || "").trim();
    const sort = sp.get("sort") || "relevance";
    const scope = (sp.get("scope") || "all").toLowerCase();

    const where: Prisma.DrugWhereInput = {};

    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (domain) where.domain = domain;
    if (form) where.form = { contains: form };
    if (liste) where.liste = liste;
    if (country) where.country = country;
    if (lab) where.lab = { contains: lab };

    const baseWhere: Prisma.DrugWhereInput = { ...where };

    // ── Décomposition avancée de la requête ─────────────────────────────
    let dosageHint: ParsedDosage | null = null;
    let formHint: ParsedForm | null = null;
    let extractedLab: string | null = null;
    let cleanKey = "";
    let suggestion: string | null = null;

    if (q) {
      const rawKey = toCleanKey(q);

      // 1. Extraire le dosage (Ratios, %, UI, mg, g, etc.)
      dosageHint = parseDosageFromQuery(q);
      let workingKey = rawKey;

      if (dosageHint) {
        workingKey = stripMetaTokens(workingKey, [
          toCleanKey(dosageHint.raw),
          dosageHint.raw.toUpperCase(),
        ]);
      }

      // 2. Extraire la forme si non renseignée explicitement
      if (!form) {
        formHint = parseFormFromQuery(workingKey);
        if (formHint) {
          workingKey = stripMetaTokens(workingKey, [formHint.matchedToken.toUpperCase()]);
          if (formHint.formKeys.length === 1) {
            where.form = { contains: formHint.formKeys[0] };
          } else {
            const formOr: Prisma.DrugWhereInput[] = formHint.formKeys.map((fk) => ({
              form: { contains: fk },
            }));
            const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
            where.AND = [...existingAnd, { OR: formOr }];
          }
        }
      }

      // 3. Extraction d'entité laboratoire algérien (ex: "amoxicilline saidal")
      if (!lab && scope !== "lab") {
        const labMatch = extractLabFromQuery(workingKey);
        if (labMatch) {
          extractedLab = labMatch.labName;
          where.lab = { contains: labMatch.matchedAlias };
          workingKey = stripMetaTokens(workingKey, [labMatch.matchedAlias]);
        }
      }

      cleanKey = workingKey;

      // 4. Clauses de recherche selon le périmètre (scope)
      const ors: Prisma.DrugWhereInput[] = [];
      if (scope === "dci") {
        if (cleanKey) {
          ors.push({ dciKey: { contains: cleanKey } });
          const pKey = pharmaPhoneticKey(cleanKey);
          if (pKey && pKey !== cleanKey) ors.push({ dciKey: { contains: pKey } });
          const drugWords = cleanKey.split(" ").filter((w) => w.length >= 2);
          if (drugWords.length > 1) {
            ors.push({
              AND: drugWords.map((w) => ({
                OR: [{ dciKey: { contains: w } }, { dci: { contains: w } }],
              })),
            });
          }
        }
        ors.push({ dci: { contains: q } });
      } else if (scope === "brand") {
        if (cleanKey) {
          ors.push({ brandKey: { contains: cleanKey } });
          const pKey = pharmaPhoneticKey(cleanKey);
          if (pKey && pKey !== cleanKey) ors.push({ brandKey: { contains: pKey } });
          const drugWords = cleanKey.split(" ").filter((w) => w.length >= 2);
          if (drugWords.length > 1) {
            ors.push({
              AND: drugWords.map((w) => ({
                OR: [{ brandKey: { contains: w } }, { brand: { contains: w } }],
              })),
            });
          }
        }
        ors.push({ brand: { contains: q } });
      } else if (scope === "lab") {
        ors.push({ lab: { contains: cleanKey || q } });
      } else if (scope === "regnumber") {
        ors.push({ regNumber: { contains: cleanKey || q } });
      } else {
        // scope === "all" (défaut)
        if (cleanKey) {
          ors.push({ dciKey: { contains: cleanKey } });
          ors.push({ brandKey: { contains: cleanKey } });

          const pKey = pharmaPhoneticKey(cleanKey);
          if (pKey && pKey !== cleanKey) {
            ors.push({ dciKey: { contains: pKey } });
            ors.push({ brandKey: { contains: pKey } });
          }

          const drugWords = cleanKey.split(" ").filter((w) => w.length >= 2);
          if (drugWords.length > 1) {
            const wordAnds = drugWords.map((w) => ({
              OR: [
                { brandKey: { contains: w } },
                { dciKey: { contains: w } },
                { brand: { contains: w } },
                { dci: { contains: w } },
              ],
            }));
            ors.push({ AND: wordAnds });
          }
        }
        ors.push({ dci: { contains: q } });
        ors.push({ brand: { contains: q } });
        ors.push({ lab: { contains: q } });
        ors.push({ regNumber: { contains: q } });

        const cleanDigits = q.replace(/[\s\-_]/g, "");
        if (cleanDigits.length >= 4) {
          ors.push({ barcode: { contains: cleanDigits } });
          ors.push({ drugBarcodes: { some: { barcode: { contains: cleanDigits } } } });
        }
      }

      const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...and, { OR: ors }];

      // 5. Appliquer le filtre dosage sur dosage et brandKey
      if (dosageHint && dosageHint.tokens.length > 0) {
        const dosageOrs: Prisma.DrugWhereInput[] = [];
        for (const tok of dosageHint.tokens) {
          dosageOrs.push({ dosage: { contains: tok } });
          dosageOrs.push({ brandKey: { contains: tok } });
        }
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: dosageOrs }];
      }
    }

    // ── Exécution de la recherche avec priorisation de pertinence ───────
    let total = await db.drug.count({ where });
    let drugs: any[] = [];
    let fuzzyApplied = false;

    // Si la recherche par pertinence est active et qu'on a une clé propre,
    // on résout le biais de tri SQL via scoring complet des candidats légers
    if (sort === "relevance" && (cleanKey || q) && total > 0) {
      // Si moins de 400 résultats, on extrait les identifiants pour un tri optimal en JS
      if (total <= 400) {
        const rankingKey = cleanKey || toCleanKey(q);
        const candidates = await db.drug.findMany({
          where,
          select: { id: true, brandKey: true, dciKey: true, status: true },
        });

        // Trier par statut ACTIF puis score de pertinence (avec boost dosage)
        const dTokens = dosageHint?.tokens ?? [];
        candidates.sort((a, b) => {
          if (a.status !== b.status) {
            if (a.status === "ACTIF") return -1;
            if (b.status === "ACTIF") return 1;
          }
          return (
            scoreResult(a.dciKey, a.brandKey, rankingKey, dTokens) -
            scoreResult(b.dciKey, b.brandKey, rankingKey, dTokens)
          );
        });

        const start = (page - 1) * pageSize;
        const pageSlice = candidates.slice(start, start + pageSize);
        const pageIds = pageSlice.map((c) => c.id);

        if (pageIds.length > 0) {
          const fullRows = await db.drug.findMany({
            where: { id: { in: pageIds } },
            include: {
              pharmacyProducts: {
                orderBy: [{ ppa: "asc" }],
                take: 1,
                select: { ppa: true, cnasId: true },
              },
            },
          });
          // Réaligner avec l'ordre exact du tri
          drugs = pageIds.map((id) => fullRows.find((r) => r.id === id)).filter(Boolean);
        }
      } else {
        // Fallback pagination SQL standard pour les très grands volumes
        drugs = await db.drug.findMany({
          where,
          orderBy: [{ status: "asc" }, { dciKey: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            pharmacyProducts: {
              orderBy: [{ ppa: "asc" }],
              take: 1,
              select: { ppa: true, cnasId: true },
            },
          },
        });
      }
    } else {
      // Autre tri (marque, DCI, labo, dates)
      const orderBy: Prisma.DrugOrderByWithRelationInput[] =
        sort === "brand"
          ? [{ brandKey: "asc" }]
          : sort === "dci"
            ? [{ dciKey: "asc" }]
            : sort === "lab"
              ? [{ lab: "asc" }]
              : sort === "dateInitial"
                ? [{ regDateInitial: "desc" }]
                : sort === "dateFinal"
                  ? [{ regDateFinal: "desc" }]
                  : [{ status: "asc" }, { dciKey: "asc" }];

      drugs = await db.drug.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          pharmacyProducts: {
            orderBy: [{ ppa: "asc" }],
            take: 1,
            select: { ppa: true, cnasId: true },
          },
        },
      });
    }

    // ── Fallback tolérant Phonétique & Levenshtein si 0 résultat ────────
    if (total === 0 && (cleanKey.length >= 3 || q.length >= 3)) {
      const searchTerm = cleanKey || toCleanKey(q);
      const fuzzyMatches = await findPhoneticAndFuzzyMatches(searchTerm, 6);

      if (fuzzyMatches.candidates.length > 0) {
        suggestion = fuzzyMatches.suggestion;
        const fuzzyWhere: Prisma.DrugWhereInput = {
          ...baseWhere,
          OR: [
            { brandKey: { in: fuzzyMatches.candidates } },
            { dciKey: { in: fuzzyMatches.candidates } },
          ],
        };

        if (formHint) {
          fuzzyWhere.form = { contains: formHint.formKeys[0] };
        }
        if (dosageHint && dosageHint.tokens.length > 0) {
          const dosageOrs: Prisma.DrugWhereInput[] = [];
          for (const tok of dosageHint.tokens) {
            dosageOrs.push({ dosage: { contains: tok } });
            dosageOrs.push({ brandKey: { contains: tok } });
          }
          fuzzyWhere.AND = [{ OR: dosageOrs }];
        }

        const [ft, fd] = await Promise.all([
          db.drug.count({ where: fuzzyWhere }),
          db.drug.findMany({
            where: fuzzyWhere,
            orderBy: [{ status: "asc" }, { dciKey: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              pharmacyProducts: {
                orderBy: [{ ppa: "asc" }],
                take: 1,
                select: { ppa: true, cnasId: true },
              },
            },
          }),
        ]);

        if (ft > 0) {
          fuzzyApplied = true;
          total = ft;
          drugs = fd;
        }
      }

      // Si toujours 0 et qu'un filtre de dosage était actif, relâcher le dosage
      if (!fuzzyApplied && dosageHint) {
        const relaxedWhere: Prisma.DrugWhereInput = { ...baseWhere };
        if (formHint) relaxedWhere.form = { contains: formHint.formKeys[0] };
        relaxedWhere.AND = [
          {
            OR: [
              { dciKey: { contains: searchTerm } },
              { brandKey: { contains: searchTerm } },
              { dci: { contains: q } },
              { brand: { contains: q } },
            ],
          },
        ];

        const [rt, rd] = await Promise.all([
          db.drug.count({ where: relaxedWhere }),
          db.drug.findMany({
            where: relaxedWhere,
            orderBy: [{ status: "asc" }, { dciKey: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              pharmacyProducts: {
                orderBy: [{ ppa: "asc" }],
                take: 1,
                select: { ppa: true, cnasId: true },
              },
            },
          }),
        ]);

        if (rt > 0) {
          fuzzyApplied = true;
          total = rt;
          drugs = rd;
        }
      }
    }

    const index = await getMonoIndex();

    const items = drugs.map((d) => ({
      id: d.id,
      regNumber: d.regNumber,
      dci: d.dci,
      brand: d.brand,
      form: d.form,
      dosage: d.dosage,
      packaging: d.packaging,
      lab: d.lab,
      country: d.country,
      liste: d.liste,
      p1: d.p1,
      p2: d.p2,
      type: d.type,
      statut: d.statut,
      status: d.status,
      domain: d.domain,
      domains: d.domains ? (JSON.parse(d.domains) as string[]) : [],
      regDateInitial: d.regDateInitial,
      regDateFinal: d.regDateFinal,
      price: d.pharmacyProducts[0]?.ppa ?? null,
      refundable: d.pharmacyProducts[0]?.cnasId != null,
      hasBookRcp: index ? matchMonograph(index, d.dciKey ?? d.dci) !== null : false,
    }));

    return NextResponse.json({
      drugs: items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      fuzzy: fuzzyApplied,
      suggestion,
      _meta: q
        ? {
            arabicMapped,
            arabicOriginal: hasArabic(rawUserQuery) ? rawUserQuery : null,
            cleanKey,
            suggestion,
            scope,
            extractedLab,
            dosageHint: dosageHint
              ? { raw: dosageHint.raw, display: dosageHint.display, tokens: dosageHint.tokens }
              : null,
            formHint: formHint ? formHint.formKeys.join("|") : null,
          }
        : undefined,
    });
  } catch (error) {
    console.error("[api/drugs]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
