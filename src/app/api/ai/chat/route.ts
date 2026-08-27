import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export const maxDuration = 120;

/**
 * POST /api/ai/chat — DzPharm Copilote Clinique
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], mode?: 'pro' | 'patient' }
 * The assistant is grounded with live registry data (matching drugs from SQLite).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const messages: { role: string; content: string }[] = Array.isArray(body?.messages)
      ? body.messages.filter((m: { role?: string; content?: string }) => m?.content)
      : [];
    const mode: "pro" | "patient" = body?.mode === "patient" ? "patient" : "pro";

    if (messages.length === 0) {
      return NextResponse.json({ error: "Aucun message fourni" }, { status: 400 });
    }
    // keep last 16 messages for context
    const history = messages.slice(-16);
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

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

    const systemPrompt = `Tu es le Copilote Clinique de DzPharm, plateforme de référence pharmaceutique algérienne.

CONTEXTE: Tu assistes les professionnels de santé algériens (pharmaciens, médecins, étudiants) et les patients. Tu maîtrises:
- La nomenclature officielle algérienne des médicaments (AMM, DCI, marques commerciales locales)
- Les spécificités du marché: production locale (El Kendi, Biopharm, Saidal, Hikma...), importations, ruptures de stock
- Les listes (Liste I/II, Tableau A/B/C psychotropes), prescription sécurisée
- Le système de remboursement Chifa / CNAS / CASNOS
- Les 58 wilayas et les réalités cliniques algériennes

${mode === "patient" ? `MODE PATIENT: Réponds en langage simple et accessible, évite le jargon technique, utilise des phrases courtes et rassurantes. Rappelle toujours de consulter un médecin ou pharmacien.` : `MODE PRO: Réponds avec la densité technique attendue d'un professionnel (posologies, CI, interactions, surveillance biologique, recommandations ESC/OMS quand pertinent).`}

LANGUES: Réponds dans la langue de l'utilisateur (français, arabe standard, darija algérienne ou anglais). Si la question est en darija ("شكون الدوا تاع السكر؟"), réponds en arabe/darija clair.

RÈGLES:
1. Sois précis, structuré et concis. Utilise le format Markdown (titres, listes, gras).
2. Pour toute question sur un médicament en Algérie, précise si possible: DCI, marques locales disponibles, statut (actif/retiré), liste de prescription.
3. Inclus les mises en garde de sécurité essentielles (grossesse, allaitement, pédiatrie, insuffisance rénale) quand pertinent.
4. Ne prescris jamais: oriente vers le professionnel de santé.
5. Si une donnée est incertaine, dis-le clairement plutôt que d'inventer.${registryContext}`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...history.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
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
