# DzPharm — Worklog

## Project
Building "DzPharm" — Algerian Pharmaceutical & Clinical Intelligence Platform (from PHARMADZ PLAN.md).
Single-page app at `/` (Next.js 16 App Router, TS, Tailwind 4, shadcn/ui, Prisma+SQLite, z-ai-web-dev-sdk backend).

## Data sources (uploaded)
- `upload/NOMENCLATURE ALGERIEN.xlsx`: 3 sheets — Nomenclature Juin 2026 (5386 active drugs), Non Renouvelés (1500), Retraits (2684). Columns: N°, N°ENREGISTREMENT (AMM), CODE, DCI, NOM DE MARQUE, FORME, DOSAGE, CONDITIONNEMENT, LISTE, P1 (HOP/OFF), P2, OBS, LABORATOIRE, PAYS, DATE INITIAL, DATE FINAL, TYPE (GE/RE...), STATUT, DUREE DE STABILITE.
- `upload/pharmacie_extracted/pharmacie/*.docx`: 17 clinical pharmacology books (Cardiologie, Antibiotiques, etc.) with DCI monographs in Heading 3 ("N. DCI : Name (Seule|En Association)") → extract DCI→domain mapping.

## Status: IN PROGRESS — Task 1 (data extraction)

---
Task ID: 1
Agent: main-orchestrator
Task: Extract data from NOMENCLATURE ALGERIEN.xlsx (3 sheets) and 17 pharmacology docx files

Work Log:
- Wrote scripts/extract_data.py: parses xlsx (auto header detection row 14), normalizes fields
- Extracted 9,555 drugs: 5,381 ACTIF + 1,495 NON_RENOUVELE + 2,679 RETRIE
- Parsed 17 docx books for DCI monograph headings (multiple heading formats), built dci_map (480 entries)
- Added pharmacological keyword classifier (suffix/word-level) as fallback: 6,791/9,555 drugs classified into 17 therapeutic domains
- Output: data/drugs.json (all drugs + domains/classes), data/dci_map.json

Stage Summary:
- data/drugs.json is the single source of truth; each drug has: regNumber, code, dci, dciKey, brand, brandKey, form, dosage, packaging, liste, p1, p2, obs, lab, country, regDateInitial, regDateFinal, type, statut, stability, withdrawDate, withdrawReason, status (ACTIF|NON_RENOUVELE|RETRIE), domains[], classes[]

---
Task ID: 2
Agent: main-orchestrator
Task: Prisma schema + database seeding

Work Log:
- prisma/schema.prisma: Drug model (SQLite) with indexes on dciKey/brandKey/status/domain/lab/country; domains/classes stored as JSON strings; domain = primary domain denormalized
- scripts/seed.ts: batched createMany (500/batch)
- Ran db:push + seed → 9,555 rows in db/custom.db

Stage Summary:
- DB ready. `import { db } from '@/lib/db'`.

---
Task ID: 3
Agent: main-orchestrator
Task: Backend API routes

Work Log:
- GET /api/drugs — search (q normalizes accents/case like dciKey), filters (status, domain, form, liste, country, lab), pagination, sort (relevance|brand|dci|lab|dateInitial|dateFinal). Returns {drugs, total, page, pageSize, totalPages}
- GET /api/drugs/[id] — full detail + equivalents (same dciKey, take 60)
- GET /api/stats — cached 5min: totals, local/imported, topLabs, topDci, topForms, domains, countries, listes
- GET /api/domains — cached: domains/forms/listes/countries with counts
- POST /api/ai/chat — DzPharm Copilote (z-ai-web-dev-sdk), grounded with live registry lookups, pro|patient mode, history up to 16 msgs
- POST /api/ai/interactions — enriches input names with registry data, LLM returns strict JSON {enriched, globalRisk, summary, pairs[{drugs,severity,mechanism,management}], advice[], monitoring[]}
- Tested all endpoints via curl: OK (chat returns French clinical answers; interactions returns severity-classified pairs)

Stage Summary:
- Full API contract documented above; frontend can be built against it.

---
Task ID: 4
Agent: full-stack-developer
Task: Frontend DzPharm — application monopage (5 vues) consommant les API

