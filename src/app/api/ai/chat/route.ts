import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { PEDIATRIC_DRUGS, computeDose } from "@/lib/pediatric-dosing";
import type { PediatricDosing } from "@/components/dzpharm/types";

export const maxDuration = 120;

/** Garde anti-abus : 20 requêtes / minute / IP (coût + stabilité du service). */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/* ------------------------------------------------------------------ */
/* F1-bis / F1-ter — ancre pédiatrique multi-tours + registre marques  */
/* ------------------------------------------------------------------ */

/** Normalisation accent/casse/majuscules pour la détection. */
function normText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface PediatricAnchor {
  weightKg: number | null;
  ageMonths: number | null;
  ageLabel: string;
  isBabyContext: boolean;
  matchedDrugs: PediatricDosing[];
  /** Marques pédiatriques citées et leur statut réel en base (F1-ter). */
  brandStatuses: { brand: string; status: string; dciKey: string }[];
  /** Marque citée appartenant à `withdrawnBrands` de la molécule. */
  withdrawnHits: { brand: string; dci: string }[];
  antalfenGynConfusion: boolean;
}

/**
 * Détection du contexte pédiatrique sur l'ENSEMBLE des messages de
 * l'utilisateur (F1-bis) : poids, âge, mots-clés bébé/enfant, molécules et
 * marques du référentiel pédiatrique (y compris marques retirées — F1-ter).
 */
function detectPediatricAnchor(allUserText: string): PediatricAnchor {
  const norm = normText(allUserText);

  // --- Poids : « 8 kg », « 8.5 kg », darija « 8 كيلو » ---
  let weightKg: number | null = null;
  const wFr = allUserText.match(
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:kg|kgs|kilo|kilos)\b/i
  );
  const wAr = allUserText.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:كيلو|كلغ|كغ)/);
  const wMatch = wFr ?? wAr;
  if (wMatch) {
    const v = Number.parseFloat(wMatch[1].replace(",", "."));
    if (v > 0 && v <= 150) weightKg = v;
  }

  // --- Âge : mois / ans (fr + arabe) ---
  let ageMonths: number | null = null;
  const mFr = allUserText.match(/(\d{1,2})\s*mois\b/i);
  const mAr = allUserText.match(/(\d{1,2})\s*شهر/);
  const mMatch = mFr ?? mAr;
  if (mMatch) {
    const v = Number.parseInt(mMatch[1], 10);
    if (v >= 0 && v <= 216) ageMonths = v;
  }
  if (ageMonths == null) {
    const yFr = allUserText.match(/\b(\d{1,2})\s*(?:ans|an)\b/i);
    const yAr = allUserText.match(/(\d{1,2})\s*(?:سنة|سنوات|عام)/);
    const yMatch = yFr ?? yAr;
    if (yMatch) {
      const v = Number.parseInt(yMatch[1], 10);
      if (v >= 0 && v <= 18) ageMonths = v * 12;
    }
  }

  const isBabyContext =
    /\b(BEBE|NOURRISSON|ENFANT|PEDIATRI\w*|TOUT PETIT|BB)\b/.test(norm) ||
    /طفل|رضيع|بيبي|نونو/.test(allUserText);

  // --- ANTALFEN GYN (flurbiprofène) ≠ ANTALFEN sirop (ibuprofène) ---
  const antalfenGynConfusion = /\bANTALFEN GYN\b/.test(norm);

  // --- Molécules & marques du référentiel pédiatrique ---
  const matchedDrugs: PediatricDosing[] = [];
  const mentionedBrands = new Map<string, PediatricDosing>();
  for (const drug of PEDIATRIC_DRUGS) {
    // DCI (jetons du dciKey : PARACETAMOL, IBUPROFENE, AMOXICILLINE ACIDE CLAVULANIQUE…)
    const dciTokens = drug.dciKey.split(/\s+/).filter((t) => t.length >= 6);
    const dciHit = dciTokens.some((t) => new RegExp(`\\b${t}\\b`).test(norm));
    // Marques actives de chaque forme
    const activeBrandWords = new Set<string>();
    for (const f of drug.forms) {
      for (const b of f.brands.split(",")) {
        const word = normText(b).split(" ")[0];
        if (word.length >= 4) activeBrandWords.add(word);
      }
    }
    // Marques retirées/non renouvelées (F1-ter)
    const withdrawnBrandWords = new Set<string>();
    for (const w of drug.withdrawnBrands ?? []) {
      const word = normText(w).split(" ")[0];
      if (word.length >= 4) withdrawnBrandWords.add(word);
    }
    // ANTALFEN : ignorer la confusion GYN pour l'ibuprofène
    const brandHit = [...activeBrandWords].some((w) => {
      if (drug.dciKey === "IBUPROFENE" && w === "ANTALFEN" && antalfenGynConfusion) {
        // « ANTALFEN GYN » cité : vérifier si le sirop ANTALFEN (sans GYN) l'est aussi
        return new RegExp(`\\bANTALFEN\\b(?!\\s*GYN)`).test(norm);
      }
      return new RegExp(`\\b${w}\\b`).test(norm);
    });
    const withdrawnHit = [...withdrawnBrandWords].some((w) =>
      new RegExp(`\\b${w}\\b`).test(norm)
    );

    if (dciHit || brandHit || withdrawnHit) {
      matchedDrugs.push(drug);
      for (const w of activeBrandWords) {
        if (new RegExp(`\\b${w}\\b`).test(norm)) mentionedBrands.set(w, drug);
      }
      for (const w of withdrawnBrandWords) {
        if (new RegExp(`\\b${w}\\b`).test(norm)) mentionedBrands.set(w, drug);
      }
    }
  }

  return {
    weightKg,
    ageMonths,
    ageLabel:
      ageMonths == null
        ? "âge non précisé"
        : ageMonths < 24
          ? `${ageMonths} mois`
          : `${Math.floor(ageMonths / 12)} ans (${ageMonths} mois)`,
    isBabyContext,
    matchedDrugs,
    brandStatuses: [],
    withdrawnHits: [],
    antalfenGynConfusion,
  };
}

