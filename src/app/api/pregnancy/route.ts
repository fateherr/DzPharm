import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  findPregnancyRule,
  normalizeDciKey,
  RISK_ORDER,
  type PregnancyRisk,
} from "@/lib/pregnancy-rules";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/pregnancy?q=... — vérificateur Grossesse & Allaitement.
 *
 * Recherche un médicament (marque ou DCI) dans le registre, résout la DCI,
 * applique la base de règles CRAT locale + la monographie du livre
 * (sections grossesse/allaitement) et retourne une synthèse graduée.
 */

function toItems(list: string[] | undefined): { label?: string; text: string }[] {
  if (!list) return [];
  return list
    .filter((t) => t && t.trim())
    .map((t) => {
      const m = t.match(/^([A-ZÉÈÀÇ0-9][\wÀ-ÿ'’\- ()/.,%µ°]{2,60}?)\s*:\s*(.+)$/);
      if (m && m[2].length > 3) return { label: m[1].trim(), text: m[2].trim() };
      return { text: t.trim() };
    });
}

/** Sépare le volet grossesse / allaitement / précisions depuis les items du livre. */
function splitPregnancyItems(items: { label?: string; text: string }[]) {
  const pregnancy: { label?: string; text: string }[] = [];
  const breastfeeding: { label?: string; text: string }[] = [];
  const details: { label?: string; text: string }[] = [];
  for (const it of items) {
    const l = (it.label ?? "").toLowerCase();
    const t = it.text.toLowerCase();
    if (l.startsWith('allaitement') || t.startsWith('allaitement')) breastfeeding.push(it);
    else if (l.startsWith('grossesse') || t.startsWith('grossesse')) pregnancy.push(it);
    else details.push(it);
  }
  return { pregnancy, breastfeeding, details };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = normalizeDciKey(searchParams.get("q") ?? "");
    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Requête trop courte" }, { status: 400 });
    }

    // 1. Résolution dans le registre (marque, DCI, labo)
    const drug = await db.drug.findFirst({
      where: {
        OR: [
          { brandKey: { startsWith: q } },
          { dciKey: { startsWith: q } },
          { dciKey: { contains: " " + q } },
          { brandKey: { contains: q } },
        ],
      },
      orderBy: [{ status: "asc" }, { views: "desc" }],
      select: {
        id: true,
        brand: true,
        dci: true,
        dciKey: true,
        form: true,
        dosage: true,
        status: true,
        domain: true,
      },
    });

    if (!drug) {
      return NextResponse.json({ found: false, message: "Médicament introuvable dans le registre" });
    }

    // 2. Règle CRAT locale (base curatée)
    const rule = findPregnancyRule(drug.dciKey ?? drug.dci);

    // 3. Monographie du livre (volet grossesse/allaitement)
    const index = await getMonoIndex();
    const mono = index ? matchMonograph(index, drug.dciKey ?? drug.dci) : null;
    const monoItems = mono ? toItems(mono.content.sections.pregnancy) : [];
    const monoSplit = splitPregnancyItems(monoItems);

    // 4. Niveau de risque global :
    //    - règle CRAT curatée = source de vérité si elle existe
    //    - sinon classification automatique du texte du livre
    let riskLevel: PregnancyRisk | null = rule?.pregnancy ?? null;
    if (!riskLevel && monoSplit.pregnancy.length) {
      const text = monoSplit.pregnancy.map((i) => i.text).join(" ");
      riskLevel = classifyText(text);
    }

    let breastfeedingLevel: PregnancyRisk | null = rule?.breastfeeding ?? null;
    if (!breastfeedingLevel && monoSplit.breastfeeding.length) {
      const text = monoSplit.breastfeeding.map((i) => i.text).join(" ");
      breastfeedingLevel = classifyText(text);
    }

    // 5. Équivalents de marque (autres produits de même DCI, actifs)
    const equivalents = await db.drug.count({
      where: { dciKey: drug.dciKey, status: "ACTIF" },
    });

    return NextResponse.json({
      found: true,
      drug: {
        id: drug.id,
        brand: drug.brand,
        dci: drug.dci,
        form: drug.form,
        dosage: drug.dosage,
        status: drug.status,
        domain: drug.domain,
        activesCount: equivalents,
      },
      riskLevel,
      breastfeedingLevel,
      rule: rule
        ? {
            pregnancy: rule.pregnancy,
            trimesters: rule.trimesters ?? null,
            breastfeeding: rule.breastfeeding,
            pregnancyNote: rule.pregnancyNote,
            breastfeedingNote: rule.breastfeedingNote,
            alternatives: rule.alternatives ?? [],
          }
        : null,
      book: mono
        ? {
            dci: mono.dci,
            domain: mono.domain,
            pregnancyItems: monoSplit.pregnancy,
            breastfeedingItems: monoSplit.breastfeeding,
            detailItems: monoSplit.details,
          }
        : null,
      source: rule && mono ? "RULE+BOOK" : rule ? "RULE" : mono ? "BOOK" : "NONE",
    });
  } catch (error) {
    console.error("[api/pregnancy]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

/**
 * Classification automatique — gère les négations
 * (« aucun effet tératogène », « non contre-indiqué » ne comptent pas).
 */
function classifyText(text: string): PregnancyRisk | null {
  // Découpe en phrases pour que les négations restent locales
  const sentences = text.split(/(?<=[.;!?])\s+/);
  let risk: PregnancyRisk | null = null;
  const bump = (r: PregnancyRisk) => {
    if (!risk || RISK_ORDER[r] > RISK_ORDER[risk]) risk = r;
  };
  for (const raw of sentences) {
    const s = raw.toLowerCase();
    // CI — en dehors des négations (« non contre-indiqué », « pas contre-indiqué »)
    if (
      /contre-?indicat|formellement/.test(s) &&
      !/(non|pas|n'est pas|jamais)\s+(?:formellement\s+)?contre-?indicat/.test(s)
    ) {
      bump("CONTRE_INDIQUE");
    }
    // tératogène — hors négation (« aucun effet tératogène », « pas de risque tératogène »)
    if (
      /(tératogène|teratogene|malformatif)/.test(s) &&
      !/(aucun|aucune|pas de|sans|n'est pas|non|absence d[e']?)\s+(\S+\s+){0,3}(tératogène|teratogene|malformatif)/.test(s)
    ) {
      bump("CONTRE_INDIQUE");
    }
    if (/à éviter|a éviter|déconseill|éviter par principe/.test(s)) bump("DECONSEILLE");
    if (/par prudence|surveillance|cas par cas|possible si/.test(s)) bump("PRUDENCE");
    if (/de choix|utilisabl|compatible|peut être utilisé|sans risque/.test(s)) bump("SURE");
  }
  return risk;
}