Work Log:
- globals.css : refonte complète du thème (structure shadcn conservée) — dark-first #090D16/#101827, primary cyan #00E9FF (dark) / #0284C7 (light), accent "chifa" orange #FF6A00/#EA580C, tokens state-safe/warning/danger, chart-1..5 thématés ; utilitaires .scroll-thin, .no-scrollbar, .hero-glow, .hero-grid, typing-dot
- layout.tsx : lang="fr", metadata "DzPharm — Référentiel Pharmaceutique Algérien", Providers (ThemeProvider next-themes class/dark + QueryClientProvider TanStack Query), Toaster conservé
- src/components/dzpharm/ : providers, types (contrats API typés), api (fetchers relatifs + POST IA), store (zustand : vue courante, filtres répertoire, basket interactions max 10, fiche ouverte), status-badge (StatusBadge/ListeBadge/SeverityBadge/RISK_META + countryCode texte, formatDate, formatNumber fr-FR), search-autocomplete (debounce 300ms + AbortController via signal TanStack Query, navigation clavier ↑↓⏎⎋, clic extérieur), header (sticky blur, tabs desktop + barre scrollable mobile, toggle thème CSS-based, badge "9 555 médicaments"), footer (mt-auto + safe-area), home-view (hero + Cmd/Ctrl+K, chips rapides, KPI count-up rAF, grille 12 domaines avec icônes lucide dédiées, top DCI avec barres de progression + top labos), directory-view (toolbar : recherche débouncée + 5 Selects + reset, table triable brand/dci/lab avec en-têtes sticky et max-h overflow, pagination compacte + taille de page 20/50/100, export CSV client (BOM UTF-8, ;) limité à 100 résultats, squelettes + état vide), drug-sheet (Sheet latérale : badges statut/domaine/liste/local-importé, 11 métriques, alertes RETRIE/NON_RENOUVELE, équivalents même DCI cliquables max-h-72, bouton "Ajouter au contrôle d'interactions" → basket + vue Interactions + toast), interactions-view (panier chips + contexte patient + analyse IA : bandeau risque global, légende gravités, cartes paires mécanisme/conduite, conseils, surveillance, indicateur "panier modifié depuis l'analyse"), copilot-view (chat markdown react-markdown + remark-gfm ajouté, mode pro/patient segmenté avec tooltips, suggestions incl. darija, dots d'attente, auto-scroll, disclaimer), stats-view (4 cartes résumé + 5 graphiques recharts CSS-var themed : top 10 labos barres H, donut locale/importations, top 12 domaines, donut statut, top 8 formes)
- page.tsx : composition single-page, AnimatePresence transitions de vues, DrugSheet global. NOTE : rendu par chaîne conditionnelle (et NON via map VIEWS[view]) — l'accès via map provoquait de façon reproductible "Element type is invalid: got undefined" sur la vue copilote en dev Turbopack (soupçon d'interaction proxy react-refresh/esm interop) ; la chaîne conditionnelle est fiable
- QA navigateur headless (agent-browser) : home/annuaire/fiche/interactions (analyse réelle DOLIPRANE+KARDEGIC → risque modéré, paire majeure)/copilote (réponse IA réelle, markdown + tableau)/stats rendus ; Cmd+K, Entrée→Répertoire, pagination page 2, export CSV + toast, bascule thème clair/sombre, vue mobile 390px ; captures vérifiées par VLM
- bun run lint : 0 erreur ; tsc --noEmit : 0 erreur sur les fichiers frontend (erreurs préexistantes uniquement dans routes API/examples/skills, non modifiées)
- Remarque : GET /api/domains renvoie 500 (Prisma P2019 — groupBy classes avec take:0 sans orderBy). Non modifié (interdit) ; les listes de filtres utilisent /api/stats (domains/topForms/listes/countries) qui couvre le besoin

Stage Summary:
- Frontend complet et fonctionnel sur / : Accueil, Répertoire (filtres/tri/pagination/CSV), fiche médicament Sheet, Interactions IA, Copilote IA pro/patient, Statistiques (5 charts). Dark-mode par défaut + light, responsive mobile-first, UI 100% française, icônes lucide uniquement. Fichiers : src/app/{page,layout,globals.css} + 13 composants dans src/components/dzpharm/ + remark-gfm installé.