/** Dose calculée par prise pour l'ancre (mg/kg → mg, plafonnée) + CI + mises en garde. */
function anchorDoseLine(drug: PediatricDosing, weightKg: number, ageMonths: number): string {
  const lines: string[] = [];
  if (drug.mgPerKgPerDose != null) {
    const res = computeDose(drug, weightKg, ageMonths, 0);
    const perDose = res.doseMg != null ? res.doseMg : drug.mgPerKgPerDose * weightKg;
    const cap = drug.maxSingleMg != null ? ` (plafond ${drug.maxSingleMg} mg)` : "";
    const capped = res.capped ? " — plafond adulte atteint" : "";
    lines.push(
      `${drug.mgPerKgPerDose} mg/kg/prise → ${Math.round(perDose * 100) / 100} mg par prise${cap}${capped}`
    );
    if (drug.intervalH) lines.push(`espacement ${drug.intervalH} h entre les prises`);
    if (drug.maxDailyMgPerKg != null) {
      const daily = Math.min(
        drug.maxDailyMgPerKg * weightKg,
        drug.maxDailyMg ?? Number.POSITIVE_INFINITY
      );
      lines.push(
        `maximum ${drug.maxDailyMgPerKg} mg/kg/j → ${Math.round(daily * 100) / 100} mg/j${
          drug.maxDailyMg != null ? ` (plafond ${drug.maxDailyMg} mg/j)` : ""
        }`
      );
    }
    if (res.blockers.length > 0) lines.push(`⚠️ BLOQUEURS : ${res.blockers.join(" ")}`);
  } else if (drug.bands && ageMonths != null) {
    const band = drug.bands.find(
      (b) => ageMonths >= b.minMonths && (b.maxMonths == null || ageMonths <= b.maxMonths)
    );
    if (band) lines.push(band.label);
    else lines.push("aucune bande d'âge ne correspond — demander l'âge exact");
  } else {
    lines.push("posologie fixe par tranche d'âge — voir bandes du référentiel");
  }
  // Limites d'âge/poids du référentiel (CI officielles)
  const ageLimit =
    drug.minAgeMonths != null ? `âge minimum ${drug.minAgeMonths} mois` : null;
  const weightLimit =
    drug.minWeightKg != null ? `poids minimum ${drug.minWeightKg} kg` : null;
  const limits = [ageLimit, weightLimit].filter(Boolean).join(" et ");
  if (limits) lines.push(`CONTRE-INDICATION : ${limits} (référentiel DzPharm)`);
  return lines.join(" ; ");
}

