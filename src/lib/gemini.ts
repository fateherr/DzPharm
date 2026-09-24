/**
 * gemini.ts — Thin wrapper around Google Generative AI REST API.
 * Uses gemini-2.0-flash-lite (free tier: 1 500 req/day, 1 M tokens/day).
 * Requires GEMINI_API_KEY environment variable.
 */

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Default model — falls back to valid Gemini 2.5 Flash if unconfigured or invalid */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Pro model — same model for this API tier */
export const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-flash";

/** P1-15 — Canonical UI label for the deployed model (single source of truth). */
export const GEMINI_MODEL_LABEL = "Gemini 3.6 Flash";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiOptions {
  /** Sampling temperature (0 = deterministic). Default: 0.2 */
  temperature?: number;
  /** Max output tokens. Default: 4096 */
  maxOutputTokens?: number;
  /** Model override. Default: GEMINI_MODEL */
  model?: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/**
 * Call Gemini with a system instruction + conversation history.
 * Returns the generated text content.
 */
export async function callGemini(
  systemInstruction: string,
  messages: GeminiMessage[],
  options: GeminiOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY environment variable is not set. Add it in Vercel Settings → Environment Variables."
    );
  }

  const model = options.model ?? GEMINI_MODEL;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: messages,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok && (res.status === 503 || res.status === 429) && model !== "gemini-3.6-flash") {
    // Retry once with fallback model gemini-3.6-flash during temporary spikes
    const fallbackUrl = `${GEMINI_API_BASE}/gemini-3.6-flash:generateContent?key=${apiKey}`;
    res = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new GeminiError(
      `Gemini API error ${res.status}: ${res.statusText}`,
      res.status,
      errBody
    );
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new GeminiError(`Gemini error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new GeminiError("Gemini returned an empty response.");
  }

  return text;
}

/**
 * Convenience helper: single-turn chat with a system prompt.
 * Converts simple OpenAI-style messages to Gemini format.
 */
export async function callGeminiChat(
  systemInstruction: string,
  history: { role: "user" | "assistant"; content: string }[],
  options: GeminiOptions = {}
): Promise<string> {
  // Gemini requires alternating user/model turns starting with user
  const messages: GeminiMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Ensure conversation starts with a user turn
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", parts: [{ text: "." }] });
  }

  return callGemini(systemInstruction, messages, options);
}

/**
 * P1-06 — Streaming variant of callGeminiChat using Gemini REST SSE endpoint.
 */
export async function* callGeminiChatStream(
  systemInstruction: string,
  history: { role: "user" | "assistant"; content: string }[],
  options: GeminiOptions = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY non configuré");
  }

  const messages: GeminiMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", parts: [{ text: "." }] });
  }

  const model = options.model ?? GEMINI_MODEL;
  const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: messages,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new GeminiError(
      `Gemini API error ${res.status}: ${res.statusText}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const chunk = JSON.parse(jsonStr);
          const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string" && text.length > 0) {
            yield text;
          }
        } catch {
          // Partial JSON
        }
      }
    }
    if (buffer.trim().startsWith("data:")) {
      try {
        const jsonStr = buffer.trim().slice(5).trim();
        const chunk = JSON.parse(jsonStr);
        const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.length > 0) {
          yield text;
        }
      } catch {}
    }
  } finally {
    reader.releaseLock();
  }
}
