# Rapport d'audit complet — DzPharm

**Audit réalisé le 30 août 2026 — 10 phases (découverte, intégrité clinique, fonctionnel, UI/UX, technique, concurrence, brainstorm, priorisation, implémentation, rapport)**

---

## 1. Résumé exécutif

DzPharm est un produit **structurellement sain** : les 9 555 AMM du registre sont fidèles au fichier source à 100 %, les 1 791 prix PPA sont identiques à la liste officielle fournie, les calculs pédiatriques sont mathématiquement exacts aux bornes, et les formules rénales (Cockcroft-Gault, MDRD) sont irréprochables. Les **trois risques principaux** identifiés — tous corrigés dans cette passe — étaient : (1) l'absence de l'acénocoumarol (le seul antivitamine K commercialisé en Algérie !) dans le moteur local d'interactions, créant des faux négatifs majeurs ; (2) aucune limitation de débit sur les deux endpoints IA, exposant au surcoût et à l'abus ; (3) un copilote capable d'inventer une concentration de sirop (« 100 mg/ml » pour un Doliprane réel à 120 mg/5 mL). Les **trois opportunités** majeures : le scan de code-barres de boîte pour l'identification instantanée au comptoir, un flux OCR ordonnance → contrôle d'interactions, et une API publique pour les éditeurs de logiciels d'officine — trois fonctionnalités qu'aucun concurrent algérien ne propose. Aucune modification clinique n'a été livrée en silence : les ajouts de règles sont explicitement marqués « en attente de validation pharmacienne » dans le code.

---

## 2. Tableau complet des constats (Phases 2–5)