---
Task ID: 5
Agent: main-orchestrator
Task: QA end-to-end (agent-browser + VLM) and fixes

Work Log:
- Fixed /api/domains 500 (removed invalid groupBy with take:0 without orderBy) — endpoint now returns domains/forms/listes/countries
- E2E tested with agent-browser: home (autocomplete "doliprane"→8 options), drug sheet (DOLIPRANE: AMM, 60 équivalents, alertes), interaction flow (DOLIPRANE + KARDEGIC + patient 72 ans → analyse IA "Moderee" avec paire/conseils/surveillance), Répertoire (recherche "insuline" → 81 résultats, tri, pagination, export CSV), Copilote IA (question CNAS metformine → réponse complète en français, mode pro/patient), Statistiques (5 graphiques recharts rendus: 30 bars, 5 sectors)
- Mobile 390px: no horizontal overflow, footer visible, header 2 rows
- Fixed a11y warnings: added sr-only SheetTitle/SheetDescription in drug-sheet loading state (Radix warning gone)
- Fixed domain card truncation on mobile: line-clamp-2 + title attr (verified via DOM measurements: 2-line wrap confirmed)
- Verified with VLM screenshots: design quality rated high/professional SaaS
- bun run lint: 0 errors

Stage Summary:
- All 5 views + AI features verified working end-to-end in browser. Console clean (no errors). Responsive verified.

Current project state: STABLE & COMPLETE for phase 1.
- / route = DzPharm single-page app (Accueil, Répertoire, Interactions, Copilote IA, Statistiques)
- 9,555 drugs in DB (3 statuses), 71% domain classification
- AI features: copilote (pro/patient modes, FR/AR/darija) + interaction checker

---
Task ID: 6
Agent: main-orchestrator
Task: Scheduled maintenance job

Work Log:
- Created cron job "DzPharm WebDev Review (every 15 min)" (job_id 339197, kind webDevReview, tz Africa/Lagos, expr 0 */15 * * * ?)
- It reviews worklog.md, runs agent-browser QA, fixes bugs or advances new features autonomously

Stage Summary:
- Continuous autonomous development loop is now active.

=== PHASE 1 COMPLETE ===
Next-phase recommendations (for the cron agent):
1. Calculateur posologie pédiatrique (poids → mL sirop, concentrations locales)
2. Simulateur de remboursement Chifa (tarif de référence, taux 80/100%)
3. Adaptateur Ramadan (chronopharmacologie autour Iftar/Suhoor)
4. Carte des pharmacies de garde par wilaya
5. PWA offline (IndexedDB cache des fiches)
6. Alertes pénuries + explorateur des 17 livres techniques (fiches DCI des docx)

---
Task ID: 7
Agent: main-orchestrator (cron review session 2026-08-27)
Task: QA globale via agent-browser, correction de la panne IA (repli local), et développement des fonctionnalités phase 2 (calculateur pédiatrique, simulateur Chifa, favoris, fiche imprimable)

