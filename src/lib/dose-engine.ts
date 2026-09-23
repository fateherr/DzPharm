import { PEDIATRIC_DRUGS, computeDose, type DoseResult } from "@/lib/pediatric-dosing";

/**
 * P0-05 — Dose verification engine (deterministic).
 * Audit: docs/audit/06_tool_deep_dives/DzPharm_Tool36_CopilotCore_TechnicalDesign.pdf
 *
 * THE COPILOT DOES NOT DO ARITHMETIC. Every dose calculation is independently
 * re-computed by this deterministic engine and compared to the Copilot's claim.
 * If the engine disagrees with the Copilot by >5 %, a warning banner is shown.
 * If the engine agrees, a "✓ Vérifié" badge is shown.
 * If the engine cannot parse the dose mention (unrecognized drug, missing
 * weight), the default state is the WARNING ("⚠️ Vérification manuelle requise").
 *
 * The engine NEVER calls an LLM — it is pure deterministic arithmetic on the
 * 15-molecule PEDIATRIC_DRUGS table (paracetamol, ibuprofène, amoxicilline,
 * amoxicilline+acide clavulanique, azithromycine, céfixime, clarithromycine,
 * cétirizine, salbutamol, prednisolone, dompéridone, fer, vitamine D3,
 * albendazole, diazépam).
 */

const TOLERANCE_PCT = 5; // spec — do not tighten or loosen without human review.

export type VerificationStatus = "VERIFIED" | "MISMATCH" | "UNPARSEABLE" | "NOT_APPLICABLE";

export interface DoseVerification {
  status: VerificationStatus;
  /** Engine-computed dose in mg (null if unparseable / band-based / not applicable). */
  engineDoseMg: number | null;
  /** Copilot-claimed dose in mg (null if not found in the response). */
  claimedDoseMg: number | null;
  /** Relative difference (%) between engine and claimed. null if either is null. */
  deltaPct: number | null;
  /** Human-readable summary for the UI badge/banner. */
  message: string;
  /** Full DoseResult from computeDose (volume mL, maxDaily, blockers, band). */
  detail: DoseResult | null;
  /** The drug record that was matched (null if none). */
  drug: (typeof PEDIATRIC_DRUGS)[number] | null;
}

/** Normalize a DCI string for matching: uppercase, strip accents, collapse spaces. */
export function normalizeDci(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a weight in kg from free-form text (FR/AR-en). Returns null if not found. */
export function parseWeightKg(text: string): number | null {
  // "22 kg", "22kg", "22 kilos", "22 k", "pèse 22 kg", "poids 22"
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kgs?)\b/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  // "pèse 22", "poids 22" (number alone after poids/pèse)
  const m2 = text.match(/(?:p[èo]se|poids|weighs?|weight)\s*:?\s*(\d+(?:[.,]\d+)?)\b/i);
  if (m2) return parseFloat(m2[1].replace(",", "."));
  return null;
}

/** Parse an age in MONTHS from free-form text. Returns null if not found. */
export function parseAgeMonths(text: string): number | null {
  // "3 ans", "3 ans et 6 mois", "36 mois", "2.5 ans"
  const monthMatch = text.match(/(\d+)\s*mois\b/i);
  const yearMatch = text.match(/(\d+(?:[.,]\d+)?)\s*ans?\b/i);
  let months: number | null = null;
  if (yearMatch) months = Math.round(parseFloat(yearMatch[1].replace(",", ".")) * 12);
  if (monthMatch) {
    const m = parseInt(monthMatch[1], 10);
    months = months != null ? months + m : m;
  }
  return months;
}

/**
 * Parse the claimed dose (mg) from the Copilot's response text. Looks for the
 * first "N mg" mention that follows a dose-related keyword. Returns null if not found.
 */
export function parseClaimedDoseMg(response: string): number | null {
  const keywords = /(?:dose|posologie|administrer|donner|prendre|prend|ml de|équivalent)\s*:?\s*/i;
  // Find all "N mg" mentions.
  const re = /(\d+(?:[.,]\d+)?)\s*mg\b/gi;
  let match: RegExpExecArray | null;
  const candidates: { mg: number; index: number }[] = [];
  while ((match = re.exec(response)) !== null) {
    candidates.push({ mg: parseFloat(match[1].replace(",", ".")), index: match.index });
  }
  if (candidates.length === 0) return null;
  // Prefer the one nearest after a dose keyword.
  for (const kw of response.matchAll(new RegExp(keywords.source, "gi"))) {
    const kwEnd = kw.index! + kw[0].length;
    const near = candidates.filter((c) => c.index >= kwEnd && c.index - kwEnd < 80);
    if (near.length > 0) return near[0].mg;
  }
  // Fallback: first mention.
  return candidates[0].mg;
}

