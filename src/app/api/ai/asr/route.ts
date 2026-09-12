import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Garde anti-abus identique à /api/ai/chat : 20 requêtes / minute / IP. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** Taille maximale de l'audio décodé (~8 Mo). */
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/ai/asr — dictée vocale du Copilote
 * Body: { audio: string (base64), mimeType?: string }
 * Réponse: { text: string }
 * Le SDK est appelé côté serveur uniquement (jamais dans le client).
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`ai-asr:${clientIpFrom(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes — réessayez dans ${rl.retryAfterSec} s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    const rawAudio = typeof body?.audio === "string" ? body.audio : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "";

    if (!rawAudio) {
      return NextResponse.json({ error: "Aucun audio fourni" }, { status: 400 });
    }
    if (mimeType && !mimeType.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Format audio non supporté : ${mimeType}` },
        { status: 415 }
      );
    }

    // Tolérer un data-URL (« data:audio/webm;base64,… ») en entrée
    const b64 = rawAudio.startsWith("data:")
      ? rawAudio.slice(rawAudio.indexOf(",") + 1)
      : rawAudio;

    // Garde de taille AVANT décodage : ~4/3 chars base64 par octet
    if (b64.length > Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 4) {
      return NextResponse.json(
        { error: "Enregistrement trop volumineux (maximum ~8 Mo)" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(b64, "base64");
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Audio invalide (base64 vide)" }, { status: 400 });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Enregistrement trop volumineux (maximum ~8 Mo)" },
        { status: 413 }
      );
    }

    const zai = await ZAI.create();
    const transcription = await zai.audio.asr.create({ file_base64: b64 });

    const text = typeof transcription?.text === "string" ? transcription.text : "";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[api/ai/asr]", error);
    return NextResponse.json(
      { error: "Erreur du service de reconnaissance vocale. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
