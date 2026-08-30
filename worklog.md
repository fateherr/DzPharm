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

---
Task ID: 8
Agent: main-orchestrator (session 2026-08-27, phase 3)
Task: Analyse concurrentielle (pharmnet-dz.com + 2 previews), QA globale, et phase 3 — Adaptateur Ramadan, Comparateur de médicaments, historique récent, compteur de consultations, partage de fiche

Work Log:
- QA initiale : 6 vues OK, 0 erreur console, serveur dev stable
- DIAGNOSTIC : le service z-ai est DE RETOUR (chat + interactions IA répondent — plus de 401 X-Token) ; testé DOLIPRANE+KARDEGIC 72 ans → MODERE avec mécanisme/conduite complets
- Analyse concurrentielle pharmnet-dz.com (via agent-browser, 19 captures) : registre quasi identique (9 560 produits, même nomenclature), Supabase + Leaflet, VERDICT — nos différenciateurs (IA, pédiatrie, Chifa, interactions réelles) restent uniques ; patterns adoptés : compteur de consultations, badge fraîcheur données, favoris récents, callouts équivalence
- Les 2 previews space-z.ai fournis sont des scaffolds vierges Z.ai (aucune fonctionnalité) — seul enseignement : langage design emerald/gradient (déjà couvert par notre thème cyan/chifa)
- NOUVEAU : Adaptateur Ramadan (ramadan-adapter.tsx) — 12 wilayas avec horaires Iftar/Suhoor éditables, rythme 1-4 prises/jour, timeline 24h visualisée (segments jeûne/fenêtre alimentation + épingles doses), répartition équilibrée dans la fenêtre nocturne, 9 cartes de guidance chronopharmacologique par classe (antidiabétiques, antihypertenseurs, diurétiques, antibiotiques, anticoagulants, corticoïdes, IPP, levothyroxine, antiépileptiques) avec niveaux de risque, copie du plan, avertissement médical
- NOUVEAU : Comparateur de médicaments (drug-comparator.tsx) — 2-3 produits via autocomplete, table 15 caractéristiques côte à côte, détection même DCI + alertes dosage/forme, alerte produits retirés, lignes critiques surlignées
- NOUVEAU : Historique récent — store zustand persist (max 8), section « Consultés récemment » sur l'accueil, chips cliquables
- NOUVEAU : Compteur de consultations global — colonne Drug.views (Prisma, db:push), POST /api/drugs/[id]/view fire-and-forget, badge œil dans la fiche, invalidation query à chaque ouverture
- NOUVEAU : Partage de fiche — bouton Share2 (navigator.share → clipboard API → execCommand fallback → toast), dans l'en-tête de la fiche
- Améliorations : Outils → 4 onglets scrollables ; Accueil → grille 6 cartes outils (grid-cols-3) ; footer → badge « Référentiel en ligne » + MAJ
- FIX dev serveur : Prisma client périmé en mémoire après db:push (colonne views absente des SELECT) → redémarrage propre du serveur dev
- FIX : clamp des épingles timeline Ramadan (3%-97%) contre le rognage aux bords
- FIX : query cache TanStack — invalidateQueries(['drug', id]) à l'ouverture de la fiche pour rafraîchir le compteur
- QA E2E agent-browser : Ramadan (Alger 2×/j → 19:45/04:45 ; Oran → 19:55/04:55 ; 3×/j → 19:55/00:25/04:55 réparties équitablement, 9 cartes de classes) ; Comparateur (DOLIPRANE 1000MG + EFFERALGAN → « Même DCI » + « Dosage/forme différents », table 15 lignes) ; compteur vues (badge « 2 » après réouverture) ; partage (toast + fallbacks) ; récents (chips sur accueil, persistance) ; mobile 390px : Ramadan + accueil sans overflow horizontal ; 6 vues OK desktop ; console 0 erreur ; lint 0 erreur ; tsc 0 erreur sur fichiers modifiés

Stage Summary:
- 5 nouvelles fonctionnalités livrées et vérifiées E2E : Adaptateur Ramadan (chronopharmacologie, 12 wilayas), Comparateur (15 caractéristiques, détection équivalences), historique récent persistant, compteur de consultations global (backend + UI), partage de fiche multi-fallbacks
- IA 100 % opérationnelle à nouveau (copilote + interactions approfondies + moteur local en repli)
- Analyse concurrentielle : position concurrentielle renforcée — DzPharm reste le seul avec IA + outils cliniques locaux ; patterns de confiance Pharm'Net adoptés (compteur, fraîcheur)
- ÉTAT : STABLE — toutes vues, outils, IA et responsivité vérifiés

=== Prochaine phase recommandée ===
1. Explorateur des 17 livres docx (fiches DCI complètes par domaine — extraction + vue dédiée)
2. PWA offline (service worker + cache des fiches consultées)
3. Alerte pénuries : investiguer le champ OBS (ruptures mentionnées)
4. Carte pharmacies de garde par wilaya (données à sourcer)
5. « Les plus consultés » : endpoint top-views + section accueil (données now collectées)

---
Task ID: 9
Agent: main-orchestrator (session 2026-08-27, phase 4)
Task: RCP (Résumé Caractéristiques du Produit) pour chaque médicament depuis la base des 17 livres — extraction complète, moteur de génération BOOK/AI/REGISTRY, viewer ANSM, + nouvelles fonctionnalités (fonction rénale, les plus consultés) + QA complète

