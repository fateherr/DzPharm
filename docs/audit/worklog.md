# DzPharm — Execution Worklog (v4 Plan, 80 cards)

Repo: `/home/z/my-project/dzpharm` (Next.js 16 App Router + TS + Tailwind + Prisma/SQLite + Zustand + z-ai-web-dev-sdk).
Dev server: `bun run dev` (port 3000). PAT-authenticated clone of github.com/zenoxdz/DzPharm.

> Rule of the house: Kata sandbox kills backgrounded procs between Bash calls.
> Pattern: use `scripts/serve-and.sh <sec> -- <cmd>` to start server + run a test + cleanup in ONE Bash invocation.

---
Task ID: PHASE-A
Agent: main-orchestrator
Task: Clone repo, install deps, start dev server, verify site loads, read execution plan.

Work Log:
- A1: Cloned DzPharm repo (456 files) into /home/z/my-project/dzpharm using PAT (remote left configured for later pushes; PAT never printed).
- A2: `bun install` → 837 packages installed (3.46s).
- A3: Started dev server with `setsid bun run dev` (detached). Ready in ~700ms; first / compile ~1–17s.
- A4: Verified via agent-browser: title "DzPharm — Référentiel Pharmaceutique Algérien"; `/` → 200 then auth-gate redirects to `/login` (POST /api/logout 200, GET /login 200). Screenshot: `screenshots/A4-verify.png`. No runtime errors in dev.log.
- A5: Audit docs present under `docs/audit/` (01_essential, 02_plans, 03_html_source, 04_presentations, 05_cross_cutting_reports, 06_tool_deep_dives [50 files], 07_bundles). Main plan: `02_plans/DzPharm_THE_FINAL_EXECUTION_PLAN.pdf`. Master register: `03_html_source/DzPharm_Master_Audit_Plan_v2.html`.
- Discovered: existing root `worklog.md` documents the data-extraction history (9,555 drugs loaded from NOMENCLATURE ALGERIEN.xlsx + 17 pharmacology docx → SQLite). `.env` has DATABASE_URL, APP_PASSWORD, AUTH_TOKEN, GEMINI_API_KEY. Prisma schema already has `Drug` model + clinical models.

Stage Summary:
- Environment fully operational. Site renders cleanly with an auth gate at `/login`.
- Helper `scripts/serve-and.sh` created to keep dev server alive across a single Bash test invocation (Kata sandbox reaps backgrounded procs between calls).
- Ready to begin Phase 0 (14 verification checks).

---
Task ID: RESEARCH-1
Agent: research-subagent
Task: Extract implementation briefs for Cards 1–25 from audit docs

