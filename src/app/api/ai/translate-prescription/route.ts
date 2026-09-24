import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiError, GEMINI_MODEL } from "@/lib/gemini";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Garde anti-abus : 20 requêtes / minute / IP */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

interface TranslatedLine {
  original: string;
  arabicMedName: string;
  arabicInstructions: string;
  timing: string;
  precaution: string;
}

const PHRASE_MAP: Record<string, string> = {
  "1 cp": "قرص واحد",
  "1 comprimé": "قرص واحد",
  "2 cp": "قرصان (2)",
  "2 comprimés": "قرصان (2)",
  "1 gélule": "كبسولة واحدة",
  "2 gélules": "كبسولتان (2)",
  "1 sachet": "كيس واحد",
  "2 sachets": "كيسان (2)",
  "1 cuillère à café": "ملعقة صغيرة واحدة",
  "1 cuillère à soupe": "ملعقة كبيرة واحدة",
  "1x/j": "مرة واحدة في اليوم",
  "2x/j": "مرتان في اليوم (كل 12 ساعة)",
  "3x/j": "3 مرات في اليوم (كل 8 ساعات)",
  "4x/j": "4 مرات في اليوم (كل 6 ساعات)",
  "matin": "صباحاً",
  "midi": "ظهراً",
  "soir": "مساءً",
  "au coucher": "عند النوم ليلاً",
  "avant les repas": "قبل الأكل بنصف ساعة",
  "pendant les repas": "أثناء تناول الوجبة",
  "après les repas": "بعد الوجبة مباشرة",
  "à jeun": "على الريق (صباحاً قبل الإفطار)",
  "en cas de douleur": "عند الشعور بالألم فقط",
  "en cas de fièvre": "عند ارتفاع درجة الحرارة",
  "pendant 5 jours": "لمدة 5 أيام",
  "pendant 6 jours": "لمدة 6 أيام",
  "pendant 7 jours": "لمدة 7 أيام",
  "pendant 10 jours": "لمدة 10 أيام",
  "pendant 1 mois": "لمدة شهر كامل",
};

function fallbackTranslate(text: string): { lines: TranslatedLine[]; fullArabic: string; fullDarija: string } {
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lines: TranslatedLine[] = rawLines.map((line) => {
    let arabicInstr = line;
    for (const [fr, ar] of Object.entries(PHRASE_MAP)) {
      const reg = new RegExp(fr, "gi");
      arabicInstr = arabicInstr.replace(reg, ar);
    }

    return {
      original: line,
      arabicMedName: line.split(/[:\-\d]/)[0]?.trim() || line,
      arabicInstructions: arabicInstr,
      timing: "حسب توجيهات الطبيب والصيدلي",
      precaution: "احترم الجرعة المحددة ولا توقف الدواء دون استشارة طبية",
    };
  });

  const fullArabic = lines
    .map((l, i) => `${i + 1}. ${l.arabicMedName} : ${l.arabicInstructions}`)
    .join("\n");

  const fullDarija = lines
    .map((l, i) => `${i + 1}. ${l.arabicMedName} : شرب الدوا في وقته وما تحبسوش حتى تكمل المدة`)
    .join("\n");

  return { lines, fullArabic, fullDarija };
}

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req);
  if (!rateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessayez dans une minute" },
      { status: 429 }
    );
  }

  let body: { text?: string; dialect?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Veuillez fournir le texte de l'ordonnance à traduire" },
      { status: 400 }
    );
  }

  // 1. Tenter la traduction intelligente via Gemini
  try {
    const systemPrompt = `Tu es un pharmacien clinicien et traducteur médical officiel en Algérie.
Tu dois traduire l'ordonnance médicale ci-dessous (rédigée en français médical) vers l'arabe clair pour le patient algérien.
Réponds STRICTEMENT sous forme de JSON valide avec le schéma suivant :
{
  "fullArabic": "Texte récapitulatif complet en arabe littéraire clair",
  "fullDarija": "Conseils oraux en Arabe Algérien (Darija) simples et bienveillants",
  "lines": [
    {
      "original": "ligne originale",
      "arabicMedName": "Nom du médicament et forme en arabe",
      "arabicInstructions": "Posologie exacte en arabe (nb de comprimés, fréquence)",
      "timing": "Moment de prise précis (ex: صباحاً بعد الفطور)",
      "precaution": "Précautions essentielles (ex: تجنب القيادة، شرب كمية كافية من الماء)"
    }
  ]
}`;

    const geminiText = await callGemini(
      systemPrompt,
      [{ role: "user", parts: [{ text: `Voici l'ordonnance à traduire :\n\n${text}` }] }],
      { temperature: 0.1, model: GEMINI_MODEL }
    );

    // Nettoyer les balises Markdown json
    const cleaned = geminiText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json({
      success: true,
      source: "gemini",
      fullArabic: parsed.fullArabic,
      fullDarija: parsed.fullDarija,
      lines: parsed.lines || [],
    });
  } catch (err) {
    console.warn("[Prescription Translation] Gemini indisponible ou erreur, repli déterministe:", err);
    // 2. Repli déterministe clinique robuste
    const fallback = fallbackTranslate(text);
    return NextResponse.json({
      success: true,
      source: "deterministic_fallback",
      fullArabic: fallback.fullArabic,
      fullDarija: fallback.fullDarija,
      lines: fallback.lines,
    });
  }
}