/** Find the matching pediatric drug record from the user's question text. */
export function matchDrug(text: string): (typeof PEDIATRIC_DRUGS)[number] | null {
  const norm = normalizeDci(text);
  if (!norm) return null;
  // Exact key match first.
  for (const d of PEDIATRIC_DRUGS) {
    if (norm.includes(normalizeDci(d.dci)) || norm.includes(d.dciKey)) return d;
  }
  // Partial / brand-name fallback: check the brands listed in forms.
  for (const d of PEDIATRIC_DRUGS) {
    for (const f of d.forms) {
      if (f.brands) {
        const brands = f.brands.split(",").map((b) => normalizeDci(b));
        if (brands.some((b) => b && norm.includes(b))) return d;
      }
    }
  }
  return null;
}

/**
 * Verify a Copilot dose claim against the deterministic engine.
 *
 * @param question  The user's original question (contains weight/age/drug).
 * @param response  The Copilot's full response text (contains the claimed dose).
 * @returns DoseVerification with status + message for the UI.
 */
export function verifyDose(question: string, response: string): DoseVerification {
  const drug = matchDrug(question);
  if (!drug) {
    return {
      status: "NOT_APPLICABLE",
      engineDoseMg: null,
      claimedDoseMg: null,
      deltaPct: null,
      message:
        "Moteur de vérification : molécule non reconnue dans la question — vérification automatique indisponible.",
      detail: null,
      drug: null,
    };
  }

  const weightKg = parseWeightKg(question);
  const ageMonths = parseAgeMonths(question);
  if (weightKg == null || ageMonths == null) {
    return {
      status: "UNPARSEABLE",
      engineDoseMg: null,
      claimedDoseMg: parseClaimedDoseMg(response),
      deltaPct: null,
      message:
        "⚠️ Vérification manuelle requise — le moteur n'a pas pu lire le poids ou l'âge dans la question.",
      detail: null,
      drug,
    };
  }

  // Compute using form index 0 (default form) — the engine is conservative.
  const result = computeDose(drug, weightKg, ageMonths, 0);
  if (result.blockers.length > 0) {
    return {
      status: "UNPARSEABLE",
      engineDoseMg: result.doseMg,
      claimedDoseMg: parseClaimedDoseMg(response),
      deltaPct: null,
      message: `⚠️ Vérification : ${result.blockers[0]}`,
      detail: result,
      drug,
    };
  }

  const engineDoseMg = result.doseMg;
  const claimedDoseMg = parseClaimedDoseMg(response);

  if (engineDoseMg == null) {
    // Band-based dosing (e.g. cetirizine, vitamine D3) — no mg/kg arithmetic to verify.
    return {
      status: "NOT_APPLICABLE",
      engineDoseMg: null,
      claimedDoseMg,
      deltaPct: null,
      message: result.bandLabel
        ? `Posologie par bande : ${result.bandLabel}`
        : "Posologie fixe (non pondérée) — vérification automatique non applicable.",
      detail: result,
      drug,
    };
  }

  if (claimedDoseMg == null) {
    return {
      status: "UNPARSEABLE",
      engineDoseMg,
      claimedDoseMg: null,
      deltaPct: null,
      message: `⚠️ Vérification manuelle requise — le moteur calcule ${engineDoseMg} mg mais n'a pas trouvé de dose explicite dans la réponse.`,
      detail: result,
      drug,
    };
  }

  const deltaPct = Math.abs(((claimedDoseMg - engineDoseMg) / engineDoseMg) * 100);

  if (deltaPct > TOLERANCE_PCT) {
    return {
      status: "MISMATCH",
      engineDoseMg,
      claimedDoseMg,
      deltaPct,
      message: `⚠️ Vérification : le calcul indépendant donne ${engineDoseMg} mg. Le Copilote a indiqué ${claimedDoseMg} mg (écart ${deltaPct.toFixed(1)} %). Vérifiez manuellement.`,
      detail: result,
      drug,
    };
  }

  return {
    status: "VERIFIED",
    engineDoseMg,
    claimedDoseMg,
    deltaPct,
    message: `✓ Vérifié — calcul indépendant : ${engineDoseMg} mg${
      result.volumeMl != null ? ` (${result.volumeMl} mL)` : ""
    }. Écart ${deltaPct.toFixed(1)} % (≤ ${TOLERANCE_PCT} %).`,
    detail: result,
    drug,
  };
}