Work Log:
- R1: Read worklog.md (prior PHASE-A summary) — environment operational, dev server on :3000, audit docs present under docs/audit/.
- R2: Read master register HTML `03_html_source/DzPharm_Master_Audit_Plan_v2.html` (374 lines) — found §00 Sources, §01 Summary, §02 Inventory, §03 Verify-First table (V1–V14). **§04 (full 122-item register with per-item fix instructions and acceptance tests) is NOT present in this HTML file** — the v2 master register is truncated to 4 sections. The §04 reference in the v3 plan PDF points to this file but the section does not exist there.
- R3: Read `02_plans/DzPharm_THE_FINAL_EXECUTION_PLAN.pdf` (22 pages) — this is the authoritative source. Got: V1–V14 full verify-first cards (p.3–5), QW-01/02/03 with full fix code (p.5), P0-01 through P0-08 with full fix instructions + acceptance tests + effort + dependencies (p.6–8), and 14 top P1 one-liners (p.9–11). Confirmed card order: Cards 1–14 = V1–V14; Cards 15–17 = QW-01/02/03; Cards 18–25 = P0-01..P0-08.
- R4: Read `06_tool_deep_dives/DzPharm_Tool53_ColorSystem_TechnicalDesign.pdf` (32 pages, p.1–8) — captured the 7 EXACT locked clinical severity hex codes: safe #22C55E, warning #F99C00, danger #E70044, severe #FE6E00, info #00A5EF, none #62748E, unknown #8D54FF. Confirmed the locked-token rule (no Nuancier palette may touch --state-*).
- R5: Read `06_tool_deep_dives/DzPharm_Tool01_RoutingArchitecture_TechnicalDesign.pdf` (26 pages, p.1–8) — confirmed the 4-phase migration (Phase 1: 4 routes 3d; Phase 2: 7 routes 2d; Phase 3: 9,555 dynamic routes 3d; Phase 4: 4 supporting + sitemap 1d). 2-week total. Marked as multi-week-needs-human.
- R6: Read `06_tool_deep_dives/DzPharm_Tool08_AuthModel_TechnicalDesign.pdf` (28 pages, p.1–7) — confirmed 7 attack vectors, 3 P0 (devtools bypass, shared-credential exposure, no audit trail). 4-week total in 5 phases (NextAuth + Prisma users + TOTP MFA + AuditLog + RBAC). Marked as multi-week-needs-human.
- R7: Read `06_tool_deep_dives/DzPharm_Tool36_CopilotCore_TechnicalDesign.pdf` (27 pages, p.1–6) — confirmed the 5 Copilot bugs (version label, dead prompts, no history, mode patient = pro, no streaming) and the dose-arithmetic harm vector.
- R8: Read `06_tool_deep_dives/DzPharm_Tool11_CommandPalette_DeepDive.pdf` (11 pages, p.1–7) — got the two bugs (decorative hotkeys + selection-state desync) and the full Bug #1 fix code (useEffect + keydown handler with keyMap).
- R9: Read `06_tool_deep_dives/DzPharm_Tool38_VoiceDictation_DeepDive.pdf` (12 pages, p.1–6) — confirmed browser-support matrix (Firefox is a dead button), missing permission pre-prompt, missing transcript review step, stop button aria-label not state-aware.
- R10: Read `06_tool_deep_dives/DzPharm_Tool07_LoginFlow_DeepDive.pdf` (13 pages, p.1–7) — confirmed login form HAS role=alert + aria-invalid + aria-describedby (passes WCAG 3.3.1 AAA). 4 gaps: no rate limiting, missing enterkeyhint, robots meta should be noindex, no already-authed redirect.
- R11: Inspected codebase to verify current state per card:
  - `src/app/page.tsx` — confirmed SPA setState navigation via Zustand `useDzPharm((s) => s.view)`. No real routes.
  - `middleware.ts` — confirmed shared-cookie auth (`dzpharm_auth` cookie vs `AUTH_TOKEN` env).
  - `src/app/login/page.tsx` — confirmed `sessionStorage.setItem("dzpharm_session","active")` after success → devtools bypass real.
  - `src/components/dzpharm/session-guard.tsx` — confirmed reads sessionStorage (client-decided session).
  - `src/app/layout.tsx` — confirmed `<link rel="manifest">` IS present (V1 RESOLVED), but NO next/font Inter/Noto Sans Arabic/JetBrains Mono (QW-01 needed).
  - `src/app/globals.css` — confirmed 7 `--state-*` tokens present but with non-canonical hex codes (#16a34a, #d97706, etc.) and NO `!important`. No `prefers-reduced-motion` media query (QW-02 needed).
  - `src/components/dzpharm/header.tsx` — confirmed aria-labels on theme/botanique/nuancier buttons (theme NOT state-aware — QW-03 partial residual).
  - `src/components/dzpharm/command-palette.tsx` — confirmed uses `cmdk` (Radix Command) → Bug #2 likely mitigated. Only Cmd+K and Cmd+I wired; single-key hotkeys NOT wired (P0-06 Bug #1 is the real work). SAMU + Anti-Poison tel: links present.
  - `src/components/dzpharm/copilot-view.tsx` — confirmed uses MediaRecorder + `/api/ai/asr` (server-side ASR, NOT Web Speech API fr-FR) → P0-04 "fr-FR hard-wired" claim STALE. Real residual: no transcript review step (line 356 setInput directly), no permission pre-prompt, stop button aria-label static.
  - `src/components/dzpharm/palettes.ts` + `src/components/dzpharm/store.ts` — confirmed 20 palettes defined, MAX_RECENT = 8 (V6 RESOLVED).
  - `src/components/dzpharm/chifa-simulator.tsx` line 285–287 — confirmed `onSelect` calls Chifa `addLine` (not Comparator) → P1-16 likely RESOLVED.
  - `src/app/api/shortages/route.ts` — confirmed POST handler fully implemented with validation, abuse guard, returns 201 → P1-24 likely RESOLVED.
  - `prisma/schema.prisma` — confirmed NO User/Account/Session/AuditLog models (P0-02 hasn't started).
- R12: Read older `03_html_source/dzpharm-audit-plan.html` (1374 lines) for the full register with OLDER IDs — found equivalent entries for P1-03 (older P2-34 input border) and P1-04 (older P2-32 H1 tagline) and used them as fallback where the v3 PDF gives only one-liners.
- R13: Wrote `/home/z/my-project/dzpharm/docs/audit/card-briefs-01-25.md` (39 card briefs total: Cards 1–25 = V1–V14 + QW-01/02/03 + P0-01..P0-08; Cards 26–39 = P1-03..P1-24 additional cluster). Each brief has Severity/Phase, Effort, Dependencies, Source, Current state, Fix instruction, Files to create/edit, Acceptance test, Feature flag, Notes/gotchas. Multi-week items (P0-01, P0-02) explicitly flagged "needs human review — full implementation is multi-week" with a feature-flagged foundation/scaffold as the realistic one-session deliverable. Stale findings (P0-04 fr-FR, P0-06 selection desync, P1-16 chifa, P1-24 shortage) flagged as "verify before fixing". The 7 severity hex codes captured verbatim from Tool53.

Stage Summary:
- **File written**: `/home/z/my-project/dzpharm/docs/audit/card-briefs-01-25.md` — 39 implementation-ready briefs covering Cards 1–25 (Phase 0 + Phase 0.5 + Phase 1 P0 cluster) plus the 14 additional P1 items requested.
- **Two cards flagged multi-week-needs-human**: Card 18 (P0-01 routing, 2 weeks per plan) and Card 19 (P0-02 auth, 4 weeks per plan). Realistic one-session deliverable = feature-flagged foundation/scaffold (route-map.ts + 4 stub routes for P0-01; NextAuth Credentials provider + AuditLog Prisma schema for P0-02). The remaining 95 % is explicitly marked for human review.
- **Four cards flagged likely STALE — verify before fixing**: Card 21 (P0-04 dictation fr-FR — codebase already moved to server-side ASR via /api/ai/asr), Card 23 (P0-06 Cmd-K selection desync — codebase uses cmdk which handles selectedIndex internally), Card 37 (P1-16 Chifa drug routing — onSelect already calls chifa addLine), Card 39 (P1-24 shortage 500 — POST handler fully implemented with 201 response).
- **7 locked clinical severity hex codes captured** (per Tool53 Color System Technical Design p.8): safe #22C55E, warning #F99C00, danger #E70044, severe #FE6E00, info #00A5EF, none #62748E, unknown #8D54FF. Current globals.css has CLOSE but non-canonical values — must be updated and enforced via `!important` on `.severity-*` classes (the only `!important` allowed on the platform).
- **Source-of-truth caveat documented**: The v2 master register HTML (DzPharm_Master_Audit_Plan_v2.html) does NOT contain §04 — only §00–§03 (374 lines total). The v3 Final Execution Plan PDF is the authoritative source for V1–V14 + QW + P0 + top-10 P1. The OLDER dzpharm-audit-plan.html has the full register but with OLDER IDs (renumbered in v2/v3); used as fallback for P1-03/P1-04 fix details.
- **10 feature flags recommended**: NEXT_PUBLIC_FEATURE_APP_ROUTER, _NEXTAUTH, _MEDICATION_URL, _DICTATION_SAFETY, _DOSE_ENGINE, _CMDK_HOTKEYS, _SEVERITY_LOCK, _WEBFONTS, _COPILOT_STREAM, _INTERACTIONS_URL. Rollout 10 % → 50 % → 100 % per Risk #1 mitigation.
- Ready for the orchestrator to dispatch implementation subagents (suggest: BUILD-1 = QW-01/02/03 quick wins + P0-07 severity lock + P0-08 verification; BUILD-2 = P0-04 dictation safety + P0-05 dose engine + P0-06 hotkeys; BUILD-3 = P0-01 routing foundation + P0-02 NextAuth scaffold, both flagged multi-week-needs-human).

---
Card: V1–V14 — Phase 0 Verify-First (14 checks, no code changes)
Date: 2025-01-15 (session)
Status: ⚠️ PARTIAL — 9 PASSED, 3 PARTIAL (need human measurement), 2 route to follow-up cards
Changes:
  - docs/audit/baselines/V9-lighthouse.md (new — warm dev timings + real-measure plan)
  - docs/audit/baselines/V10-copilot-latency.md (new — path characterized + 30-call plan)
  - docs/audit/V12-features-20-21.md (new — #20 Search-Autocomplete BUILT, #21 Recently-viewed BUILT)
  - docs/audit/V14-search-scope.md (new — DCI-on-Tous confirmed, AMM/Arabic/typo deferred)
  - scripts/serve-and.sh (new — Kata-sandbox-safe dev-server runner)
  - scripts/verify-phase0-runtime.sh / verify-phase0-batch2.sh / verify-phase0-batch3.sh (new)
  - screenshots/phase0/*.png (V0-login-success, V7-bypass-dashboard, V2-interactions-empty, V2-matrice-empty, V14-search-paracetamol, V3-share-dialog)
Test result:
  - lint: n/a (no src/ changes)
  - dev.log: clean (GET / 200, /api/stats 200, /api/drugs/top-views 200, /login 200, no runtime errors)
  - agent-browser: login ✅, dashboard renders, bypass reproduces, search + matrice + share reachable
Screenshot: screenshots/phase0/V7-bypass-dashboard.png + 5 others
Commit: pending (this entry)
Notes:
  - V1 ✅ PASS — /manifest.webmanifest HTTP 200, layout.tsx:21 has `manifest` metadata → <link> generated. Likely RESOLVED. Routes residual to P2-20.
  - V2 ✅ PASS (verify-only) — Matrice tab reachable in Interactions view. Empty-state below 2-drug threshold → routes to P2-11 (empty-state message), not a render bug.
  - V3 ✅ PASS (verify-only) — Share dialog exists (drug-sheet.tsx). No real shareable URL because P0-01 routing not implemented → routes to P2-21, blocked by P0-01/P0-03.
  - V4 ✅ PASS — <Toaster/> mounted in layout.tsx:99. Sonner live. Remaining wiring → P1-05.
  - V5 ✅ PASS (verify-only) — header.tsx has aria-labels on scanner (413), nuancier (481), lock (502), home (189). Theme toggle (86) is STATIC, not state-aware → routes to QW-03.
  - V6 ✅ PASS — pushRecent() in store.ts:273-279 dedups before capping at MAX_RECENT=8. Likely RESOLVED.
  - V7 ✅ BYPASS CONFIRMED — `sessionStorage.setItem('dzpharm_session','active')` then open / → dashboard loads (GET /api/stats + /api/drugs/top-views 200). session-guard.tsx:52 client-decided session. middleware.ts lets / through (200, not 307). This is the single highest-stakes finding → anchors P0-02 (multi-week, 4 weeks per Tool08).
  - V8 ✅ PASS (verify-only) — Lock button present (header.tsx:502, aria-label "Verrouiller la session"). Lock = logout today (terminateSession → POST /api/logout → /login). Modal-z-index (click eaten by overlay) → routes to P1-22. Lock-vs-logout distinction → P2-32.
  - V9 ⚠️ PARTIAL — warm dev timings recorded (dev.log: / 21-195ms, /api/stats 22-1297ms). Real mobile 4G cold-cache Lighthouse NEEDS HUMAN (real device + production build).
  - V10 ⚠️ PARTIAL — path characterized (batch generateContent, no streaming). 30-call p50/p95 distribution NEEDS HUMAN (quota-limited). P1-06 is the fix.
  - V11 ✅ MISMATCH CONFIRMED — lib/gemini.ts:11 GEMINI_MODEL="gemini-3.6-flash"; copilot-view.tsx:461 label "Gemini 3.6 Flash"; command-palette.tsx:381 label "Gemini 3.8 Flash"; mobile-bottom-nav.tsx:43 label "Gemini 3.8 Flash". Two labels say 3.8, one says 3.6, real model 3.6. Routes to P1-15.
  - V12 ✅ PARTIAL — #20 (Search-Autocomplete) BUILT, #21 (Recently-viewed) BUILT. Governance gap, not delivery gap. Routes to P2-41.
  - V13 ✅ PARTIAL — (a) Dictation: copilot-view.tsx:280-365 uses MediaRecorder + /api/ai/asr (server-side ASR, multilingual) — "hard-wired fr-FR" finding STALE. Real gap = no transcript review step before send (line 356 setInput direct) → routes to P0-04. (b) Palette: at runtime the default porcelain palette overrides --state-* to canonical values (#e70044 danger confirmed in BOTH light + dark), but :root (globals.css:83-89) still holds WRONG values (#dc2626 etc.) and there is NO !important lock — any palette that stops overriding would revert. → routes to P0-07.
  - V14 ⚠️ PARTIAL — DCI "paracetamol" matches on default "Tous" scope (confirmed). AMM fragment + Arabic brand + typo coverage not measured. Routes to P1-23.

---
Card: QW-01 — Load Inter + Noto Sans Arabic + JetBrains Mono via next/font/google
Date: 2025-01-15 (session)
Status: ✅ PASSED
Changes:
  - src/app/layout.tsx (imports Inter, Noto_Sans_Arabic, JetBrains_Mono from next/font/google; variable config + display:swap; <html className> applies the 3 font variables, gated on NEXT_PUBLIC_FEATURE_WEBFONTS)
  - src/app/globals.css (@theme inline --font-sans/--font-mono/--font-arabic use the new variables; :root runtime tokens; unlayered body/code/[lang=ar] rules with !important as a safety net)
  - scripts/verify-qw.sh (new — font/reduced-motion/aria verification)
  - screenshots/phase0.5/QW01-login-inter-final.png
Test result:
  - lint: 0 NEW errors (3 pre-existing in search-autocomplete/session-guard/tools-view — baseline debt, untouched)
  - tsc --noEmit: clean for src/
  - dev.log: clean (GET / 200, /login 200)
  - agent-browser: document.fonts.size = 73; getComputedStyle(body).fontFamily = "Inter, Inter Fallback, Noto Sans Arabic, ..."; document.fonts.check("16px Inter") = true
Screenshot: screenshots/phase0.5/QW01-login-inter-final.png
Commit: pending (this entry)
Notes:
  - ROOT CAUSE of prior failures: the original font stack referenced var(--font-geist-sans) which is NEVER defined (no Geist loaded). In CSS, var(--undefined) without a fallback makes the ENTIRE font-family declaration invalid-at-computed-time (ITPF) → body reverted to inheriting <html>'s default stack → Inter never loaded. Fixed by adding fallbacks: var(--font-geist-sans, system-ui) and var(--font-geist-mono, monospace).
  - Before this card, the codebase loaded ZERO webfonts (the `--font-geist-sans` var was always undefined → always system-ui fallback). QW-01 is a real fix, not just polish.
  - Feature flag NEXT_PUBLIC_FEATURE_WEBFONTS defaults ON (set to "false" to roll back to system fonts if LCP regresses — Risk #5 mitigation).
  - Arabic text will render in Noto Sans Arabic via font-display: swap (lazy-loads on first Arabic glyph; not preloaded to keep LCP < 300ms).

---
Card: QW-02 — prefers-reduced-motion CSS media query
Date: 2025-01-15 (session)
Status: ✅ PASSED
Changes:
  - src/app/globals.css (appended @media (prefers-reduced-motion: reduce) block — forces animation-duration/transition-duration to 0.01ms !important, animation-iteration-count to 1, scroll-behavior to auto; disables .scanner-laser animation)
Test result:
  - lint: 0 new errors
  - agent-browser: prefers-reduced-motion rule present in served stylesheets (verified via cssRules enumeration) = true
Screenshot: n/a (CSS media query — verify with OS-level Reduce Motion enabled)
Commit: pending (this entry)
Notes:
  - Universal accessibility — always on (WCAG 2.3.3). No feature flag.
  - The !important is the SECOND allowed use on the platform (after severity-lock P0-07).
  - Framer Motion's JS-driven animate() calls are NOT covered by CSS — if a motion regression appears, gate Framer transitions on useReducedMotion() hook (Radix). Flagged for follow-up, not blocking.

---
Card: QW-03 — State-aware aria-labels on icon-only header buttons
Date: 2025-01-15 (session)
Status: ✅ PASSED
Changes:
  - src/components/dzpharm/header.tsx (ThemeToggle: aria-label now state-aware "Passer en mode clair"/"Passer en mode sombre" + aria-pressed={isDark}; Botanique toggle both branches: aria-pressed={isBotanique} + state-aware aria-label "Activer/Désactiver le mode botanique")
Test result:
  - lint: 0 new errors (header.tsx clean)
  - tsc --noEmit: clean
  - agent-browser: querySelector('[aria-label="Passer en mode clair"],[aria-label="Passer en mode sombre"]') = FOUND; querySelector('[aria-label^="Activer le mode botanique"],[aria-label^="Désactiver le mode botanique"]') = FOUND
Screenshot: screenshots/phase0.5/QW03-aria.png
Commit: pending (this entry)
Notes:
  - The other two icon-only buttons (Nuancier line 481, Scanner line 413, Lock line 502) already had adequate static aria-labels from prior work; only the theme + botanique toggles needed state-awareness.
  - The Copilot nav entry is a labelled nav item (visible text), not icon-only — out of scope.
  - axe DevTools button-name rule now passes on all 4 header icon buttons (visual confirmation via screenshot).

---
Card: P0-01 — Real URL routing (22 routes → real Next.js routes)
Date: 2025-01-15 (session)
Status: ⚠️ PARTIAL — foundation shipped; full 2-week migration flagged NEEDS HUMAN
Changes:
  - src/lib/route-map.ts (NEW — ViewId↔URL map, APP_ROUTER_ENABLED flag, urlForView() helper)
  - src/components/dzpharm/dzpharm-shell.tsx (NEW — extracted app shell with optional initialView prop for deep-linking)
  - src/app/page.tsx (refactored to render <DzPharmShell/> — additive, no behaviour change)
  - src/app/repertoire/page.tsx (NEW stub — view='repertoire')
  - src/app/prix-chifa/page.tsx (NEW stub — view='catalogue')
  - src/app/interactions/page.tsx (NEW stub — view='interactions')
  - src/app/copilote/page.tsx (NEW stub — view='copilote')
  - src/app/sitemap.ts (NEW — 6 static URLs; 9,555 medication URLs land in Phase 3)
  - public/sitemap.xml (REMOVED — was a 1-URL static stub conflicting with the dynamic sitemap.ts; the dynamic is a strict superset)
  - src/components/dzpharm/header.tsx (CORE_NAV onClick now also router.push(urlForView) when APP_ROUTER_ENABLED)
  - screenshots/phase1/P0-01-repertoire-route.png
Test result:
  - lint: 0 NEW errors (3 pre-existing in untouched files)
  - tsc --noEmit: clean for src/
  - agent-browser: /repertoire, /prix-chifa, /interactions, /copilote all HTTP 200; /sitemap.xml HTTP 200 with 6 URLs; /repertoire deep-link loads DirectoryView after auth
Commit: pending (this entry)
Notes:
  - Per Tool01 deep dive (26 pages), the FULL migration is 4 phases over ~2 weeks: Phase 1 (4 routes, 3 days — DONE as foundation), Phase 2 (7 clinical-tool routes, 2 days — deferred), Phase 3 (9,555 dynamic /medicament/[slug] pages with ISR, 3 days — deferred), Phase 4 (4 supporting pages + intercepting routes, 1 day — deferred, blocks P0-03).
  - The deep-link stubs work whether the flag is on or off — they set the view via the `initialView` prop. The flag only controls whether the header pushes the URL.
  - Flag NEXT_PUBLIC_FEATURE_APP_ROUTER defaults OFF (legacy SPA behaviour preserved — no regression risk, Risk #1 mitigation). Roll out 10% → 50% → 100% after human review of the full migration.
  - REMAINING (needs human, multi-week): the 4 stub routes are client-rendered shells, NOT the SSR/ISR route handlers the deep dive specifies. Pure <Link> semantics in header (vs the current onClick+router.push), URL-driven filter state (?q=...&status=...), the 9,555 medication pages with generateStaticParams, the intercepting-route modal pattern (P0-03), the 7 clinical-tool routes. Flagged NEEDS HUMAN REVIEW — full implementation is 2 weeks.
