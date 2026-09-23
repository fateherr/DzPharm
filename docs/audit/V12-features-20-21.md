# V12 — Features #20 / #21 audit-gap reconciliation

> Phase 0 verification (governance debt). The audit plan references a "review
> menu" of 68 numbered tools/items. Items #20 and #21 were flagged as
> "unbuilt or shipped-and-unaudited". This file reconciles each against the
> shipped product under `src/components/dzpharm/`.

## Source
- Plan: `02_plans/DzPharm_THE_FINAL_EXECUTION_PLAN.pdf` p.4 (V12).
- The 68-item review menu is enumerated across the tool deep-dive reports in
  `06_tool_deep_dives/` (Tool01–Tool68). Items #20 and #21 are NOT
  individually named in the v3 plan PDF body — they are positional IDs in the
  original audit's tool register.

## Reconciliation
- **#20** — positional ID in the original audit's tool register. Per the
  RESEARCH-1 cross-cut of the deep-dive folder, the register's #20 slot
  corresponds to **"Search Autocomplete / DCI normalizer"** (the
  `search-autocomplete.tsx` + `lib/dci-normalizer.ts` + `lib/search-phonetics.ts`
  trio). **Verdict: BUILT** — present and wired into the Répertoire view.
  Audit gap = it was shipped but never re-audited against the v3 plan; the
  V14 (search scope) verify-first card now covers it.
- **#21** — positional ID. Per the same cross-cut, #21 corresponds to
  **"Recently-viewed cap + dedup"** (the `pushRecent()` action in
  `src/components/dzpharm/store.ts:273-279`). **Verdict: BUILT** — present,
  dedups before capping at `MAX_RECENT = 8`. Audit gap = the original report
  (#2) hit a dedup-order bug; the V6 verify-first card re-checks it and
  finds the dedup-then-cap order correct.

## Verdict
- V12 = ✅ PARTIAL — both items are BUILT (not unbuilt). The "audit gap" is a
  **governance** gap (shipped without a v3 re-audit), not a delivery gap.
  Routes to P2-41 (governance debt — close the audit register against the
  shipped product) for the remaining 66 items.

## Note for the human
The v3 plan's "review menu" framing assumes the human has the original audit's
68-item register open. If that register is not available, the safest
reconciliation is the one above (positional IDs → the named tools in the
deep-dive folder). Confirm the ID-to-name mapping against the original audit
before closing P2-41.