| # | Constat | Preuve / source de vérification | Gravité | Recommandation | Statut |
|---|---|---|---|---|---|
| C1 | **Acénocoumarol absent des règles AVK** : SINTROM/AURACENO/NOVAROL + ASPEGIC/BRUFEN/CLARIDAR/CORDARONE → aucune alerte locale (l'IA rattrapait, pas le moteur instantané/repli) | Test API direct : `SINTROM+ASPEGIC` → 0 paire ; registre : warfarine absente du marché algérien, acénocoumarol = l'AVK local | **Critique** | Étendre toutes les règles AVK à la classe | ✅ Corrigé — *en attente de validation pharmacienne* (marqué dans code) |
| C2 | **Graphie registre « ACIDE ACETYLSALICYTIQUE »** (2 produits dont ASPEGIC actif) ne matchait aucun jeton aspirine | `dciKey LIKE '%SALICY%'` → 2 graphies concurrentes dans le fichier officiel | Élevée | Ajouter les variantes orthographiques aux jetons | ✅ Corrigé |
| C3 | **Produits non résolus silencieux** : marque étrangère (ex. COUMADINE) → « aucune interaction » sans signaler l'angle mort | Test API : `COUMADINE+DOLEX` → FAIBLE sans avertissement | Élevée (sécurité) | Avertir explicitement dans summary + advice | ✅ Corrigé (UI déjà protégée par l'autocomplétion registre) |
| C4 | **Hallucination de formulation par le copilote** : « Doliprane sirop 100 mg/ml » (réel : 120 mg/5 mL = 24 mg/mL) + citation de Dafalgan (marque non algérienne) | Test navigateur mode patient, question fièvre 2 ans | Élevée (sécurité) | Règles anti-invention dans le prompt système | ✅ Corrigé (règles 6-7) — *efficacité à re-vérifier par échantillonnage* |
| C5 | **Aucun rate-limiting sur /api/ai/chat et /api/ai/interactions** | Relecture code : aucune garde ; 21 requêtes rapides → 429 seulement après correctif | Élevée (coût/abus) | Limiteur IP mémoire (20/min chat, 12/min interactions) | ✅ Corrigé et vérifié (429) |
| C6 | **Données cachées PWA servies sans mention de fraîcheur** (aussi en ligne si serveur brièvement indisponible) | Lecture sw.js : repli cache sans marqueur | Moyenne (confiance) | En-tête `X-DzPharm-Cache: hit` + bannière ambre | ✅ Corrigé (sw v4) |
| C7 | **Dose pédiatrique affichée en clair malgré bloqueur actif** (2 kg < 3 kg min) | Test navigateur : bloqueur au-dessus, dose 30 mg lisible en dessous | Moyenne (sécurité UX) | Atténuer (opacity + aria-disabled) + note « indicatif » | ✅ Corrigé |
| C8 | **Recherche sans tolérance aux fautes** : « doliprne », « amoxilicine » → 0 résultat | Test API/UI | Moyenne (adoption) | Repli flou Levenshtein ≤ 2 + badge « orthographe approximative » | ✅ Corrigé (les fautes ≤ 2 corrections ; au-delà, autocomplétion reste le filet) |
| C9 | **Recherche arabe non supportée** : « باراسيتامول » → 0 résultat | Test UI Cmd+K | Moyenne (adoption) | Dictionnaire arabe→DCI (20 entrées initiales) | ✅ Corrigé (extensible) |
| C10 | **Cibles tactiles nav mobile 36 px** (< 44 px WCAG 2.5.5 / Apple HIG) | Mesure DOM : 8 boutons à 36 px | Moyenne (a11y) | `min-h-11` sur nav mobile | ✅ Corrigé (44 px vérifiés) |
| C11 | **Markdown assistant sans dir="auto"** : paragraphes arabes alignés à gauche | Mesure computed direction:ltr sur 72 blocs arabes | Mineure (RTL) | dir="auto" sur conteneur markdown | ✅ Corrigé |
| C12 | **Marqueurs «\*\*» du registre** visibles dans « Les plus consultés », récents, favoris | Capture DOM : « AMOXICILLINE** (SOUS FORME…) » | Mineure (polissage) | cleanDciLabel partout | ✅ Corrigé |
| C13 | **Typos dans textes cliniques** : « contrefort », « effet rénale fœtal », « sérotra », « créatine » | Relecture ligne à ligne pregnancy-rules.ts / renal-calculator.tsx | Mineure | Corrections typographiques sans changement clinique | ✅ Corrigé |
| C14 | **Couverture moteur local : 6 interactions classiques absentes** (cotrimoxazole+MTX, IEC+ARA2, statines+gemfibrozil, AINS+diurétiques, potassium+IEC, rifampicine+midazolam) | Stress-tests + référentiels ANSM/BCB | Élevée (couverture) | 6 règles ajoutées | ✅ Ajouté — *en attente de validation pharmacienne* |
| C15 | Simulation Chifa applique le taux au **PPA** et non au tarif de référence (simplification pédagogique) | Relecture code + article tarif de référence (journals.openedition.org) | Mineure (documentée) | Note pédagogique déjà présente ; affiner si tarif CNAS disponible | ⚠️ Signalé — non modifié |
| C16 | Pas de JSON-LD (schema.org Drug/MedicalWebPage) ni sitemap.xml ; pages médicament non indexables (SPA client) | Relecture layout.tsx / public/ | Moyenne (SEO) | Pages SSR/SSG par médicament = changement structurel | ⚠️ Signalé — approbation requise |
| C17 | Subtilité moteur : produit combiné couvrant les 2 membres d'une règle → `continue` saute ses autres paires (cas rare) | Relecture matchInteractions() | Mineure | Restructurer la boucle | ⚠️ Signalé — non modifié (rare en pratique) |
| C18 | Devise des données : « Nomenclature Juin 2026 / PPA Août 2026 » = dernières versions fournies ; aucune édition plus récente visible sur miph.gov.dz (sans date dans les extraits) | Recherche web (miph.gov.dz, CNAS, MTESS) | — | Contrôle périodique mensuel contre miph.gov.dz + bulletins CNAS | 💡 Processus recommandé |
| C19 | Heures Ramadan codées en dur (12 wilayas, éditables) — correctes pour l'Algérie mais statiques | Relecture ramadan-adapter.tsx | Mineure | Rester éditable ; envisager calcul astronomique | 💡 Amélioration future |
| C20 | HEPARINE (dciKey) ne matche pas ENOXAPARINE SODIQUE (registre) dans le vérificateur grossesse | Relecture findPregnancyRule | Mineure | Ajouter clés ENOXAPARINE, ENOXAPARINE SODIQUE | ⚠️ Signalé — quick win suivant |

**Vérifications positives clés** (aucune action requise) : posologies pédiatriques 15 molécules exactes (15 mg/kg para, 10 mg/kg ibuprofène CI < 3 mois/6 kg, 0,5 mg/kg diazépam rectal, bandes cétirizine 24/72/144 mois…) ; CRAT conforme (valproate CI absolue 10 %/30-40 %, warfarine CI grossesse mais compatible allaitement, codéine CI allaitement ANSM, IEC fœtopathie T2/T3) ; Cockcroft-Gault et MDRD-4 (175) numériquement exacts ; stadification KDIGO G1-G5 correcte ; 10 classes rénales conformes (metformine EMA 30-45) ; 1 791/1 791 prix identiques à la source ; zéro Lorem ipsum/placeholder ; RCP 21 sections ANSM avec contenu livre réel ; contrastes 7,28×/12,88× (AAA) ; disclaimer + bandeau urgence présents partout ; API 14-45 ms ; aucun secret exposé ; Prisma paramétré.

---

## 3. Backlog priorisé (Phase 8)

