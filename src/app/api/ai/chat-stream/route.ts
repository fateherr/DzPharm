import { NextRequest, NextResponse } from "next/server";
import { callGeminiChatStream, GeminiError, GEMINI_MODEL } from "@/lib/gemini";

/**
 * P1-06 — Streaming Copilot chat route (SSE).
 * Audit: docs/audit/06_tool_deep_dives/DzPharm_Tool36_CopilotCore_TechnicalDesign.pdf §05
 *
 * Additive parallel path to /api/ai/chat (batch). Streams the Gemini response
 * token-by-token via Server-Sent Events. Gated on
 * NEXT_PUBLIC_FEATURE_COPILOT_STREAM — when off, the client falls back to the
 * batch route.
 *
 * SSE protocol:
 *   data: {"delta":"..."}\n\n   — a text delta (concatenate to get the full response)
 *   data: {"done":true}\n\n     — stream complete
 *   data: {"error":"..."}\n\n   — error (terminal)
 *
 * The system prompt is a minimal but mode-aware version (reuses the P1-11
 * MODE_PROMPTS structure). The full prompt-construction logic (registry
 * context, pediatric anchor, safety rules) lives in /api/ai/chat/route.ts —
 * extracting it to a shared helper is a follow-up refactor (deferred per
 * Rule R6 additive-only).
 */
export const runtime = "nodejs";

function buildModePrompt(mode: "pro" | "patient" | "enfant") {
  if (mode === "patient") {
    return `MODE PATIENT (grand public): Tu parles à un patient ou un proche — PAS à un professionnel de santé.
- LANGAGE : mots simples, phrases courtes (max 15 mots), aucun jargon médical.
- NOMS : utilise le NOM DE MARQUE (DOLIPRANE) en premier ; ne donne la DCI qu'entre parenthèses.
- DOSES : ne fais JAMAIS de calcul mg/kg. Réponds « la dose dépend du poids et de l'âge — demande à ton pharmacien ».
- CONTENU : (1) à quoi sert le médicament, (2) comment le prendre, (3) effets indésirables fréquents, (4) quand consulter en urgence, (5) que faire si on oublit une prise.
- RASSURANT : commence par « Oui » ou « Non ». Termine par « En cas de doute, demandez à votre pharmacien. »`;
  }
  if (mode === "enfant") {
    return `MODE ENFANT : explique comme à un enfant de 6-8 ans — phrases courtes, mots simples, comparaisons du quotidien, maximum 4 phrases. TOUJOURS terminer par : 'Demande toujours à un adulte de vérifier tes médicaments.'`;
  }
  return `MODE PRO: Réponds avec la densité technique attendue d'un professionnel (posologies, CI, interactions, surveillance biologique, recommandations ESC/OMS quand pertinent).`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Aucun message fourni" },
        { status: 400 },
      );
    }

    const mode: "pro" | "patient" | "enfant" =
      body?.mode === "patient"
        ? "patient"
        : body?.mode === "enfant"
          ? "enfant"
          : "pro";

    const history = body.messages
      .filter(
        (m: { role?: string; content?: unknown }) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: String(m.content).slice(0, 8000),
      }));

    const systemPrompt = `Tu es le Copilote Clinique de DzPharm, plateforme de référence pharmaceutique algérienne. Tu maîtrises la nomenclature officielle algérienne des médicaments (AMM, DCI, marques commerciales locales), les spécificités du marché (production locale El Kendi/Biopharm/Saidal/Hikma, importations, ruptures), les listes (Liste I/II, Tableau A/B/C), et le système de remboursement Chifa/CNAS/CASNOS.

${buildModePrompt(mode)}

LANGUES: Réponds dans la langue de l'utilisateur (français, arabe standard, darija algérienne ou anglais).

RÈGLES:
1. Sois précis, structuré et concis. Utilise le format Markdown.
2. Inclus les mises en garde de sécurité essentielles (grossesse, allaitement, pédiatrie, insuffisance rénale) quand pertinent.
3. Ne prescris jamais: oriente vers le professionnel de santé.
4. Si une donnée est incertaine, dis-le clairement plutôt que d'inventer.
5. JAMAIS de concentration/formulation inventée.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of callGeminiChatStream(
            systemPrompt,
            history,
            { temperature: 0.2, model: GEMINI_MODEL },
          )) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ delta })}\n\n`,
              ),
            );
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
          );
        } catch (err) {
          const message =
            err instanceof GeminiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Erreur inconnue";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur du service IA";
    return NextResponse.json(
      { error: "Erreur du service IA. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