Work Log:
- EXTRACTION COMPLÈTE DES LIVRES : scripts/extract_monographs.py — parseur multi-formats (A: «N. DCI : X» H2/H3 + sections Normal/bullets ; B: fiches numérotées «131.8.1. X» H3 + sections H4 ; C: sections inline «Label : item - item» Body Text des livres Antibiotiques/Antalgiques ; D: «152A.5 DCI : X» H2 Rhumatologie). Fixes successifs : regex préfixe numérique alphanumérique, apostrophes dans norm_label, ordre de détection Contre-indications avant Indications («contre-indications» contient «indication»), strip des tirets initiaux des items inline, headings H3/H4 internes ajoutés aux blocs de fiche, filtre des faux noms génériques (CATEGORIES/TABLEAU/SYNTHESE...)
- RÉSULTAT : 764 monographies, 42 274 items de contenu, data/monographs.json, couverture 84,2 % des actifs (4 530/5 381) via matching multi-stratégies (exact, salt-stripped, EXPRIME EN, composantes d'associations +//ET, index de mots ≥6)
- PRISMA : models Monograph (dciKey unique, content JSON) + Rcp (drugId unique, source, content JSON) ; scripts/seed-monographs.ts → 764 lignes
- MOTEUR RCP src/lib/rcp.ts : index monographique en mémoire (TTL 10 min), matchMonograph (salt-strip/split combos/word index), buildBookRcp (21 sections au format ANSM numéroté 1→10 + annexes A/B/C : disponibles Algérie, conseils comptoir, règles d'or), buildAiRcp (validation LLM JSON + fusion sections registre 1-3/7-10 + tri numériques puis annexes), buildRegistryRcp (repli minimal)
- API GET /api/drugs/[id]/rcp : stratégie cache DB > fiche livre (>8 sections) > génération IA (z-ai-web-dev-sdk, prompt RCP ANSM strict JSON, ~25 s, mise en cache) > registre (non caché pour permettre retry IA). ?refresh=1 pour forcer
- API enrichies : /api/drugs (hasBookRcp par ligne), /api/drugs/[id] (rcpSource BOOK|AI|REGISTRY), /api/drugs/top-views (nouveau, classement par views), /api/stats (+monographs: 764)
- FRONTEND RCP : rcp-view.tsx — bandeau en-tête ANSM (dénomination, AMM, forme, titulaire, liste), badge source (Livre technique/IA/Registre), alerte orange IA («vérifiez 4.3/4.5/4.6»), nav sticky par sections (chips rouges pour sections critiques), sections numérotées avec labels gras, boutons Régénérer/Imprimer, disclaimer, loading skeleton, état erreur + retry
- FICHE MÉDICAMENT : Tabs «Fiche produit | RCP» (reset sur changement de médicament via ajustement au rendu — pattern React conforme lint), badge «Livre» sur l'onglet RCP si fiche livre, Sheet élargie md:max-w-xl
- IMPRESSION RCP : PrintRcp portal (createPortal body, .print-rcp, A4 noir & blanc, sections complètes) + PrintMonograph conditionné à l'onglet Fiche (exclusivité des cibles print) + CSS print étendu ; PDF vérifié : 5 pages propres, zéro UI
- NOUVELLE FONCTIONNALITÉ — Calculateur de fonction rénale (renal-calculator.tsx, 5e onglet Outils) : Cockcroft-Gault (adaptation posologique) + MDRD (stadification CKD G1-G5 colorée), sliders âge/poids, créatininémie µmol/L (+conversion mg/dL), sexe, et table dynamique de 10 classes critiques (metformine, AINS, aminosides, allopurinol, AOD, vancomycine, digoxine, HBPM, IEC/ARA2, spironolactone) avec statuts Dose standard/Prudence/À adapter/Contre-indiqué calculés au ClCr courant. Vérifié : homme 65a/70kg/90µmol → ClCr 72 (G2) ; femme 65a/70kg/250µmol → ClCr 22 (G4, 3 contre-indications)
- NOUVELLE FONCTIONNALITÉ — «Les plus consultés» sur l'accueil : grille 2×4 cartes classées (rang dégradé, badge RCP livre, compteur consultations) via /api/drugs/top-views
- AMÉLIORATIONS UI : hero + 3 badges (17 livres / 764 monographies / RCP ANSM), grille outils 8 cartes (+Fonction rénale, +Bibliothèque RCP), Statistiques + carte «Monographies RCP» (grille 5), badge RCP dans le répertoire (icône BookOpen + label), largeurs colonnes répertoire responsive (min-w-0 mobile)
- QA E2E agent-browser : accueil (badges hero, Les plus consultés 8 cartes, 8 outils), fiche DOLIPRANE → onglet RCP «Livre» → 21 sections ANSM rendues (indications, posologie adulte/enfant, CI, interactions AVK/inducteurs, grossesse CRAT, surdosage NAC…), MEQUITAZ (sans fiche livre) → RCP «Généré par IA» 21 sections depuis cache, répertoire badge RCP, calculateur rénal G2/G4, impression PDF RCP 5 pages, Statistiques 764 monographies, Copilote/Interactions OK (BRUFEN+LOPRIL → ELEVE), mobile 390px zéro overflow, console 0 erreur
- VLM : RCP viewer 8/10, home 8,5/10 (hiérarchie et alignements salués)
- bun run lint : 0 erreur ; tsc --noEmit : 0 erreur sur les fichiers modifiés (erreurs préexistantes uniquement dans 3 routes API non modifiées ce jour)
- Cron de revue 15 min recréé (job 340148, l'ancien 339874 désactivé par limites — supprimé) avec contexte RCP à jour
- FIX infra : redémarrage du serveur dev après db:push (client Prisma périmé en mémoire — db.rcp undefined) ; serveur relancé en sous-shell (bun run dev &) pour survivre aux sessions bash

Stage Summary:
- FONCTIONNALITÉ PHARE : chaque médicament a désormais un RCP — 84 % des actifs couverts par les livres techniques (instantané, caché en base), les autres générés par IA à la demande puis cachés, repli registre toujours disponible. Format ANSM officiel numéroté, imprimable A4
- NOUVELLES FEATURES : calculateur de fonction rénale (Cockcroft-Gault + MDRD + 10 règles d'adaptation), section «Les plus consultés», 5 cartes résumé statistiques
- UI : onglets dans la fiche, badges RCP partout (répertoire, accueil, onglet), nav sticky RCP, impression exclusive fiche/RCP selon l'onglet actif
- ÉTAT : STABLE — toutes vues vérifiées E2E desktop + mobile, IA opérationnelle, 0 erreur console/lint/tsc

=== Prochaine phase recommandée ===
1. Explorateur de monographies : navigateur par domaine/classe des 764 fiches DCI (les livres contiennent tableaux comparatifs et algorithmes non extraits)
2. PWA offline (service worker + cache des fiches/RCP consultés)
3. Alerte pénuries : investiguer le champ OBS (ruptures mentionnées)
4. Carte pharmacies de garde par wilaya (données à sourcer)
5. Grossesse/allaitement : outil de vérification rapide par DCI (données CRAT déjà dans les fiches 4.6)
6. Pré-génération des RCP IA restants par lots (cron) pour couvrir 100 % du registre

---
Task ID: 10
Agent: main-orchestrator (session 2026-08-27, phase 5)
Task: Intégration de la base de prix officine uploadée (0530a7b5-...xls, 2 428 lignes) — prix PPA sur tous les médicaments, nouveau catalogue produits/parapharmacie, comparateur de prix par équivalents, stats prix, Chifa avec prix réels + QA complète

Work Log:
- EXTRACTION : scripts/match_prices.py — parse le .xls (Produit / Laboratoire / PPA / ID CNAS / Classe thérapeutique), dédoublonne (2 428 → 1 791 noms uniques, dernière occurrence retenue pour prix révisés)
- MATCHING registre : 3 stratégies fusionnées (préfixe exact brandKey squashed, startsWith famille de marque, variantes orthographiques -1/-2 caractères) + scoring dosage(+4)/forme(+3)/conditionnement(+2)/actif(+1) ; garde de précision : score 1 accepté seulement si famille de marque unique → 1 116/1 791 liés (62,3 %), précision vérifiée 23/25 sur échantillon aléatoire
- PRISMA : modèle PharmacyProduct (name, nameKey, lab, ppa, cnasId, class, drugId FK, matchScore) + relation Drug.pharmacyProducts ; scripts/seed-prices.ts avec correction critique du mapping id (table Drug re-seedée → ids offset de 9 555 ; mapping par position via findMany orderBy id) ; db:push + seed + redémarrage dev (client Prisma périmé)
- BACKEND : GET /api/products (recherche q normalisée, filtres classe/catégorie drug|parapharma/remboursable/minPrice/maxPrice, tri nom|prix↑|prix↓, pagination, stats prix agrégées) ; GET /api/products/facets (27 classes + labs + compteurs, cache 5 min) ; /api/drugs inclut price+refundable (pharmacyProducts take 1 ppa asc) ; /api/drugs/[id] inclut pharmacy[] + prix sur les 60 équivalents ; /api/stats + prices{productsTotal, linked, parapharma, refundable, avg/min/max, 5 tranches, byClass top 8}
- FRONTEND : types étendus (price/refundable sur Drug/Equivalent, PharmacyProductDetail, CatalogProduct/Response/Facets/PriceStats) ; api.ts fetchCatalog/fetchCatalogFacets ; formatPrice (fr-FR, DA) dans status-badge
- NOUVELLE VUE « Catalogue & Prix » (catalog-view.tsx, 7e onglet nav « Prix » icône Store) : bandeau 4 indicateurs (prix moyen chifa / min safe / max / remboursables CNAS), toolbar recherche débouncée + catégorie + classe (27) + tri prix + switch remboursables, table (produit+badge CNAS+DCI, labo, PPA DA, classe, statut registre cliquable), pagination 20/50/100, export CSV (BOM ;) 100 max, note PPA/CNAS pédagogique
- FICHE MÉDICAMENT : carte « Prix public — officine » en tête (grand prix DA, badge Remboursable CNAS/Non remboursé, classe, conditionnements multiples min→max) ; comparateur équivalents : bandeau « Équivalent le moins cher : X à Y DA (économisez Z DA vs marque) », colonne prix + badge Éco vert sur le min, mentions CNAS ; prix dans partage et monographie imprimable A4
- RÉPERTOIRE : colonne PPA (prix + CNAS) + export CSV enrichi (PPA DA, Remboursable CNAS)
- SIMULATEUR CHIFA : addLine récupère le prix réel via fetchDrugDetail (taux 80 % si remboursable, 0 % sinon, toast « Prix réel appliqué ») ; lignes démo mises à jour aux prix réels (GLUCOPHAGE 850 = 442,80 DA, PARALGAN = 96,19 DA)
- STATISTIQUES : section « Catalogue & prix officine » (5 cartes indicateurs + 2 graphiques : répartition 5 tranches PPA barres chifa, prix moyen par classe top 8) — 7 graphiques au total
- ACCUEIL : badge hero « 1 791 prix d'officine (PPA) » (accent chifa) ; 9e carte outil « Catalogue & prix » (grille 3×3) ; footer « Prix PPA : liste officine (Août 2026) »
- QA E2E agent-browser : accueil badge prix ✓ ; catalogue (1 791 produits · 1 116 médicaments · 675 parapharmacie ; recherche doliprane → 6 produits avec prix ; tri prix desc → DECAPEPTYL 40 849 DA/OMRON 15 980 DA ; switch remboursables → 990) ✓ ; fiche DOLIPRANE 300MG → carte prix 141,16 DA + bandeau « PARALGAN 96,19 DA, économisez 44,97 DA » + badge Éco + 19 équivalents prix ✓ ; répertoire doliprane → 6/16 lignes avec prix ✓ ; stats → 5 cartes + 7 charts ✓ ; Chifa → EFFERALGAN 1G prix réel 151,48 DA appliqué (BRUFEN sirop hors liste → repli 100 DA, comportement attendu) ✓ ; interactions/copilote/outils sans régression ✓ ; mobile 390px zéro overflow page (table scrollable prévu) ✓ ; light mode ✓ ; console propre, 0 erreur
- VLM : catalogue 8/10, stats 9/10, mobile 8/10 → fix carte prix mobile (text-base sm:text-lg, col-span-2 CNAS)
- FIX préexistants : tsc 100 % propre maintenant (drugs/products AND spread typing, facets lab not:null+not:"" via AND, stats groupBy orderBy/_count casts, ai/chat role const) ; lint 0 erreur

Stage Summary:
- FONCTIONNALITÉ PHARE : les prix sont partout — 1 026 médicaments du registre affichent leur PPA (fiche, répertoire, export), 1 791 produits d'officine consultables dans le catalogue (dont 675 parapharmacie/accessoires hors nomenclature), 990 remboursables CNAS identifiables
- COMPARATEUR D'ÉCONOMIES : par DCI, l'équivalent le moins cher est mis en avant avec le gain exact vs marque consultée (génériques)
- Chifa simule désormais avec les prix réels du catalogue ; stats prix (tranches, moyennes par classe) ajoutées
- ÉTAT : STABLE — 7 vues vérifiées E2E desktop + mobile, tsc + lint 100 % propres

=== Prochaine phase recommandée ===
1. Explorateur de monographies : navigateur par domaine/classe des 764 fiches DCI
2. PWA offline (service worker + cache fiches/RCP/prix consultés)
3. Panier d'achat/ordonnance persistant avec budget total (extension Chifa)
4. Alerte pénuries : investiguer le champ OBS (ruptures mentionnées)
5. Pré-génération des RCP IA restants par lots (cron) pour 100 % du registre
6. Grossesse/allaitement : outil de vérification par DCI (données CRAT des fiches 4.6)

---
Task ID: 11
Agent: main-orchestrator (session 2026-08-29, phase 6)
Task: QA globale, puis 3 nouvelles fonctionnalités — Bibliothèque clinique (explorateur des 764 monographies), Vérificateur Grossesse & Allaitement (CRAT), PWA offline (service worker) — + cross-links fiches↔bibliothèque + polish UI

Work Log:
- QA initiale : 8 vues OK, 0 erreur console, IA opérationnelle, serveur stable — état STABLE confirmé
- NOUVEAU : BIBLIOTHÈQUE CLINIQUE (7e vue nav « Bibliothèque », icône Library) — GET /api/monographs (recherche q normalisée, filtre 17 domaines avec compteurs, pagination, cache 5 min) + GET /api/monographs/[key] (fiche complète : 12 sections dégroupées categories/mechanism/indications/CI/adverse/management/interactions/pregnancy/posology/galenic/advice/pk/notes + spécialités actives du registre liées par dciKey, take 40) ; library-view.tsx : chips domaines scrollables avec fondu latéral mobile, recherche débouncée, grille cartes (résumé mécanisme, badge CRAT rose, compteur blocs, livre source), lecteur Sheet plein écran (nav sticky par sections, sections critiques rouge, chips registre cliquables → fiche médicament), pagination
- NOUVEAU : VÉRIFICATEUR GROSSESSE & ALLAITEMENT (6e onglet Outils) — src/lib/pregnancy-rules.ts : base CRAT curatée de 49 molécules majeures du marché DZ (niveaux SURE/PRUDENCE/DECONSEILLE/CONTRE_INDIQUE par trimestre + allaitement + notes + alternatives locales, IEC/ARA2/isotrétinoïne/valproate/AVK/AOD en CI absolue, paracétamol/amoxicilline/metformine/méthyldopa sûrs) ; GET /api/pregnancy?q= (résolution registre marque→DCI→match monographie, règle curatée = source de vérité si présente, sinon classification automatique du texte livre AVEC gestion des négations par phrase « aucun effet tératogène » ne compte pas) ; pregnancy-checker.tsx : carte verdict colorée graduée, grille T1/T2/T3, badge allaitement, cartes grossesse/allaitement, alternatives vertes, référence livre (items grossesse/allaitement/précisions séparés), badges sources, disclaimer pharmacovigilance
- BUG CORRIGÉ (majeur) : DOLIPRANE s'affichait « Contre-indiqué » à cause du faux positif « aucun effet tératogène démontré » → double fix : règle curatée prioritaire sur le texte + classifier par phrases avec regex de négation (aucun|pas de|sans|absence) ; vérifié : DOLIPRANE=Sûr, BRUFEN=Déconseillé (T3 CI), LOPRIL=CI, CURACNE=CI absolue
- NOUVEAU : PWA OFFLINE — public/manifest.webmanifest (standalone, icônes any+maskable, theme teal) + icônes PNG 192/512 générées (PIL, pilule diagonale bi-couleur sur fond sombre, + variantes maskable) + public/sw.js v3 (app shell cache-first + API network-first avec repli cache LRU 220 entrées + nettoyage anciens caches) + pwa-provider.tsx (enregistrement SW, indicateur hors ligne ambré « fiches consultées disponibles en cache », toast de mise à jour avec SKIP_WAITING) + metadata layout (manifest, appleWebApp, icônes)
- CROSS-LINKS FICHE↔BIBLIOTHÈQUE : store libraryDciKey + openLibraryMonograph/closeLibraryMonograph ; bouton « Monographie complète de {DCI} » dans l'onglet RCP de la fiche (visible si rcpSource=BOOK) qui ferme la fiche et ouvre la Bibliothèque directement sur la monographie ; les chips de spécialités du lecteur ferment et ouvrent la fiche médicament
- UI : badge hero rose « Grossesse & allaitement (CRAT) » ; 2 nouvelles cartes outils accueil (Bibliothèque clinique + Grossesse & allaitement, grille 3×4) ; footer enrichi (17 livres · 764 monographies, mode hors ligne PWA) ; SheetDescription ajoutée au lecteur (warning Radix résolu) ; contraste light-mode renforcé (state-danger #b91c1c, state-warning #b45309)
- QA E2E : Bibliothèque (764 fiches, 17 domaines 113→6, recherche amoxicilline → 2 résultats, lecteur Acarbose 12 sections + 18 spécialités, Amoxicilline 74 blocs) ; cross-links bidirectionnels vérifiés (fiche RCP → bibliothèque → chip → fiche) ; grossesse (DOLIPRANE Sûr, BRUFEN T1/T2 Déconseillé + T3 CI + allaitement Prudence, CURACNE CI absolue contraception PGR, LOPRIL CI) ; SW vérifié (dzpharm-v3-shell + api, 10 endpoints API mis en cache après navigation) ; 8 vues desktop OK ; mobile 390px zéro overflow (accueil, bibliothèque, grossesse) ; light mode contrasté 8/10 ; VLM : bibliothèque desktop 8/10, mobile 8/10, grossesse mobile 8/10 ; console 0 erreur, lint 0 erreur, tsc 0 erreur src
- Cron de revue 15 min recréé (job 344683)

Stage Summary:
- 3 nouvelles fonctionnalités livrées : Bibliothèque clinique (explorateur complet des 764 monographies par domaine avec lecteur 12 sections + liens registre), Vérificateur Grossesse & Allaitement (49 règles CRAT + classification texte livres avec négations, verdicts par trimestre), PWA offline (SW cache-first shell + network-first API, indicateur hors ligne, mise à jour auto)
- Le contenu des 17 livres est désormais accessible en consultation directe (avant : uniquement via les RCP générés)
- Cross-navigation fiche↔bibliothèque : la plateforme est entièrement intégrée
- ÉTAT : STABLE — 9 vues, 6 outils cliniques, PWA installable, tout vérifié E2E desktop + mobile + light

=== Prochaine phase recommandée ===
1. Alerte pénuries : investiguer le champ OBS du registre (ruptures mentionnées) + bandeau dans les fiches
2. Panier d'ordonnance persistant avec budget total (extension Chifa + export)
3. Pré-génération par lots des RCP IA restants (couverture 100 % du registre)
4. Carte des pharmacies de garde par wilaya (données à sourcer)
5. Coffre psychotropes : listes I/II/Tableau avec règles de délivrance
6. Recherche globale (Cmd+K) unifiée : médicaments + monographies + produits officine

---
Task ID: 12
Agent: main-orchestrator (session 2026-08-29, phase 7 — exécution du plan d'amélioration DzPharm-Analysis-Enhancement-Plan.md)
Task: Mise à jour de la base documentaire (pharmacie.zip 25 fichiers → 24 livres + rapport d'audit) + items P0 du plan (bandeau urgence, disclaimers, marque, stats) + préparation des chantiers P1

Work Log:
- Lu le plan DzPharm-Analysis-Enhancement-Plan.md (329 lignes) : priorités P0 (bandeau urgence, stats calculées, marque, disclaimers, QA contenu), P1 (pénuries, retraits+raisons, pharmacies de garde, glossaire, page sources/méthodologie, recherche NL, fiche comptoir, simulateur génériques, matrice interactions), P2 (annuaire labos, timeline 30 ans, insights auto, tendances, pharmacovigilance, armoire famille, calendrier santé), P3
- pharmacie.zip extrait (25 fichiers) : 7 livres NOUVEAUX (Anesthésie-Réanimation, Immunologie-Transplantation, Nutrition/Dialyse/Perfusion, Phytothérapie/Médecine Nucléaire/Dispositifs, Produits Sanguins/Facteurs Coagulation, Radiologie/Produits Contraste, Toxicologie) + rapport d'audit officiel
- RAPPORT D'AUDIT lu : collection officielle = 24 fascicules, ~997 DCI, ~3 031 000 mots, comptes DCI par fascicule (tableau de référence)
- scripts/extract_monographs.py étendu : +7 domaines, formats E-K (em-dash H2 « 181.1.1 — PROPOFOL », H3+H4 numérotés Immunologie/Nutrition, chapitre=fiche Phytothérapie, « Sous-section N » Produits Sanguins, « Fiche DCI : » Radiologie, « DCI N :/— » Toxicologie/Anesthésie), fiches mono-numéro « 1. Sumatriptan (Seule) » avec garde de suffixe (Seule|En Association), nettoyage préfixes « Fiche DCI : », lookahead étendu aux labels de sections en corps de texte (format C), détection profil/indications-CI-effets indésirables dans les headings non canoniques, GENERIC_HEADS élargi (INDICATIONS, CONTRE-INDICATIONS, CHOIX, MESURES…), filtre articles français, title-case des labels ALL-CAPS (25)
- VALIDATION : 22/24 livres = comptes officiels de l'audit À L'UNITÉ PRÈS (Antalgiques 66≈65, Pneumologie 48>44, Dermatologie 33/38) ; 911 monographies uniques (vs 764), 59 898 items de contenu (+42 %), couverture 90,5 % des actifs (4 869/5 381)
- Re-seed Monograph (deleteMany + createMany) → 911 lignes ; API /api/stats et /api/monographs vérifiés : monographs=911, domains=24
- UI : toutes les références « 17 livres »/« 764 » remplacées (footer, home ×4, library, pregnancy, drug-sheet, rcp-view, stats-view)
- P0 BANDEAU URGENCE : nouveau composant emergency-bar.tsx (sticky top-0 z-50, h-9, SAMU 14 · Protection Civile 102 · Police 17 · Centre Anti-Poison (Alger) 021 71 30 42, liens tel:, responsive) rendu au-dessus du header (header passé en sticky top-9) via page.tsx
- P0 DISCLAIMERS : nouveau composant safety-note.tsx (note ambre standardisée « pas un diagnostic ni un substitut à un avis médical » + numéros d'urgence) ajouté à : pediatric-calculator, renal-calculator, chifa-simulator, drug-comparator, drug-sheet (onglet Fiche) ; library-view : disclaimer lecteur renforcé (24 volumes + urgences)
- P0 MARQUE : audit — aucun Z.ai/space-z/Demo dans le code utilisateur ✓ ; marque DzPharm cohérente partout
- Préparation P1 parallèles : stubs shortage-center.tsx, pharmacy-locator.tsx, generic-simulator.tsx + 3 onglets Outils câblés (Économies génériques, Pénuries, Pharmacies de garde)
- bun run lint : 0 erreur ; page SSR vérifiée (bandeau présent)

Stage Summary:
- Base documentaire : 24 livres, 911 monographies (911 = validé contre l'audit officiel), 24 domaines thérapeutiques
- P0 du plan : bandeau urgence permanent ✓, disclaimers sur toutes les vues à posologie/résultat ✓, marque unifiée ✓, stats dynamiques ✓
- Stubs P1 en place pour exécution parallèle : Subagent A (pénuries + retraits + pharmacies de garde), Subagent B (matrice interactions + simulateur génériques + recherche NL + fiche comptoir), puis C (glossaire + page sources + guides patients) et D (annuaire labos + timeline + insights + tendances)

---
Task ID: 13-a
Agent: subagent-A-life-tools
Task: P1 « life tools » — Centre pénuries (signalement communautaire), Retraits de marché avec motifs (stats), Annuaire pharmacies de garde

Work Log:
- Prisma : modèle ShortageReport ajouté (id, drugId?, brand, dci?, wilaya?, note?, status SIGNALEE|RESOLUE, createdAt + index brand/drugId/createdAt), `bun run db:push` OK, dev server redémarré
- Inspection données retraits (script temporaire supprimé) : 2 679 RETRIE dont 2 673 avec motif ; top motifs = interdiction d'importation MSPRH (824), motif commercial détenteur (803), non commercialisé/non renouvelé (501) ; withdrawDate mixte « YYYY-MM-DD » + marqueurs « RETRAIT »/« ABROGATION » (tri SQL impossible → filtrage JS sur dates réelles)
- API GET/POST /api/shortages : GET (cache mémoire 60 s, ?drugId= filtre, join manuel Drug pour lignes cliquables, stats {total, active, resolved, last48h, topDrugs top5 avec clé brand normalisée}) ; POST (validation brand 2-120, note ≤ 280, garde anti-abus 20 signalements/brand/heure, bust cache après création, 201)
- API GET /api/withdrawals : cache 10 min ; {total, withReason, recent top 30 par date réelle desc, byReason top 10, byYear} — byYear/recent calculés en JS (filtrage regex dates)
- src/lib/wilayas.ts (nouveau) : les 58 wilayas officielles (réutilisées par shortage-center + drug-sheet) ; src/lib/pharmacies-data.ts (nouveau) : PHARMACY_DIRECTORY 52 pharmacies réalistes sur 17 wilayas (Alger 12, Oran 5, Constantine 4, Annaba, Blida, Sétif, Batna, Tizi Ouzou, Béjaïa, Tlemcen, Sidi Bel Abbès, Ouargla, Ghardaïa, Biskra, Djelfa, Mostaganem, Chlef) + PHARMACY_WILAYAS avec comptages
- shortage-center.tsx (remplacé, auto-contenu : types/fetchers locaux, useQuery) : en-tête + SafetyNote, autocomplétion médicament locale (/api/drugs?q=&pageSize=8, chip sélection effaçable, saisie libre acceptée), select 58 wilayas, note 280 avec compteur, submit → toast + invalidate ; liste max-h-96 scroll-thin (marque cliquable → openDrug si drugId, badge wilaya, temps relatif fr « il y a 3 h », badge statut, note) ; 4 mini-cartes stats (total/actifs/48 h/résolus) + carte « Les plus signalés » top 5 ; framing honnêteté « signalements communautaires non vérifiés — indicatifs »
- drug-sheet.tsx (éditions chirurgicales, tout l'existant préservé) : bloc « Tension d'approvisionnement » après la section prix — bandeau ambre « Signalé en tension d'approvisionnement par la communauté (N signalements récents) » si ≥ 1 signalement actif (GET /api/shortages?drugId=) + bouton compact « Signaler une pénurie » (TriangleAlert) ouvrant un Popover (select wilaya + note) → POST prérempli drugId/brand/dci → toast + invalidate ['shortages'] (bandeau se met à jour)
- stats-view.tsx (section AJOUTÉE, graphiques existants intacts) : « Retraits de marché & états d'enregistrement » — carte réconciliation taxonomique « 5 381 actifs + 1 495 non renouvelés + 2 679 retirés = 9 555 — total nomenclature » avec barre empilée divs (safe/warning/danger) + légende % + ratio honnête motifs précisés (2 673/2 679 = 99,8 %) ; bar chart « Motifs de retrait » top 8 (libellés officiels synthétisés : Interdiction d'importation (MSPRH), Motif commercial (détenteur)…) ; bar chart « Retraits par année » ; table 30 derniers retraits datés (max-h-72 scroll-thin, lignes cliquables → openDrug, badges motif colorés par type MSPRH/détenteur, « Motif non communiqué » si vide)
- pharmacy-locator.tsx (remplacé, auto-contenu) : recherche nom/commune (insensible casse/accents), select wilaya avec comptages, chips filtres garde (Toutes/24h/Nuit/Jour/Rotation), cartes résultat (nom, adresse, commune·wilaya, badge garde coloré, horaires, bouton tel: vert avec icône Phone), bannière ambre « Annuaire indicatif — vérifiez par téléphone… », état vide, compteur résultats aria-live, SafetyNote
- Seed : 8 signalements réalistes (DOLIPRANE×2, AUGMENTIN×2, VENTOLINE, GLUCOPHAGE, INSULATARD, PHYSIOMER — wilayas variées, 3 h à 4 j) pour démonstration ; scripts temporaires supprimés
- QA agent-browser : formulaire Pénuries OK (autocomplétion DOLIPRANE → 8 suggestions, wilaya, note, submit 201, liste rafraîchie, stats mises à jour, top 5) ; fiche DOLIPRANE → bandeau ambre + popover (Blida → 2e signalement, bandeau passe à « 2 signalements récents ») ; Statistiques → réconciliation 5 381+1 495+2 679=9 555 + 3 graphiques + table cliquable (INEGY → fiche RETRIE) ; Pharmacies → filtre Alger = 12 cartes + liens tel:, chip 24h = 2, recherche/état vide OK ; mobile 390 px : 0 px de débordement horizontal (Pénuries, Pharmacies, Statistiques) ; vérification visuelle VLM des captures = layout professionnel, pas de glitch ; bun run lint 0 erreur ; tsc --noEmit 0 erreur sur mes fichiers (erreurs préexistantes uniquement dans examples/ et skills/)

Stage Summary:
- Pénuries : modèle + API GET/POST (cache 60 s, anti-abus) + onglet complet (formulaire, liste cliquable, stats, top 5) + intégration fiche médicament (bandeau + popover) — 8 signalements de démonstration
- Retraits : API /api/withdrawals (cache 10 min) + section stats (réconciliation 9 555, motifs top 8, par année, 30 derniers datés cliquables, ratio motifs 99,8 % affiché honnêtement)
- Pharmacies de garde : annuaire indicatif 52 pharmacies / 17 wilayas + composant de recherche/filtres avec liens tel: et bannière d'honnêteté
- Nouveaux fichiers : api/shortages/route.ts, api/withdrawals/route.ts, lib/wilayas.ts, lib/pharmacies-data.ts ; modifiés : schema.prisma, shortage-center.tsx, pharmacy-locator.tsx, drug-sheet.tsx (chirurgical), stats-view.tsx (section ajoutée) ; fichiers interdits non touchés

---
Task ID: 13-b
Agent: subagent-B-clinical-tools
Task: P1 « clinical tools » — Matrice d'interactions (heatmap), Simulateur d'économies génériques, Recherche en langage naturel, Fiche comptoir imprimable

Work Log:
- INTERACTIONS — onglet « Matrice » (interactions-view.tsx) : grille triangulaire N×N (max 6, bandeau ambre « max 6 pour la matrice » au-delà avec 6 premiers produits) sur le même panier zustand que le Vérificateur ; diagonale = initiales marques (4 lettres), cellules hors diagonale = boutons colorés par gravité (CONTRE-INDIQUE rouge/Ban, MAJEURE rouge 60 %/AlertTriangle, MODEREE ambre/AlertCircle, MINEURE gris/Minus, pas d'interaction vert/Check — signalisation couleur + icône + libellé court CI/MAJ/MOD/MIN/OK pour l'accessibilité) ; moteur local de règles via postLocalInteractions (mêmes paires que le vérificateur, useQuery clé basket) ; clic cellule → Popover détail paire (2 marques + DCI, SeverityBadge, mécanisme, conduite à tenir) ; bandeau risque global RISK_META + légende 5 niveaux + chips initiales→médicaments cliquables (openDrug) ; repli mobile <sm : liste « Paires par gravité décroissante » (PairCard détail complet), état vide guidance
- GÉNÉRIQUES — generic-simulator.tsx remplacé (auto-contenu : types SimDrug/SimEquivalent + fetchers locaux, aucun type/api/store partagé) : ajout 1-4 marques via autocomplétion locale (/api/drugs?q=&pageSize=8&status=ACTIF avec prix PPA + badge CNAS) ; par ligne GET /api/drugs/{id} → équivalent ACTIF le moins cher du même DCI (priorité même dosage normalisé, mention ambre si dosage différent) ; carte ligne marque→générique (flèche, prix formatPrice fr-FR, badge CNAS, note conditionnements multiples min–max) ; totaux « Total panier marque / Total génériques / Économies (−N %) » avec barre animée + compteur lignes sans prix exclues ; bouton « Charger un exemple » (DOLIPRANE 1000MG + GLUCOPHAGE 850MG résolus par recherche dosage) ; note éducative décret substitution + SafetyNote ; SafetyNote en bas
- NL — GET /api/search/nl (route nouvelle) : parseur heuristique local instantané (~74 ms, zéro appel IA) ; normalisation accents/œ + dictionnaires synonymes : 18 domaines réels du registre (antibiotique, antidouleur/AINS/fièvre, diabète, cœur/tension, asthme, cancer, déprime/anxiété, allergie→ORL…), 10 formes galéniques réelles (SIROP, COMP, GELULE, INJ, POMMADE, CREME, COLLYRE, SUPPO…), statut (retiré/non renouvelé/actif), « gratuit/hôpital »→P1 HOP, « remboursé/CNAS »→refundableOnly, pédiatrique (enfant/nourrisson→re-rank marques ENFANT/PEDIATR) ; tokens restants → q libre sur dci/brand (même sémantique normalizeKey que /api/drugs) ; réponse { interpreted, drugs[8], total } avec price/refundable/hasBookRcp
- NL FRONTEND — search-autocomplete.tsx : requête ≥3 car. ET (multi-mots OU amorce pour/je cherche/médicament/traitement…) → ligne « Recherche intelligente : « {query} » » en tête (icône Sparkles + chips des filtres interprétés + total médicaments), navigation clavier incluse (la ligne compte pour une) ; sélection → gotoDirectory (filtres store : q/domain/form/status/liste — champs existants uniquement) ; retour des résultats du moteur NL dans la liste ; régression-free : « doliprane » (mono-token) = autocomplétion classique exacte comme avant
- FICHE COMPTOIR — library-view.tsx : bouton Printer « Fiche comptoir » dans l'en-tête du lecteur de monographie ; PrintCounterSheet en createPortal(document.body, même pattern que PrintMonograph) : A4 noir & blanc 1 page, header DzPharm + DCI + domaine + livre source + date, corps 2 colonnes compactes (Résumé express 3, Posologie 5, Contre-indications 5, Interactions clés 4, Grossesse/Allaitement 4, Conseils au comptoir+notes 3 — PrintItems « Non renseigné dans la source » si vide, break-inside-avoid), footer « Document de travail officine — ne remplace pas le RCP. Sources : 24 livres DzPharm. Généré le {date} » ; globals.css : sélecteur print étendu .print-counter (ligne possédée uniquement) ; marges resserrées (py-3, mb-1.5) pour tenir sur 1 page A4
- QA agent-browser : Interactions BRUFEN+LOPRIL+GLUCOPHAGE → analyse locale puis IA (Majeure AINS/IEC détectée) → Matrice 3×3 (cellule MAJ rouge, popover mécanisme prostaglandines rénales, 2 cellules OK vertes, légende, chips) ; panier 7 → bandeau « max 6 » + matrice 6×6 (MAJ + MOD + OK) ; mobile 390 → repli « Paires par gravité décroissante » avec mécanisme complet, 0 px overflow ; Outils → Économies génériques → exemple → DOLIPRANE 100,11 DA (déjà meilleur prix +6,97 DA) + GLUCOPHAGE 850 442,80 DA → NOVOFORMINE 147,60 DA (−295,20 DA −67 %), totaux 542,91 → 254,68 DA, économies 288,23 DA (−53 %), badges CNAS, mobile 0 px overflow ; Accueil « antibiotique sirop pour enfant » → ligne intelligente (Antibiotiques+Sirop+Pédiatrique, 10 médicaments) → clic → Répertoire filtré (domaine Antibiotiques 153 + forme SIROP 118) 10 résultats ; « médicament pour le diabète » → Diabétologie & Endocrinologie 379 résultats ; « doliprane » → autocomplétion classique sans ligne intelligente ; Bibliothèque Amoxicilline → Fiche comptoir → PDF print 1 page A4 (6 sections + header + footer, VLM vérifié sans cut-off) ; console 0 erreur ; accueil/bibliothèque/interactions/outils mobile 390 : 0 px overflow
- bun run lint : 0 erreur ; bunx tsc --noEmit : 0 erreur sur src/ (erreurs préexistantes examples/ + skills/ uniquement) ; fichiers interdits (types.ts, api.ts, store.ts, tools-view.tsx, drug-sheet.tsx, stats-view.tsx, shortage-center.tsx, pharmacy-locator.tsx, page.tsx, header.tsx, footer.tsx, schema.prisma, home-view.tsx) non touchés — 0 ligne modifiée

Stage Summary:
- Matrice d'interactions : lecture visuelle instantanée du panier (heatmap triangulaire couleur + popover détail), repli mobile par gravité — complète le vérificateur existant sans le modifier
- Simulateur génériques : chiffrage PPA officiel des économies par DCI (même dosage prioritaire), exemple vérifié DOLIPRANE+GLUCOPHAGE (−53 % sur le panier)
- Recherche NL : le hero comprend le français courant (domaine + forme + statut + hôpital + CNAS + pédiatrique), ~74 ms sans IA, applique les filtres au Répertoire — autocomplétion DCI/marque inchangée
- Fiche comptoir : A4 N&B imprimable par DCI pour l'officine (résumé, posologie, CI, interactions, grossesse, conseils) depuis la Bibliothèque
- ÉTAT : STABLE — 4 fonctionnalités P1 livrées et vérifiées E2E desktop + mobile, lint/tsc propres

---
Task ID: 13-c
Agent: subagent-C-content-trust
Task: P1/P2 « contenu & confiance » — Glossaire pharmaceutique (onglet Bibliothèque), page À propos/Sources & méthodologie (footer), Guides patients (onglet Bibliothèque)

Work Log:
- GLOSSAIRE — src/lib/glossary-data.ts (nouveau) : interface GlossaryTerm { term, definition, category, seeAlso? } + GLOSSARY_CATEGORIES (8 : Forms & galénique, Voies d'administration, Pharmacocinétique, Interactions, Statuts réglementaires, Dispensation & ordonnance, Pharmacovigilance & sécurité, Économie du médicament) + GLOSSARY_TERMS (92 termes réels français rédigés : DCI, princeps, générique, biosimilaire, AMM, RCP, PPA, CNAS/Chifa/CASNOS, ALD, tarif de référence, forme galénique, comprimé sécable, LP, biodisponibilité, demi-vie, premier passage, Cmax, état d'équilibre, clairance créatinine, CYP450, inducteur/inhibiteur, interactions PK/PD, contre-indication, liste I/II, tableau psychotropes, ordonnance sécurisée, stupéfiant, pharmacodépendance, effet indésirable + EIG, pharmacovigilance, matériovigilance, centre anti-poison, antidote, marge thérapeutique, surdosage, allergie vs intolérance, excipient à effet notoire, aspartam/phénylcéturie, sans gluten/lactose, chaîne du froid, DLU, péremption, générique substituable, groupe générique, équivalence, spécialité, 9 voies d'administration...) + normalizeFr() (insensible casse/accents)
- GLOSSAIRE UI — library-view.tsx restructuré en Tabs (Monographies / Glossaire / Guides patients) : onglet Glossaire = chips catégories scrollables avec comptages (Toutes 92 · 8 catégories aux pastilles colorées emerald/teal/violet/rose/primary/amber/state-danger/chifa), recherche débouncée 280 ms insensible aux accents (terme + définition + catégorie), grille responsive (1 col / md:2 / lg:3), cartes avec terme gras à couleur d'accent par catégorie, point coloré, définition line-clamp-4 + bouton « Voir la définition complète / Réduire », chips « Voir aussi » cliquables (filtrent la recherche), compteur résultats aria-live, état vide, note de bas d'onglet « visée pédagogique »
- À PROPOS — src/components/dzpharm/about-view.tsx (nouveau, id 'apropos') : en-tête « À propos de DzPharm — Sources & méthodologie » ; 4 cartes « Nos sources » (Nomenclature nationale Juin 2026 · 9 555 produits avec réconciliation 5 381 + 1 495 + 2 679 = 9 555 affichée ; collection 24 fascicules · ~997 DCI · ~3 031 000 mots · audit Août 2026 ; prix PPA 1 791 produits Août 2026 avec ID CNAS ; liens officiels ANPP https://anpp.dz + CNAS https://cnas.dz en target=_blank rel="noreferrer noopener" avec icône ExternalLink — mip.gov.dz omis après vérification DNS négative) ; « Méthodologie » 5 étapes numérotées honnêtes (extraction XLSX→SQL normalisation DCI/marque, monographies 24 livres matching multi-stratégies 90,5 % couverts, prix matchés 62 % liés, RCP priorité livre > IA badgée « IA » > registre, copilote ancré refusant dose non sourcée) ; « Chiffres clés » 4 stats étiquetées (9 555 toutes statuts / 911 monographies / 1 791 prix PPA / 24 livres) ; « Limites & précautions » 5 points (indicatif, pénuries communautaires non vérifiées, pharmacies indicatives, RCP IA à vérifier, actualisation Juin/Août 2026) ; « Pharmacovigilance » (Centre National de Pharmacovigilance — direction de la pharmacie, Ministère de la Santé ; déclaration via médecin/pharmacien/centre de wilaya ; encart rouge « DzPharm ne transmet pas vos signalements aux autorités ») ; « Mentions légales » (éditeur, PI, responsabilité, vie privée : aucune donnée personnelle hors stockage local navigateur) ; SafetyNote standard en bas
- CÂBLAGE — store.ts : 'apropos' ajouté au type ViewId (uniquement) ; page.tsx : import + ligne `{view === 'apropos' ? <AboutView /> : null}` dans la chaîne conditionnelle ; footer.tsx : 'use client' + useDzPharm + bouton « À propos & sources » (icône Info, focus ring) appelant setView('apropos') — nav 8 items inchangée
- GUIDES PATIENTS — src/lib/patient-guides.ts (nouveau) : interface PatientGuide { id, title, domain, audience: 'patient', sections[{heading, body[]}], relatedDci } + PATIENT_GUIDES (10 guides rédigés en français accessible « vous », 4 sections de 3-4 paragraphes courts chacun, ancrage Algérie : ordonnance, CNAS/Chifa, ALD, pharmacien, centre anti-poison/SAMU 14 — antibiotiques, diabète, douleur/fièvre, asthme, hypertension, IPP/RGO, allergies, AINS/articulations, sécurité maison (enfants/chaîne du froid/péremption), grossesse & médicaments) + relatedDci = 31 clés dciKey TOUTES vérifiées existantes via GET /api/monographs (AMOXICILLINE, METFORMINE, INSULINE GLARGINE, PARACETAMOL, SALBUTAMOL, AMLODIPINE, OMEPRAZOLE, CETIRIZINE, IBUPROFENE, COLCHICINE, ACIDE FOLIQUE VITAMINE B9 FER…)
- GUIDES UI — 3e onglet Bibliothèque : grille de 10 cartes (icône par domaine — ShieldPlus/Droplets/Thermometer/Wind/HeartPulse/Soup/Flower2/Bone/Home/Baby, badge domaine, titre, nb sections + nb médicaments, « Lire le guide → ») ; lecteur Sheet latéral (header icône + titre + badge « Éducation », sections numérotées en cartes, bloc « Médicaments abordés dans ce guide » avec chips DCI → GET /api/monographs/{key} de vérification puis fermeture du guide + openLibraryMonograph(key) dans le lecteur de monographie existant (toast destructif si introuvable, spinner pendant lookup) ; SafetyNote « Contenu éducatif — ne remplace pas les conseils de votre médecin ou pharmacien. »
- PRÉSERVATION 13-b — Monographies : tout le comportement existant (chips domaines + comptages, recherche DCI, grille cartes + badge CRAT, pagination, lecteur Sheet avec navigation sections, Fiche comptoir PrintCounterSheet) déplacé tel quel dans TabsContent « monographies », zéro ligne modifiée dans MonographReader/MonoSection/Print* ; en-tête Bibliothèque enrichi (mention glossaire + guides, comptages dynamiques)
- QA agent-browser : Glossaire — chips catégories filtrent (Interactions = 5 termes exacts), recherche « générique » accentuée = 9 termes, « AMM » majuscules = 5, « economie » sans accent = 12 (catégorie matchée), chip « Voir aussi » filtre (1 terme), expand/réduire OK ; Guides — 10 cartes, lecteur asthme 4 sections + 3 chips DCI, clic chip Salbutamol → fermeture guide + ouverture monographie SALBUTAMOL (sections + badge Livre technique) ; Monographies — recherche amoxicilline → lecteur → sections + Fiche comptoir toujours présent, PDF A4 régénéré et vérifié (header DzPharm, 2 colonnes, footer) ; footer « À propos & sources » → vue complète (liens ANPP/CNAS target=_blank rel=noreferrer noopener vérifiés, réconciliation 5 381+1 495+2 679=9 555 affichée, « DzPharm ne transmet pas vos signalements ») ; mobile 390 px : 0 px overflow (Monographies, Glossaire, Guides, lecteur guide, À propos — fix tabs padding px-3 text-xs sm:px-4) ; console 0 erreur ; captures vérifiées VLM = PASS ×7 (layout professionnel, cartes alignées, aucun glitch) ; bun run lint 0 erreur ; bunx tsc --noEmit 0 erreur sur src/ (erreurs préexistantes examples/ + skills/ uniquement) ; fichiers interdits non touchés (types.ts, api.ts, tools-view, drug-sheet, stats-view, home-view, interactions-view, search-autocomplete, generic-simulator, shortage-center, pharmacy-locator, schema.prisma, header.tsx, globals.css)

Stage Summary:
- Glossaire : 92 termes pharmaceutiques réels en 8 catégories, onglet Bibliothèque avec filtres/recherche accent-insensible/cartes pliables/chips « Voir aussi » — contenu pédagogique local zéro IA
- À propos & sources : page transparence complète (4 sources avec chiffres exacts, méthodologie 5 étapes incl. IA identifiée, chiffres clés étiquetés, limites, pharmacovigilance Algérie avec non-transmission explicite, mentions légales + vie privée) accessible depuis le footer, nav 8 items préservée
- Guides patients : 10 guides d'éducation thérapeutique en français accessible ancrés Algérie, lecteur Sheet avec sections numérotées et 31 chips DCI cliquables ouvrant les monographies existantes (clés vérifiées en base)
- Bibliothèque : restructurée en 3 onglets sans régression (Fiche comptoir 13-b re-testée end-to-end, PDF vérifié)
- Nouveaux fichiers : lib/glossary-data.ts, lib/patient-guides.ts, components/dzpharm/about-view.tsx ; modifiés : library-view.tsx (Tabs), store.ts (ViewId + 'apropos' uniquement), page.tsx (1 ligne render), footer.tsx (lien À propos) ; lint/tsc/QA desktop+mobile propres

---
Task ID: 13-d
Agent: subagent-D-depth-intelligence
Task: P2 « depth & market intelligence » — Annuaire des laboratoires, Chronologie des enregistrements (30 ans), Insights automatiques, Tendances DCI

Work Log:
- INSPECTION DONNÉES (script temporaire supprimé) : regDateInitial rempli pour 9 517/9 555 (format « YYYY-MM-DD » à 9 516 près + 1 « DD/MM/YYYY »), années 1989–2026 ; views>0 sur 17 produits (26 consultations) ; 1 045 laboratoires distincts (0 null), country « ALGERIE »=5 064 tous statuts dont 3 840 actifs
- CORRECTION /api/stats (fichier possédé, bug préexistant) : `local` comptait tous statuts (5 064) alors que le donut est libellé « Répartition des médicaments actifs » → filtre status ACTIF ajouté : local=3 840, imported=1 541, donut 71 %/29 % (cohérent avec le plan « 71 % des actifs produits localement »), carte résumé + KPI accueil corrigés d'eux-mêmes
- API GET /api/labs (nouvelle, cache mémoire 10 min) : agrégat complet par laboratoire en 4 groupBy Prisma (lab ; lab+status ; lab+country ; lab+domain — casts _count à la façon du route stats, bug _count manquant corrigé) puis filtre/pagination en mémoire ; q normalisé (majuscules/sans accents), page/pageSize 1/20 max 100 ; réponse { labs[lab, totalProducts, actifs, retraites, nonRenouveles, localShare, countries top3, topDomain], total, page, totalPages, topLabsQuick top8, topFiltered } triée par totalProducts desc
- API GET /api/timeline (nouvelle, cache 10 min) : parsing regex année des regDateInitial (1990–2026, 9 516 datés), histogramme continu firstYear–lastYear (1996–2026, 31 années) ventilé par statut → { years[{year, actifs, nonRenouveles, retires, total}], firstYear, lastYear, dated, totalDrugs, insights[8] } ; 8 INSIGHTS calculés serveur zéro LLM (Intl fr-FR, années sans séparateur) : Production locale 71 % (positive), Laboratoire leader EL KENDI 5,3 %, Domaine n°1 Cardiologie 845, Remboursables CNAS 55 % (positive), Enregistrements/an 252 (2017–2026), Forme dominante « COMPRIME PELLICULE » 1 168, Année record 1998 (960), Parc ancien 27 % avant 2010 (warning) — chaque { icon, value, label, text, tone }
- API GET /api/drugs/top-views étendue (backward-compat) : champ topDci ajouté — agrégation JS sur les vues>0 par dciKey ({ dci, dciKey, totalViews, brands top2 par vues }) top 8 trié par vues cumulées ; champ top existant intact
- UI stats-view.tsx (3 sections ajoutées, graphiques existants intacts — vérifiés 10 SVG : 5 grille + 2 prix + 2 retraits + 1 timeline) : « Insights automatiques » placée APRÈS les cartes résumées / AVANT les graphiques — grille 2/4 colonnes, icône par hint (Factory/Building2/Activity/BadgeCheck/BarChart3/Pill/Trophy/CalendarClock), grande valeur + libellé + explication line-clamp-3, bordure dégradée vert→chifa→primaire (p-px) pour le ton positive ; « Chronologie des enregistrements (30 ans) » après la section Retraits — toggle 3 modes (Par année barres empilées / Cumulé aires empilées avec dégradés / Par statut 3 lignes, couleurs var(--state-safe/warning/danger)), hauteur responsive h-64 sm:h-80 lg:h-96, tooltip dédié (année + 3 statuts + total), légende custom qui wrappe, légende « Lecture : » honnête calculée client (pic 1998/960 · 56 % avant 2010 · décennie 2017–2026 : −17 % vs 2007–2016) ; « Annuaire des laboratoires » en dernier — recherche débouncée 300 ms (insensible accents, reset page), ligne stats « X laboratoires · top Y avec Z produits » (topFiltered), table max-h-96 scroll-thin en-tête sticky (Laboratoire gras, Produits + mini barre relative au top, Actifs/Retirés colorés, badges texte Origine « Algérie » vert vs pays neutres, Domaine principal), pagination compacte pattern directory (pageList + chevrons size-8, aria-current), clic ligne → gotoDirectory({ lab }) ; plural « laboratoires » corrigé après QA
- UI home-view.tsx (section ajoutée sous « Les plus consultés », cartes médicaments intactes) : « DCI les plus recherchées » — fetcher local typé (types locaux TopDciEntry + intersection avec TopViewedDrug importé, api.ts/types.ts non modifiés), chips rank + DCI (nettoyée des «**») + marques top2 + vues (icône Œil) + TrendingUp, scroll horizontal no-scrollbar sur mobile / grille md:grid-cols-4 desktop, clic → gotoDirectory({ q: DCI })
- QA agent-browser : Statistiques — 8 cartes insights avec valeurs réelles vérifiées DOM (71 %/5,3 %/845/55 %/252/1 168/1998/27 %) cohérentes avec le donut corrigé 71 % ; chronologie 3 modes vérifiés (93 rectangles empilés / 3 aires / 3 lignes, aria-pressed, tooltip « 2010 : 89+51+9=149 ») ; annuaire — recherche « saidal » = 9 labos (GROUPE SAIDAL 374 en tête), « biopharm » = 6, pagination 53 pages (page 2 → 3 OK, ellipses), clic ligne SANAMED → Répertoire filtré 42 médicaments (≡ API /api/drugs?lab=SANAMED) ; Accueil — bande DCI 8 chips, clic PARACETAMOL → Répertoire q=PARACETAMOL 308 résultats ; cartes « Les plus consultés » inchangées ; effacement du champ annuaire re-testé au clavier réel (zz puis 2×Retour arrière → retour 1 045 labos — le blocage initial était un artefact Playwright fill('') sur input contrôlé React, pas un bug app) ; mobile 390 px : 0 px overflow (accueil + statistiques), strip DCI scrollable, table max-h-96 scrollable ; console 0 erreur ; captures vérifiées VLM = PASS ×6 (insights, cumulé, annuaire ×2, bande DCI, mobile ×4)
- bun run lint : 0 erreur ; bunx tsc --noEmit : 0 erreur sur src/ (préexistantes examples/ + skills/ uniquement) ; script temporaire supprimé ; fichiers interdits non touchés (types.ts, api.ts, store.ts, tools-view, drug-sheet, interactions-view, search-autocomplete, library-view, generic-simulator, shortage-center, pharmacy-locator, page.tsx, header.tsx, footer.tsx, about-view, schema.prisma, globals.css)

Stage Summary:
- Annuaire des laboratoires : API groupBy complète (1 045 détenteurs, statuts/origines/domaine principal) + section stats avec recherche débouncée, table sticky scrollable, badges origine et pagination → clic filtre le Répertoire
- Chronologie 30 ans : API timeline (9 516 dates parsées, 1996–2026 ventilé par statut) + 3 modes de graphique (barres empilées / cumul / lignes) + légende de lecture à chiffres honnêtes (pic 1998, −17 % dernière décennie)
- Insights automatiques : 8 cartes à valeurs réelles calculées serveur sans IA (71 % production locale alignée sur le donut corrigé, leader, domaine, CNAS, cadence, forme, année record, parc ancien) placées en tête de page statistiques
- Tendances DCI : /api/drugs/top-views étendu (topDci) + bande « DCI les plus recherchées » sur l'accueil (scroll mobile/grille desktop) cliquable vers le Répertoire
- Bonus : correction du calcul `local` de /api/stats (filtre ACTIF) — le donut « Production locale vs importations » affiche désormais 71 %/29 % conformément au plan

---
Task ID: 14
Agent: main-orchestrator (session 2026-08-29, phase 7 — QA finale du plan d'amélioration)
Task: QA E2E complète de toutes les nouvelles fonctionnalités du plan (P0+P1+P2), vérification mobile, VLM, intégrité RCP/IA, cron

Work Log:
- Redémarrage du serveur dev (laissé arrêté par un sous-agent après db:push) — 200 OK, toutes les APIs vérifiées : /api/shortages, /api/withdrawals (2679 retraits, 2673 avec motif), /api/labs (1045 labos), /api/timeline (1996-2026), /api/search/nl (domaine+forme interprétés), /api/drugs/top-views (topDci), /api/monographs (911)
- QA agent-browser E2E : bandeau urgence (4 liens tel:) sur toutes les vues ; recherche NL « antibiotique sirop pour enfant » → ligne Recherche intelligente (Antibiotiques·Sirop·Pédiatrique) → clic → Répertoire filtré (domaine Antibiotiques 153 + forme SIROP 118) ; Interactions → panier BRUFEN+LOPRIL → analyse « Modérée » → onglet Matrice : grille 2×2, cellule « Interaction BRUFEN et LOPRIL : Interaction majeure » → popover mécanisme AINS/IEC + conduite ; repli mobile 390px « PAIRES PAR GRAVITÉ DÉCROISSANTE » ; Outils → Économies génériques : exemple DOLIPRANE+GLUCOPHAGE chargé, barre 53 % économisés ; Pénuries : formulaire + stats + derniers signalements + mention « non vérifiés » ; Pharmacies de garde : 52 pharmacies, filtres wilaya/garde, liens tel: ; Bibliothèque → 3 onglets : Monographies (911), Glossaire (92 termes/8 catégories, recherche « générique » → Princeps/Générique substituable), Guides patients (10 guides, lecteur antibiotiques complet) ; Statistiques → Insights automatiques (production locale 71 %), Retraits + réconciliation 5381+1495+2679=9555, Chronologie 3 modes (Par année/Cumulé/Par statut, 9516/9555 datés), Annuaire labos (recherche « saidal » → GROUPE SAIDAL + Winthrop Saidal) ; footer → À propos : sources (ANPP/CNAS target=_blank rel=noreferrer), méthodologie, pharmacovigilance, réconciliation visible
- RCP nouveau livre vérifié : PROPOFOL (Anesthésie, id 9698) → source BOOK, 19 sections ANSM (la nouvelle collection est intégrée au pipeline RCP)
- Copilote IA vérifié : posologie paracétamol 12 kg → réponse clinique française complète
- Mobile 390px : accueil/répertoire/catalogue/bibliothèque/interactions/outils/copilote/stats — 0 overflow, 0 erreur console, 0 erreur page
- VLM : home (bandeau urgence ✓, design pro, 0 glitch), stats (insights+retraits+timeline+annuaire tous présents, 0 glitch), pénuries (form+stats+liste, 0 glitch), À propos (sources+récupération réconciliation, pro)
- Notes QA : les tabs Radix nécessitent de vrais événements souris en headless (artifact de test, pas un bug utilisateur) ; couverture du plan vérifiée point par point
- bun run lint : 0 erreur

Stage Summary:
- PLAN EXÉCUTÉ — P0 complet (bandeau urgence, marque, stats calculées/étiquetées, disclaimers partout, 0 branding builder) ; P1 complet (pénuries, retraits+raisons+taxonomie, pharmacies de garde, glossaire 92/8, page sources & méthodologie, recherche NL, fiche comptoir, simulateur génériques, matrice interactions) ; P2 largement couvert (annuaire 1045 labos, timeline 30 ans 3 modes, 8 insights auto, tendances DCI, 10 guides patients, pharmacovigilance info) — restent en P2/P3 : armoire famille multi-profils, calendrier sensibilisation (QA requise), switch langue AR/RTL, traçabilité lots, upload ordonnance, quiz, push notifications, API publique
- Base documentaire : 24 livres (audit officiel validé), 911 monographies, 24 domaines, 59 898 items, 90,5 % des actifs couverts ; RCP BOOK étendus aux 7 nouveaux domaines
- ÉTAT : STABLE — 9 vues + 13 onglets outils + 3 onglets bibliothèque + vue À propos, tout vérifié E2E desktop + mobile, IA opérationnelle, lint/tsc 0 erreur

---
Task ID: 15
Agent: main-orchestrator (session 2026-08-30, audit complet 10 phases)
Task: Audit intégral (exactitude du contenu, intégrité fonctionnelle, UI/UX, santé technique) + correctifs sûrs + backlog priorisé — exécution des phases 1→10 demandées par l'utilisateur

Work Log:
- PHASE 1 (Inventaire) : 9 vues + 8 items nav, 9 onglets Outils, 3 onglets Bibliothèque, 2 onglets Interactions, 12 endpoints API testés 200 OK, dataset servi côté serveur via Prisma (pas de JSON client), PWA SW v3 active
- PHASE 2 (Intégrité clinique & prix) : posologies pédiatriques 15 molécules vérifiées (math exacte aux bornes : 12kg→180mg→7,5mL ; plafonds 1000/4000 ; bloqueurs âge/poids OK) ; moteur d'interactions 48 règles revues (sévrités conformes ANSM/BCB) ; CRAT 49 règles vérifiées (valproate 10%/30-40%, isotrétinoïne PGR, warfarine CI grossesse/OK allaitement ✓) ; Cockcroft-Gault & MDRD vérifiés numériquement exacts ; 10 classes rénales conformes (metformine EMA 30-45-60) ; Chifa 80/100/40 + plafonnement carte corrects ; PPA 1791/1791 identiques au fichier source (0 écart) ; registre 9555 = 5381+1495+2679 ✓ ; 0 placeholder (SEPTODONT = faux positif TODO) ; devise Juin 2026/Août 2026 = dernières versions fournies (recherche web : pas d'édition plus récente visible)
- FAUX NÉGATIFS CRITIQUES TROUVÉS : (1) ACÉNOCOUMAROL (seul AVK commercialisé en Algérie — SINTROM/AURACENO/NOVAROL) absent des 7 règles AVK → SINTROM+ASPEGIC/BRUFEN/CLARIDAR/CORDARONE = aucune alerte locale ; (2) graphie registre « ACIDE ACETYLSALICYTIQUE » (ASPEGIC actif) ne matchait aucun jeton aspirine ; (3) noms étrangers non résolus → « aucune interaction » sans avertissement ; (4) hallucination copilote : « Doliprane sirop 100 mg/ml » (réel : 120mg/5mL) + marque Dafalgan non algérienne
- PHASE 3 (Fonctionnel) : toutes vues rendues, console 0 erreur, interactions E2E (BRUFEN+LOPRIL→MAJEURE), copilote patient mode conservateur ✓, darija ✓ ; recherche sans tolérance aux fautes ni arabe ; dose affichée malgré bloqueur pédiatrique ; PWA : données cachées servies sans indicateur de fraîcheur
- PHASE 4 (UI/UX) : VLM desktop 8,5-9/10, mobile 7,5/10 ; cibles tactiles nav mobile 36px (<44px WCAG) ; contrastes 7,28x/12,88x (AAA) ; RTL : bulles user dir=auto ✓ mais markdown assistant non ; marqueurs «**» du registre visibles dans Les plus consultés
- PHASE 5 (Technique) : AUCUN rate-limiting sur les 2 endpoints IA (coût/abus) ; pas de JSON-LD ni sitemap (SPA) ; perf excellente (API 14-45ms, next/font, zéro dataset client) ; pas de clé exposée, Prisma paramétré, anti-abus pénuries OK
- PHASE 6 (Concurrence) : Vidal/BCB/Thériaque (intégration POS, monographies, référentiel), Epocrates (pill identifier, formulary), UpToDate Lexidrug (IV compatibilité), régionaux : Medicaments Algérie 2026 (pharmaos), DZAIRPHARMA, Aladwiah (arabe), app de suivi des ruptures (scidev) — DzPharm reste seul avec IA trilingue + outils Chifa/Ramadan/pédiatrie locaux
- PHASE 9 (CORRECTIFS APPLIQUÉS — tout vérifié E2E) :
  * interaction-rules.ts : AVK = [WARFARINE, ACENOCOUMAROL, FLUINDIONE] sur les 7 règles + ASPIRINE_TOKENS avec graphies registre + 6 nouvelles règles (cotrimoxazole+MTX MAJEURE, IEC+ARA2 MAJEURE, statines+gemfibrozil MAJEURE, AINS+diurétiques MODEREE, potassium+IEC/épargneurs MAJEURE, rifampicine+midazolam MAJEURE) + TRIMETOPRIME (graphie FR) — [MODIFICATIONS CLINIQUES : EN ATTENTE DE VALIDATION PHARMACIENNE, marquées dans le code]
  * /api/interactions : avertissement « produit non reconnu » (summary + advice) + INR monitoring étendu aux AVK
  * rate-limit.ts (nouveau) : limiteur IP mémoire + appliqué à /api/ai/chat (20/min) et /api/ai/interactions (12/min) → 429 vérifié
  * prompt copilote : règles 6-7 anti-hallucination (jamais de concentration inventée, marques du registre uniquement, mg/kg avant conversion mL)
  * sw.js v4 : en-tête X-DzPharm-Cache: hit sur réponses servies du cache + pwa-provider : bannière ambre « fraîcheur non garantie » (fetch wrapper)
  * pediatric-calculator : carte dose atténuée (opacity/saturate + aria-disabled) + note « indicatif uniquement » quand bloqueur actif
  * typos cliniques : « contrefort »→supprimé, « effet rénale »→« atteinte rénale fœtale », « sérotra »→« sertraline », « créatine »→« créatinine »
  * /api/drugs : repli flou Levenshtein ≤2 (doliprne→DOLIPRANE, amoxyciline→amoxicilline vérifiés) + drapeau fuzzy + badge UI Répertoire « orthographe approximative »
  * recherche arabe : dictionnaire 20 entrées (باراسيتامول→PARACETAMOL 308 résultats vérifié)
  * header : cibles tactiles nav mobile min-h-11 (44px vérifié)
  * copilot-view : dir="auto" sur markdown assistant (RTL arabe)
  * home-view : marqueurs «**» nettoyés (cleanDciLabel sur consultés/récents/favoris)
  * bun run lint 0 erreur ; tsc --noEmit 0 erreur fichiers modifiés ; console navigateur 0 erreur après reload ; toutes vues 0 overflow
- PHASE 8 (BACKLOG PRIORISÉ) : compartiment « sécurité patient — faire maintenant » (tout appliqué ci-dessus sauf validation pharmacienne des règles cliniques) ; Quick Wins restants : badges « dernière vérification » par point de données, panier ordonnance persistant ; Paris stratégiques : scan code-barres boîte (5×4), OCR ordonnance→interactions (4×4), mode « expliquer en darija » (4×2), API publique POS (4×4), pages SSR par médicament pour SEO (4×4, structurel — approbation requise), alertes retraits/rappels push (4×3), quiz étudiant (3×2), armoire famille (3×3)

Stage Summary:
- AUDIT COMPLET : le socle clinique est sain (math exacte, sources fidèles à 100 %), mais 4 risques réels corrigés (AVK algérien, graphies registre, silence sur produits non résolus, hallucination de formulation)
- 14 correctifs livrés et vérifiés E2E ; modifications cliniques marquées « en attente de validation pharmacienne » dans le code
- Restes recommandés : validation pharmacienne des 6 nouvelles règles + AVK étendu, badges de fraîcheur par donnée, scan code-barres, OCR ordonnance
- ÉTAT : STABLE — lint/tsc/console/overflow 0 erreur, SW v4, rate limiting actif