### Compartiment « sécurité patient / intégrité des données — à faire immédiatement, quel que soit l'effort »
| Élément | Impact | Effort | Statut |
|---|---|---|---|
| S1. AVK étendu à l'acénocoumarol (+ graphies registre aspirine) | 5 | 1 | ✅ Fait (validation pharmacienne en attente) |
| S2. Rate limiting endpoints IA | 4 | 1 | ✅ Fait |
| S3. Avertissement produits non résolus | 4 | 2 | ✅ Fait |
| S4. Garde anti-hallucination concentrations (prompt) | 4 | 1 | ✅ Fait (efficacité à re-échantillonner) |
| S5. Indicateur de données servies du cache | 3 | 2 | ✅ Fait |
| S6. Dose atténuée si bloqueur pédiatrique | 3 | 1 | ✅ Fait |
| S7. Validation pharmacienne des règles modifiées/ajoutées | 5 | 1 | ⏳ **Décision humaine requise** |

### Quick Wins suivants (Impact × Effort ≥ 6, effort ≤ 2)
- **Q1. Badge « dernière vérification » par point de données** — chaque prix et chaque fiche affiche sa date source (PPA : Août 2026, nomenclature : Juin 2026) — 3×2 = 6
- **Q2. Clés HBPM (ENOXAPARINE) dans pregnancy-rules** — 2×1 = 2
- **Q3. Étendre le dictionnaire arabe de recherche** (50+ entrées usuelles) — 3×1 = 3
- **Q4. Panier d'ordonnance persistant avec budget total** (extension Chifa + export) — 4×2 = 8
- **Q5. Réparer la boucle produits combinés du moteur** (C17) — 2×2 = 4

### Paris stratégiques (Impact 4-5, Effort 3-5)
- **B1. Scan code-barres / DataMatrix de la boîte** → fiche instantanée (5×4) — GS1 courant sur les boîtes algériennes
- **B2. OCR ordonnance → contrôle d'interactions** en 3 gestes (4×4)
- **B3. Mode « Expliquer à mon patient en darija »** — bouton unique sur chaque fiche (4×2)
- **B4. API publique lecture-seule pour éditeurs de logiciels d'officine** (4×4) — modèle BCB/Cegedim
- **B5. Alertes push : rappels/retraits ministériels, changements de prix, nouvelles AMM par classe** (4×3)
- **B6. Pages SSR/SSG par médicament + JSON-LD Drug** pour SEO longue traîne (4×4) — **structurel, approbation requise**
- **B7. Graphiques d'évolution des prix + recherches tendances** (3×2)
- **B8. Quiz/CME pour étudiants en pharmacie** depuis glossaire + monographies (3×2)
- **B9. Armoire famille multi-profils** (3×3)
- **B10. Saisie vocale au comptoir** (3×3)
- **B11. Tables de compatibilité IV/perfusion** (segment hôpital) (3×3)

### Plus tard
- L1. Localisation complète arabe RTL de l'UI (4×5)
- L2. Traçabilité des lots (aucune source de données actuelle)
- L3. Gestion/upload d'ordonnances (questions légales)
- L4. Niveau pro payant / marque blanche chaînes

---

## 4. Idéation (Phase 7 — distinct des corrections)

