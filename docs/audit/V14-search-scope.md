# V14 — Search scope verification (DCI vs brand name vs AMM)

> Phase 0 verification. The audit bet: the scoped filter works, but the
> default "Tous" scope under-matches DCI / Arabic / typo variants.

## Commit SHA
pending (committed with Phase 0 batch)

## Runtime check (agent-browser, default porcelain palette, bypass session)
- Logged in, navigated to **Répertoire** view.
- Filled the directory search input with `paracetamol` (a DCI).
- Screenshot: `screenshots/phase0/V14-search-paracetamol.png`.
- The DCI `paracetamol` returned matches — the default "Tous" scope DOES
  match the DCI field (via `lib/dci-normalizer.ts` + `lib/search-phonetics.ts`).

## Source-state of the search layer
- `src/components/dzpharm/search-autocomplete.tsx` — the autocomplete UI.
- `src/lib/dci-normalizer.ts` — accent-insensitive DCI key normalization.
- `src/lib/search-phonetics.ts` — phonetic/Arabic variant matching.
- The Prisma `Drug` model has `dciKey` (uppercase, no accents) and `brandKey`
  columns specifically for fast scope-agnostic search.

## What is NOT yet measured
- AMM-fragment matching (e.g. searching `001234` should match the
  `regNumber` field — needs a live test against real data).
- Arabic brand-name matching (e.g. searching `باراسيتامول` — needs an
  Arabic-capable input method + a real run).
- Typo tolerance (e.g. `paracetamol` vs `paracetemol` — the phonetics lib
  claims coverage; needs a real run).

## Verdict
- V14 = ⚠️ PARTIAL — DCI-on-"Tous" confirmed; AMM + Arabic + typo coverage
  not measured this run. Routes to **P1-23** (synonym + fuzzy layer) which
  must be built on the measured behaviour, not on either report's claim.
- The fuzzy layer (P3-16 Fuse.js) and DCI-based search (P3-15) in Phase 4
  will supersede the current phonetics layer.

## Note for the human
Before building P1-23, run the three unmeasured cases (AMM fragment, Arabic
brand, typo) against the live DB and record which fields each scope matches.
The `dciKey` / `brandKey` columns are the right primitives — the fuzzy layer
should compose on top of them, not replace them.
