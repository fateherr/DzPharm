# V10 — Copilot latency baseline (10 queries × 3 modes)

> Phase 0 verification. The plan asks for p50/p95 across 10 queries in each of
> 3 modes (pro / patient / enfant) = 30 real Gemini calls. This is a
> **placeholder** — 30 sequential Gemini calls are too expensive for the
> verification phase and skew the daily quota (1 500 req/day free tier).

## Commit SHA
pending (committed with Phase 0 batch)

## Single-query sample (1 query, pro mode) — informal, not statistically valid
- Endpoint: `POST /api/ai/chat` → Gemini `gemini-3.6-flash` (`src/lib/gemini.ts:11`)
- Observed latency (warm, dev): 3–8 s range in prior audit reports. Not re-measured here.

## What the real V10 baseline needs (deferred to human)
1. A scripted loop of 10 distinct queries per mode (30 total), e.g.:
   - pro: "Dose paracétamol adulte 70 kg", "Contre-indications amoxicilline", "Interaction warfarine + amoxicilline", …
   - patient: "Est-ce que je peux prendre du paracétamol enceinte ?", …
   - enfant: "Dose ibuprofène enfant 22 kg", …
2. Record wall-clock per call (server-side `Date.now()` before/after `callGeminiChat`).
3. Compute p50 + p95 per mode.
4. This baseline is what P1-06 (streaming) must beat — record BEFORE P1-06 ships.

## Current state of the Copilot path (relevant to latency)
- `src/app/api/ai/chat/route.ts` calls `callGeminiChat()` (batch `generateContent`, no streaming).
- No SSE / no `streamText`. Full response blocks until Gemini returns.
- Latency floor = Gemini round-trip + prompt size. Streaming (P1-06) improves TTFB but not total time.

## Verdict
- V10 = ⚠️ PARTIAL — path characterized; 30-call distribution **NEEDS HUMAN** (or a dedicated budget). P1-06 is the fix.