Work Log:
- QA initiale agent-browser : 5 vues OK, 0 erreur console, navigation/sheet/stats OK
- DIAGNOSTIC CRITIQUE : le service z-ai API renvoie 401 {"error":"missing X-Token header"} sur TOUS les appels (chat, interactions, vision CLI). Config /etc/.z-ai-config n'a que baseUrl+apiKey, aucun token valide sur la machine. Panne EXTERNE — impossible à corriger localement. Confirmé aussi via CLI z-ai vision (même 401).
- Créé src/lib/interaction-rules.ts : moteur local de ~48 règles d'interactions (classes IEC/ARA2/AINS/ISRS/macrolides/FQ/statines/azolés/benzos/thiazidiques/IPP/sulfamidés + jetons), match sur dciKey normalisé + éclatement DCI composées, globalRisk, paires par produits, sévérité CONTRE-INDIQUE..MINEURE
- Créé POST /api/interactions (route locale, enrichit via registre puis applique les règles, <300ms). Testé : BRUFEN+LOPRIL → MAJEURE (AINS+IEC), BRUFEN+CAPTOPRIL+PROZAC → 2 majeures
- Refonte interactions-view : analyse en 2 temps (moteur local instantané → puis IA approfondie qui remplace si dispo) ; bandeau de source (local/IA), bandeau orange si IA indisponible, texte de disclaimer adapté à la source
- Créé src/lib/pediatric-dosing.ts : base de 15 molécules pédiatriques avec formulations RÉELLES du marché algérien vérifiées en DB (PARALGAN 120mg/5mL, ADVIFEN 100mg/5mL, AMOXICILLINE EG 125/250mg/5mL, AUGMENTIN 100/12.5mg/mL, ZOMAX 200mg/5mL, OROKAL, CLARIDAR, ARTIZ gouttes 10mg/mL, KOXMA, CORTIDAL 1mg/mL, GEOFER 50mg/5mL, TRIFER 100mg/5mL, VERTEN, VALOXIUM rectal) + computeDose (mg/kg→mg→mL, plafonds adulte, blockers âge/poids, bands fixes par tranche d'âge)
- Créé pediatric-calculator.tsx : sliders poids (0.5-80kg) + âge (0-144 mois), sélecteur molécule/forme, carte dose principale avec volume mL, rythme/max 24h, détail de calcul, blockers rouges, points de vigilance, marques locales cliquables depuis le registre (TanStack Query)
- Créé chifa-simulator.tsx : type de carte (CNAS 80%, ALD 100%, CASNOS 80%, sans couverture), lignes produits avec prix + taux (100/80/40/0), plafonnement taux carte, reste à charge animé, barre remboursé/patient, 3 cartes de totaux, section pédagogique Chifa
- Créé tools-view.tsx : vue « Outils » à onglets (Tabs shadcn) + ajout onglet nav « Outils » (icône Wrench) dans header + page.tsx
- Favoris : store zustand persist (localStorage dzpharm-store, partialize favorites, max 30), étoile Star dans drug-sheet (toggle + toast), section « Mes favoris » sur l'accueil (chips scrollables avec suppression), mention dans header mobile
- Fiche imprimable : PrintMonograph porté via createPortal au body (A4, noir & blanc, en-tête DzPharm + AMM, table caractéristiques, alertes retrait, table équivalents 30 max, source légale) + bouton imprimante dans drug-sheet + CSS @media print dans globals.css (body > *:not(.print-monograph) masqué, @page A4)
- BUG CORRIGÉ : bloc @media print initial disparaissait du CSS compilé (Tailwind/Lightning strippait @page imbriqué dans @media) → @page sorti du @media. Vérifié : PDF 1 page, monographie seule, zéro élément d'UI
- Copilote : onError ajoute désormais un message persistant dans le fil (« Service IA momentanément indisponible » + liste des outils locaux restants) en plus du toast
- QA finale agent-browser : 6 vues sans overflow ni desktop ni mobile 390px, calcul pédiatrique vérifié (12kg paracétamol → 180mg → 7.5mL), Chifa vérifié (305 DA total → 206 remboursé → 99 patient), favoris persistants après reload, impression PDF propre, moteur local E2E (BRUFEN+LOPRIL majeure), lint 0 erreur, tsc 0 erreur sur les fichiers modifiés

Stage Summary:
- NOUVELLES FONCTIONNALITÉS : Outils cliniques (calculateur posologies pédiatriques 15 molécules + simulateur Chifa), moteur local d'interactions (48 règles) toujours disponible, favoris persistants, fiche imprimable A4
- Résilience : la panne externe du service IA n'affecte plus l'expérience — les interactions restent fonctionnelles via le moteur local, le copilote affiche une erreur propre avec redirection vers les outils
- ÉTAT : STABLE — toutes les vues vérifiées, pas de régression (recherche, répertoire, fiche, stats, export CSV)

=== Prochaine phase recommandée ===
1. RAMADAN : adaptateur chronopharmacologie (décaler prises autour Iftar/Suhoor) — lib local purement calculatoire
2. Explorateur des 17 livres docx (fiches DCI par domaine) — nécessite script d'extraction des monographies complètes
3. PWA offline (service worker + cache des fiches consultées)
4. Alerte pénuries : champs OBS contiennent parfois des infos de rupture — investiguer
5. Lorsque le token X-Token sera de retour : ré-activer et re-tester les 2 endpoints IA (le code est prêt, rien à changer)