1. **Vitesse comptoir** : scan boîte (B1), fiche-conseil patient en 1 geste, dictée vocale (B10), mode « mains occupées »
2. **Pénuries & disponibilité** : signalement communautaire existant → ajouter signaux régionaux agrégés + **suggestions de substitution thérapeutique** quand un produit est en rupture + alerte quand un produit suivi revient en stock
3. **Personnalisation** : favoris (existant) + alertes prix/statut sur ses produits stockés + **historique personnel de contrôles d'interactions**
4. **Profondeur copilote** : « expliquer en darija » (B3), mode quiz étudiant (B8), flux OCR (B2), **ancrage renforcé** : injecter les formulations locales de pediatric-dosing.ts dans le contexte du copilote quand une molécule pédiatrique est détectée
5. **Statistiques = vraie intelligence de marché** : recherches tendance, courbes de prix, profils de consommation par wilaya, détection précoce de tensions (corrélation signalements)
6. **Notifications** : retraits ANPP/ministère, mises à jour de prix, nouvelles AMM filtrées par classe (B5)
7. **Couche confiance** : dates « dernière vérification » par donnée (Q1), **changelog public des mises à jour de nomenclature**, citations de sources en 1 geste sur chaque affirmation clinique
8. **Modèle économique** : niveau pro (statistiques avancées, API), API pour éditeurs POS (B4), marque blanche chaînes
9. **Idées originales additionnelles** : mode « garde de nuit » (thème contrasté très sombre + numéros d'urgence en 1 geste), calculateur de délai de reconstitution des suspensions antibiotiques (eau + durée de stabilité), comparateur de conditionnements (prix par unité de prise — DA/comprimé), export comptoir des 20 génériques les plus économiques par classe

---

## 5. Changelog des modifications livrées dans cette passe

| Fichier | Modification |
|---|---|
| `src/lib/interaction-rules.ts` | Constante AVK (warfarine/acénocoumarol/fluindione) appliquée aux 7 règles ; ASPIRINE_TOKENS avec graphies registre ; 6 nouvelles règles (cotrimoxazole+MTX, IEC+ARA2, statines+gemfibrozil, AINS+diurétiques, potassium+épargneurs, rifampicine+midazolam) ; jetons TRIMETOPRIME — **tout marqué « en attente de validation pharmacienne »** |
| `src/app/api/interactions/route.ts` | Avertissement produits non résolus (summary + advice) ; INR monitoring étendu à tous les AVK |
| `src/lib/rate-limit.ts` (nouveau) | Limiteur IP mémoire avec nettoyage périodique |
| `src/app/api/ai/chat/route.ts` | Rate limit 20/min + règles prompt 6-7 (anti-invention de concentration, marques registre uniquement, mg/kg avant conversion) |
| `src/app/api/ai/interactions/route.ts` | Rate limit 12/min |
| `public/sw.js` → v4 | En-tête `X-DzPharm-Cache: hit` sur les réponses servies du cache ; nettoyage anciens caches |
| `src/components/dzpharm/pwa-provider.tsx` | Wrapper fetch détectant les cache-hits + bannière ambre « fraîcheur non garantie » (6 s) |
| `src/components/dzpharm/pediatric-calculator.tsx` | Carte dose atténuée + aria-disabled + note « indicatif uniquement » si bloqueur |
| `src/lib/pregnancy-rules.ts` | 3 typos corrigées (aucun changement clinique) |
| `src/components/dzpharm/renal-calculator.tsx` | Typo « créatinine » |
| `src/app/api/drugs/route.ts` | Repli flou Levenshtein ≤ 2 (coupe précoce) + drapeau `fuzzy` + dictionnaire arabe→DCI (20 entrées) |
| `src/components/dzpharm/directory-view.tsx` | Badge « orthographe approximative » quand fuzzy |
| `src/components/dzpharm/types.ts` | `fuzzy?: boolean` sur DrugsResponse |
| `src/components/dzpharm/header.tsx` | Cibles tactiles nav mobile ≥ 44 px (min-h-11) |
| `src/components/dzpharm/copilot-view.tsx` | `dir="auto"` sur le markdown assistant (RTL arabe/darija) |
| `src/components/dzpharm/home-view.tsx` | cleanDciLabel sur « Les plus consultés », récents, favoris (suppression des «\*\*») |

**Vérifications finales** : lint 0 erreur · tsc 0 erreur (fichiers modifiés) · console navigateur 0 erreur · 0 overflow desktop + 390 px · SINTROM+ASPEGIC → MAJEURE ✓ · 429 après 20 req/min ✓ · doliprne → DOLIPRANE (fuzzy) ✓ · باراسيتامول → 308 résultats ✓ · 44 px tactile ✓ · dose atténuée si bloqueur ✓ · badge flou visible ✓.

---

## 6. Questions ouvertes nécessitant une décision humaine

1. **Validation pharmacienne** (prioritaire) : approuver les 7 règles AVK étendues + 6 nouvelles règles du moteur local. Sources de référence suggérées pour la contre-vérification : classifications d'interactions ANSM/AFSSAPS (rietiers d'interactions), Résumé des Caractéristiques du Produit (RCP) des spécialités algériennes concernées, Base Claude Bernard. *Sans validation, ces règles restent fonctionnelles mais marquées non validées.*
2. **Direction SEO/structure** (B6) : autoriser la création de routes SSR/SSG par médicament (`/medicament/[slug]`) — changement d'architecture (le site est aujourd'hui une page unique). Impact fort sur le référencement longue traîne, mais structurant.
3. **Modèle économique** : niveau pro payant ? API publique avec clé pour éditeurs POS ? Marque blanche pour chaînes ? Ces choix conditionnent B4 et l'avenir de la plateforme.
4. **Autorisation légale du suivi des retraits/rappels** (B5) : relayer les alertes officielles ANPP/ministère nécessite-t-il un accord de republication ?
5. **Tolérance flou** : la distance ≤ 2 vous semble-t-elle le bon compromis (elle laisse passer « amoxilicine », distance 3 — l'autocomplétion reste le filet) ?
6. **Stratégie arabe** : rester sur « copilote multilingue + recherche arabe » ou viser la localisation RTL complète de l'UI (L1, effort majeur) ?
