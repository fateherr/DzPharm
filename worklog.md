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
