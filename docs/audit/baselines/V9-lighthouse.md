# V9 — Performance baseline (mobile, 4G throttled, cold cache)

> Phase 0 verification. This baseline is a **placeholder** — the sandbox cannot run
> a real Lighthouse mobile/4G-throttled cold-cache measurement. The numbers below
> are warm-cache dev-mode timings from `dev.log` and are NOT a substitute for the
> real measurement the plan requires.

## Commit SHA
pending (committed with Phase 0 batch)

## Warm-cache dev-mode timings (from /home/z/my-project/dev.log, Next 16 Turbopack)
- `GET /` — 200 in 21–195 ms (compile 4–8 ms, render 17–187 ms) after first compile
- `GET /api/stats` — 200 in 22–1297 ms (first compile ~1 s, warm ~22–48 ms)
- `GET /api/drugs/top-views?limit=8` — 200 in 44–2100 ms (first compile ~0.9 s, warm ~16–790 ms)
- `GET /api/drugs?page=1&pageSize=20&sort=relevance` — 200 in 44–217 ms (warm)
- `GET /login` — 200 in 30–103 ms (warm)

## First-compile cost (cold)
- First `/` compile: 1.0–17 s (Turbopack dev). Production `next build` not run (per environment rules).
- First `/login` compile: 0.3–6 s.

## What the real V9 baseline needs (deferred to human)
1. Real Chrome on a real Android device, or Chrome DevTools mobile emulation + 4G throttle + cold cache.
2. Lighthouse run on `https://dzpharm.dz/` (production build, not dev).
3. Record: TTFB, FCP, LCP, TBT, CLS, transfer KB, JS heap MB.
4. Re-measure after every performance-affecting card (P0-01 routing, QW-01 webfonts, P1-06 streaming).

## Verdict
- V9 = ⚠️ PARTIAL — warm dev timings recorded; real mobile 4G cold-cache baseline **NEEDS HUMAN** (real device + production build).
- The audit bet ("both prior measurements were warm-edge EU, not real-Algeria-mobile") stands. Do not claim "top decile" until this is measured properly.
