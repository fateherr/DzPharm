import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

/** Garde anti-abus identique à /api/ai/chat : 20 requêtes / minute / IP. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** Limite applicative (côté DzPharm) : lecture d'une réponse du copilote. */
const MAX_TEXT_CHARS = 1500;
/** Limite dure de l'API TTS : 1024 caractères par requête — d'où le découpage. */
const SDK_MAX_CHARS = 1024;
/** Marge sur la limite SDK pour couper proprement entre phrases. */
const CHUNK_MAX_CHARS = 1000;

/**
 * Voix « xiaochen » (posée et professionnelle) du catalogue SDK —
 * aucune voix n'est explicitement francophone dans la liste
 * (tongtong, chuichui, xiaochen, jam, kazi, douji, luodo) ; on retient
 * la plus adaptée à un contenu médical lu en français.
 */
const TTS_VOICE = "xiaochen";
/** Débit modéré (plage SDK : 0.5–2.0). */
const TTS_SPEED = 1.0;

/**
 * Découpe aux frontières de phrases (cf. doc TTS « splitTextIntoChunks ») ;
 * une phrase isolée plus longue que la limite est coupée franchement.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence;
      continue;
    }
    if (current.trim()) chunks.push(current.trim());
    if (sentence.length > maxLength) {
      for (let i = 0; i < sentence.length; i += maxLength) {
        chunks.push(sentence.slice(i, i + maxLength).trim());
      }
      current = "";
    } else {
      current = sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

interface WavInfo {
  /** Bloc « fmt » brut (16 octets canoniques). */
  fmt: Buffer;
  /** Charge utile PCM du bloc « data ». */
  data: Buffer;
}

/**
 * Parse un WAV RIFF en parcourant ses chunks (le service insère un bloc
 * « AIGC » entre fmt et data, on ne peut donc pas supposer 44 octets).
 */
function parseWav(buf: Buffer): WavInfo {
  const ascii = (off: number, len: number) =>
    buf.toString("ascii", off, off + len);
  if (buf.length < 12 || ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WAVE") {
    throw new Error("Format WAV inattendu du service TTS (en-tête RIFF absent)");
  }
  let fmt: Buffer | null = null;
  let data: Buffer | null = null;
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = ascii(off, 4);
    const size = buf.readUInt32LE(off + 4);
    const payloadStart = off + 8;
    if (payloadStart + size > buf.length) break;
    if (id === "fmt " && size >= 16) fmt = buf.subarray(payloadStart, payloadStart + 16);
    else if (id === "data") data = buf.subarray(payloadStart, payloadStart + size);
    off = payloadStart + size + (size % 2); // les chunks RIFF sont alignés sur 2 octets
  }
  if (!fmt || !data) {
    throw new Error("Format WAV inattendu du service TTS (fmt/data introuvables)");
  }
  return { fmt, data };
}

/** Fusionne plusieurs WAV PCM identiques en un seul fichier WAV canonique. */
function mergeWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  const infos = buffers.map(parseWav);
  const ref = infos[0].fmt.toString("hex");
  for (const info of infos.slice(1)) {
    if (info.fmt.toString("hex") !== ref) {
      throw new Error("Chunks TTS de formats WAV hétérogènes");
    }
  }
  const totalData = infos.reduce((sum, info) => sum + info.data.length, 0);
  const channels = infos[0].fmt.readUInt16LE(2);
  const sampleRate = infos[0].fmt.readUInt32LE(4);
  const bitsPerSample = infos[0].fmt.readUInt16LE(14);
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const out = Buffer.alloc(44 + totalData);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + totalData, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16);
  infos[0].fmt.copy(out, 20);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(totalData, 40);
  void byteRate; // information seulement (le bloc fmt copié fait foi)
  let off = 44;
  for (const info of infos) {
    info.data.copy(out, off);
    off += info.data.length;
  }
  return out;
}

/**
 * POST /api/ai/tts — lecture à voix haute d'une réponse du Copilote
 * Body: { text: string }
 * Réponse: { audio: string (base64), mimeType: "audio/wav" }
 *
 * L'API du SDK n'accepte pas « mp3 » sur ce déploiement (erreur 1214) :
 * on demande du WAV non streamé. Un texte > 1024 caractères est découpé
 * en plusieurs appels, puis les WAV sont fusionnés (chunks RIFF séparés
 * → un seul en-tête + données PCM concaténées).
 * Le SDK est appelé côté serveur uniquement (jamais dans le client).
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`ai-tts:${clientIpFrom(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes — réessayez dans ${rl.retryAfterSec} s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    const rawText = typeof body?.text === "string" ? body.text : "";
    const text = rawText.replace(/\s+/g, " ").trim();

    if (!text) {
      return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: "Texte trop long — la lecture audio est limitée à 1500 caractères." },
        { status: 400 }
      );
    }

    const chunks =
      text.length <= SDK_MAX_CHARS ? [text] : splitTextIntoChunks(text, CHUNK_MAX_CHARS);

    const zai = await ZAI.create();
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const response = await zai.audio.tts.create({
        input: chunk,
        voice: TTS_VOICE,
        speed: TTS_SPEED,
        response_format: "wav",
        stream: false,
      });
      // Le SDK renvoie un Response standard → arrayBuffer() (pas response.audio)
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      if (buffer.length === 0) {
        throw new Error("Réponse TTS vide pour un chunk");
      }
      buffers.push(buffer);
    }

    const audio = mergeWavBuffers(buffers);
    return NextResponse.json({ audio: audio.toString("base64"), mimeType: "audio/wav" });
  } catch (error) {
    console.error("[api/ai/tts]", error);
    return NextResponse.json(
      { error: "Erreur du service de synthèse vocale. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