/**
 * POST /api/ai/chat — DzPharm Copilote Clinique
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], mode?: 'pro' | 'patient' | 'enfant' }
 * The assistant is grounded with live registry data (matching drugs from SQLite)
 * and a pediatric anchor computed over the WHOLE conversation (F1-bis) with
 * brand-status verification from the registry (F1-ter).
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`ai-chat:${clientIpFrom(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes — réessayez dans ${rl.retryAfterSec} s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    const messages: { role: string; content: string }[] = Array.isArray(body?.messages)
      ? body.messages.filter((m: { role?: string; content?: string }) => m?.content)
      : [];
    const mode: "pro" | "patient" | "enfant" =
      body?.mode === "patient"
        ? "patient"
        : body?.mode === "enfant"
          ? "enfant"
          : "pro";

    if (messages.length === 0) {
      return NextResponse.json({ error: "Aucun message fourni" }, { status: 400 });
    }
    // keep last 16 messages for context
    const history = messages.slice(-16);
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    /* ---------------- F1-bis : ancre pédiatrique multi-tours --------------- */
    const allUserText = history
      .filter((m) => m.role === "user")
      .map((m) => String(m.content))
      .join("\n");
    const anchor = detectPediatricAnchor(allUserText);

    // F1-ter : vérification du statut réel des marques citées en base
    if (anchor.matchedDrugs.length > 0) {
      try {
        const brandWords = new Set<string>();
        for (const drug of anchor.matchedDrugs) {
          for (const f of drug.forms) {
            for (const b of f.brands.split(",")) {
              const w = normText(b).split(" ")[0];
              if (w.length >= 4 && new RegExp(`\\b${w}\\b`).test(normText(allUserText))) {
                brandWords.add(w);
              }
            }
          }
          for (const wb of drug.withdrawnBrands ?? []) {
            const w = normText(wb).split(" ")[0];
            if (w.length >= 4 && new RegExp(`\\b${w}\\b`).test(normText(allUserText))) {
              brandWords.add(w);
            }
          }
        }
        if (brandWords.size > 0) {
          const rows = await db.drug.findMany({
            where: {
              OR: [...brandWords].map((p) => ({ brandKey: { startsWith: p } })),
            },
            select: { brand: true, status: true, dciKey: true, dci: true, dosage: true },
            take: 120,
          });
          anchor.brandStatuses = rows.map((r) => ({
            brand: r.brand ?? "?",
            status: r.status,
            dciKey: r.dciKey ?? "",
          }));
          // marques retirées / non renouvelées citées par l'utilisateur
          for (const drug of anchor.matchedDrugs) {
            for (const wb of drug.withdrawnBrands ?? []) {
              const w = normText(wb).split(" ")[0];
              if (w.length >= 4 && new RegExp(`\\b${w}\\b`).test(normText(allUserText))) {
                anchor.withdrawnHits.push({ brand: wb, dci: drug.dci });
              }
            }
          }
        }
      } catch (e) {
        console.error("[ai/chat] brand status lookup failed", e);
      }
    }

    // Construction du bloc ANCRE
    let pediatricAnchorBlock = "";
    const pediatricRelevant =
      anchor.matchedDrugs.length > 0 ||
      ((anchor.weightKg != null || anchor.ageMonths != null) && anchor.isBabyContext);
    if (pediatricRelevant) {
      const parts: string[] = [];
      parts.push(
        `Contexte détecté (issu de TOUTE la conversation) : ${
          anchor.isBabyContext ? "enfant/bébé" : "contexte pédiatrique"
        } · poids : ${anchor.weightKg != null ? `${anchor.weightKg} kg` : "non précisé"} · âge : ${anchor.ageLabel}.`
      );
      if (anchor.weightKg == null && anchor.matchedDrugs.length > 0) {
        parts.push(
          "⚠️ Poids non fourni : demande le poids de l'enfant avant de donner toute dose en mL."
        );
      }
      for (const drug of anchor.matchedDrugs.slice(0, 4)) {
        const doseLine =
          anchor.weightKg != null
            ? anchorDoseLine(drug, anchor.weightKg, anchor.ageMonths ?? 144)
            : "dose non calculable sans poids";
        const formsLines = drug.forms
          .slice(0, 3)
          .map((f) => `${f.label} — marques actives du registre : ${f.brands}`)
          .join(" ; ");
        const withdrawn =
          drug.withdrawnBrands && drug.withdrawnBrands.length > 0
            ? ` MARQUES INDISPONIBLES au registre : ${drug.withdrawnBrands.join(" ; ")} — si l'utilisateur cite l'une d'elles, recommande une marque active ci-dessus.`
            : "";
        const warningsLine =
          drug.warnings.length > 0
            ? ` MISES EN GARDE : ${drug.warnings.slice(0, 2).join(" ")}`
            : "";
        parts.push(
          `- ${drug.dci} (${drug.dciKey}) : ${doseLine}. Formes locales : ${formsLines}.${withdrawn}${warningsLine}`
        );
      }
      if (anchor.withdrawnHits.length > 0) {
        parts.push(
          `⚠️ L'utilisateur cite des marques pédiatriques retirées/non renouvelées (vérifié en base nomenclature) : ${anchor.withdrawnHits
            .map((h) => `${h.brand} (${h.dci})`)
            .join(" ; ")} — préviens-le et propose les alternatives actives listées ci-dessus.`
        );
      }
      if (anchor.antalfenGynConfusion) {
        parts.push(
          "⚠️ ANTALFEN GYN (comprimé 100 mg) est du FLURBIPROFÈNE gynécologique, à ne pas confondre avec le sirop ANTALFEN (ibuprofène enfant)."
        );
      }
      pediatricAnchorBlock =
        `\n\nANCRE PÉDIATRIQUE (persiste sur TOUTE la conversation, même les relances qui ne répètent pas le poids) :\n` +
        parts.join("\n") +
        `\nUtilise ces valeurs pour chaque réponse ; ne recalcule qu'en cas de NOUVEAU poids/âge fourni.`;
    }

    // --- ground with registry data: search drugs matching the query
    let registryContext = "";
    try {
      const key = lastUser
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      if (key && key.length >= 3) {
        const matches = await db.drug.findMany({
          where: {
            OR: [
              { dciKey: { contains: key } },
              { brandKey: { contains: key } },
            ],
            status: "ACTIF",
          },
          orderBy: [{ dciKey: "asc" }],
          take: 8,
        });
        if (matches.length > 0) {
          registryContext =
            "\n\nExtraits du registre algérien (nomenclature officielle) correspondant à la question :\n" +
            matches
              .map(
                (m) =>
                  `- ${m.brand ?? "?"} — DCI: ${m.dci ?? "?"} | ${m.dosage ?? "?"} ${m.form ?? ""} | ${m.packaging ?? ""} | Lab: ${m.lab ?? "?"} (${m.country ?? "?"}) | Liste: ${m.liste ?? "—"} | AMM: ${m.regNumber ?? "?"}`
              )
              .join("\n");
        }
      }
    } catch (e) {
      console.error("[ai/chat] registry lookup failed", e);
    }

    /* 24-c — MODE ENFANT : change uniquement le STYLE d'explication.
       Les faits cliniques (doses, CI, mises en garde, ancre pédiatrique) et
       toutes les RÈGLES ci-dessous restent strictement inchangées. */
    const enfantPrompt =
      mode === "enfant"
        ? `\n\nMODE ENFANT : explique comme à un enfant de 6-8 ans — phrases courtes, mots simples, comparaisons du quotidien, maximum 4 phrases. TOUJOURS terminer par : 'Demande toujours à un adulte de vérifier tes médicaments.' Ne JAMAIS modifier les doses, CI ou données cliniques — même style plus simple, faits identiques. Les avertissements de sécurité restent obligatoires (simplifiés en langage enfant mais présents).`
        : "";

    // En mode enfant, la base reste le mode patient (public profane + rappel
    // de consulter un professionnel) — le bloc ENFANT précise le style.
    const baseModePrompt =
      mode === "pro"
        ? `MODE PRO: Réponds avec la densité technique attendue d'un professionnel (posologies, CI, interactions, surveillance biologique, recommandations ESC/OMS quand pertinent).`
        : `MODE PATIENT: Réponds en langage simple et accessible, évite le jargon technique, utilise des phrases courtes et rassurantes. Rappelle toujours de consulter un médecin ou pharmacien.`;

    const systemPrompt = `Tu es le Copilote Clinique de DzPharm, plateforme de référence pharmaceutique algérienne.

CONTEXTE: Tu assistes les professionnels de santé algériens (pharmaciens, médecins, étudiants) et les patients. Tu maîtrises:
- La nomenclature officielle algérienne des médicaments (AMM, DCI, marques commerciales locales)
- Les spécificités du marché: production locale (El Kendi, Biopharm, Saidal, Hikma...), importations, ruptures de stock
- Les listes (Liste I/II, Tableau A/B/C psychotropes), prescription sécurisée
- Le système de remboursement Chifa / CNAS / CASNOS
- Les 58 wilayas et les réalités cliniques algériennes

${baseModePrompt}${enfantPrompt}

LANGUES: Réponds dans la langue de l'utilisateur (français, arabe standard, darija algérienne ou anglais). Si la question est en darija ("شكون الدوا تاع السكر؟"), réponds en arabe/darija clair.

RÈGLES:
1. Sois précis, structuré et concis. Utilise le format Markdown (titres, listes, gras).
2. Pour toute question sur un médicament en Algérie, précise si possible: DCI, marques locales disponibles, statut (actif/retiré), liste de prescription.
3. Inclus les mises en garde de sécurité essentielles (grossesse, allaitement, pédiatrie, insuffisance rénale) quand pertinent.
4. Ne prescris jamais: oriente vers le professionnel de santé.
5. Si une donnée est incertaine, dis-le clairement plutôt que d'inventer.
6. JAMAIS de concentration/formulation inventée : n'énonce pas la concentration d'un sirop, de gouttes ou d'une forme locale sans la tenir du contexte « PRODUITS DU REGISTRE » ou de l'ANCRE PÉDIATRIQUE fournie. Sinon, demande à l'utilisateur de lire l'étiquette (mg/mL ou mg/5 mL) et montre le calcul avec une variable. Ne cite que des marques du registre algérien (pas de marques étrangères comme Dafalgan ou Doliprane France si absentes du contexte).
7. En pédiatrie, toute dose doit être exprimée en mg/kg puis convertie seulement si la concentration est fournie par l'utilisateur ou par l'ANCRE PÉDIATRIQUE.
8. Si une ANCRE PÉDIATRIQUE est fournie, ses valeurs priment : réutilise-les sur les questions de relance (« et en sirop ? », « combien de mL ? ») SANS redemander le poids déjà donné plus haut dans la conversation.${pediatricAnchorBlock}${registryContext}`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant" as const, content: systemPrompt },
        ...history.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: String(m.content).slice(0, 8000),
        })),
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Le copilote n'a pas pu générer de réponse. Réessayez." },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: content, mode });
  } catch (error) {
    console.error("[api/ai/chat]", error);
    return NextResponse.json(
      { error: "Erreur du service IA. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
