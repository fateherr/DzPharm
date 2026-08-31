# Rapport d'audit n°2 — Vérification approfondie du plan & exécution

**Session du 31 août 2026 — contrôle intégral du plan `DzPharm_Audit_and_Upgrade_Plan.md` (matrice P1–P15 + sections 3–5), exécution des manquants, et nouvelles fonctionnalités.**

---

## 1. Résumé exécutif

Le plan a été vérifié **ligne par ligne contre le code réel** (et non les résumés de session). Verdict : **12 items déjà livrés et vérifiés**, **14 items manquants — tous exécutés dans cette passe** (4 agents parallèles + QA E2E complète). Aucune valeur clinique (mg/kg, CI, règles moteur) n'a été modifiée : seules des données de registre, des mécanismes de conformité et des couches de présentation ont été ajoutées. Le service worker est passé en **v7** (stratégie network-first conservée).

---

## 2. Contrôle approfondi — ce qui était déjà fait (vérifié en code)

| Item du plan | Preuve de vérification |
|---|---|
| Armoire MVP+ (membres, catégories, péremption J+7/J+30/J+90, interactions armoire entière, alertes grossesse/allaitement CRAT, posologies pédiatriques au poids, journal, export PDF) | code `armoire-view.tsx` + E2E Task 23 |
| Sévérités jamais en couleur seule (libellés texte « Contre-indication / Majeure / Modérée / Mineure ») | `interactions-view.tsx` SEVERITY_LABELS |
| Tag « généré par IA » sur les RCP | `rcp-view.tsx` |
| Barre d'urgence persistante (SAMU 14, Centre Anti-Poison Alger) | `emergency-bar.tsx` |
| Avertissement sous le copilote + sources Cockcroft-Gault/MDRD et pédiatriques affichées | `copilot-view.tsx`, `renal-calculator.tsx`, `pediatric-calculator.tsx` |
| Rate-limiting copilote (20/min) | `rate-limit.ts` |
| PWA offline + fraîcheur réseau (SW network-first) | `sw.js` |
| Flux pénuries + signalements communautaires | `shortage-center.tsx` |
| F1-bis/F1-ter ancrage pédiatrique multi-tours + registre marques ibuprofène | `route.ts` chat + `pediatric-dosing.ts` (Task 23) |

## 3. Ce qui manquait — exécuté aujourd'hui

| # | Item plan | Livré | Fichiers |
|---|---|---|---|
| M1 | **P15/1.8 — en-têtes de sécurité** | nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (camera/mic/geo self) — vérifiés par curl | `next.config.ts` |
| M2 | **P13/P7 — données structurées + SEO** | JSON-LD `@graph` (WebSite + MedicalWebPage, MedicalAudience pharmacien), openGraph fr_DZ, robots, `sitemap.xml`, ligne Sitemap dans robots.txt | `layout.tsx`, `public/sitemap.xml`, `public/robots.txt` |
| M3 | **P14 — Mode Professionnel / Mode Famille** | toggle segmenté en tête (persisté), bandeau famille, section « Accès rapide » de 5 cartes par rôle ; grille renommée « Tous les outils » (P10 — la redondance nav devient hiérarchie, sans suppression) | `store.ts`, `header.tsx`, `home-view.tsx` |
| M4 | **P6 — recherche mobile proéminente** | recherche hero plein écran, cible tactile 56 px, visible au 1er écran 390 px sans raccourci clavier | `home-view.tsx`, `search-autocomplete.tsx` |
| M5 | **P9 — badges de complétude** | répertoire : « Fiche complète » + « Prix PPA » ; fiche : « Fiche complète » / « Prix PPA public » / « Inscription simple » + ligne explicative — données réelles uniquement (hasBookRcp/price) | `directory-view.tsx`, `drug-sheet.tsx` |
| M6 | **P2/3.6 — conformité armoire** | écran de consentement premier usage (stockage local seul, aucune donnée nominative en ligne, zéro analytics — esprit Loi 18-07), verrou PIN 4 chiffres opt-in (« verrou de confort »), export JSON complet, « Tout effacer », mention « aucune donnée de santé utilisée à des fins d'analyse ou de publicité » | `armoire-view.tsx` |
| M7 | **P3/1.9 — disclaimers au point d'usage** | bloc « En cas d'urgence » (SAMU 14 + CAP Alger, hrefs exacts d'emergency-bar) sous les résultats d'interactions ; disclaimer par réponse IA du copilote | `interactions-view.tsx`, `copilot-view.tsx` |
| M8 | **P3 — urgent proximité risque** | bandeau « Urgence : SAMU 14 » dans le copilote (modes patient/enfant uniquement) | `copilot-view.tsx` |
| M9 | **4.3 — pré-contrôle d'ordonnance** | coller une ordonnance → identification déterministe ligne par ligne (statuts réels : MOPRAL « Retiré » affiché honnêtement), contrôle d'interactions du moteur existant en un passage, lignes non reconnues signalées, disclaimer « interactions uniquement — posologies NON vérifiées », limite 40 lignes/4000 car. | `ordonnance-check.tsx` (nouveau), `tools-view.tsx` |
| M10 | **4.4 — abonnements pénuries** | toggle « Surveiller » par signalement (localStorage), puce « X surveillances actives », détection locale de changement de statut à chaque visite (« Changement détecté depuis votre dernière visite »), honnêteté : « aucune notification push » | `shortage-center.tsx` |
| M11 | **4.5 — nouveautés nomenclature** | API `/api/novelty` (15 derniers enregistrements ACTIFS par date initiale réelle — ex. DYNAPAR 28/06/2026) + section Statistiques avec note de fraîcheur | `stats-view.tsx`, `api/novelty/route.ts` |
| M12 | **4.2 — mode vocal copilote** | dictée micro (MediaRecorder → /api/ai/asr → texte), lecture à voix haute par réponse (/api/ai/tts, WAV, cache par message, markdown strippé), limites honnêtes (désactivé > 1500 car.) | `copilot-view.tsx`, 2 nouvelles routes API |
| M13 | **4.2 — mode « Enfant »** | 3e chip ; prompt système : langage 6–8 ans, max 4 phrases, obligation « demande toujours à un adulte », règles cliniques et ancrages pédiatriques INTACTS (vérifié : 20 kg → 300 mg = 15 mg/kg) | `route.ts` chat |
| M14 | **4.1 + 3.4.14 — trousse & réassort** | checklist trousse de secours 12 items non-médicamenteux (progression, note « liste indicative ») ; lien « Voir prix & génériques » sur les lignes périmées (ouvre la fiche prix PPA + équivalents) | `armoire-view.tsx` |

## 4. Vérification E2E (agent-browser, cette session)

- Ordonnance 3 lignes → **3 reconnus** (DOLIPRANE Actif, PLAVIX Actif, MOPRAL **Retiré**) → moteur : **PLAVIX+MOPRAL → Majeure** (CYP2C19) ✓
- Copilote : envoi + réponse, disclaimer par réponse, bouton lecture, micro, chip Enfant, bandeau SAMU ✓
- Armoire : consentement 1er usage → accepté → « Consentement enregistré », mention no-analytics, trousse, carte Confidentialité ✓
- Pénuries : « Surveiller » → localStorage `shortage.watch.v1` → puce « 1 surveillance active » ✓
- Nouveautés : section présente, données réelles de la base ✓
- Répertoire : badges « Fiche complète » + « Prix PPA » ✓
- Mode Pro ↔ Famille : cartes différentes, persistance après rechargement ✓ ; JSON-LD présent dans le HTML ✓
- Mobile 390 px : **scrollWidth = clientWidth (0 débordement)**, recherche visible 1er écran ✓
- Console : **0 erreur** ; `bun run lint` **0 erreur** ; `tsc --noEmit` **0 erreur src/** ; dev.log : que des 200 ✓

## 5. Intégrité clinique — déclarations

- **Aucune** valeur mg/kg, CI, intervalle, plafond ou règle moteur modifiée dans cette passe.
- Nouvelles routes IA : rate-limiting identique au chat (20/min/IP), messages d'erreur français, textes ≤ 1500 car.
- TTS : voix `xiaochen` (aucune voix explicitement française disponible dans ce déploiement) — qualité de prononciation française **à évaluer sur le terrain**.
- ASR : câblage vérifié en round-trip (TTS→ASR) ; comportement sur voix humaine réelle/webm à confirmer.
- Ordonnance : heuristique d'identification explicite (« vérifiez chaque correspondance ») ; ne valide NI posologies NI durées — dit noir sur blanc.
- Le verrou PIN armoire est un verrou de confort local (documenté en UI), pas un dispositif de sécurité fort.

## 6. Reste en attente de décision humaine

1. **Validation pharmaceutique** des règles moteur étendues (C1/C14 du rapport n°1 + ENOXAPARINE C20).
2. **SEO/SSR par médicament** (pages individuelles indexables) — décision structurelle non prise ; JSON-LD global livré en attendant.
3. **Révision juridique ANPDP** du stockage armoire (l'écran de consentement documente la posture local-first, mais la qualification juridique finale est un avis d'avocat, pas un choix produit).
4. **Accès partagé/délégué armoire (V2 plan)** — nécessite des comptes : décision structurelle.
5. **WhatsApp bridge / pharmacie de garde avec données réelles / OCR boîtes** — dépendent de données ou d'infra externes.
6. Voix TTS française dédiée (si le déploiement en expose une).

---

*SW bump dzpharm-v6 → v7 (network-first conservé). QA complet : lint 0, tsc 0, console 0, mobile 0 overflow.*

---

## 7. Armoire à Pharmacie Familiale v2 — reconstruction complète (session « focus armoire »)

**Conformité au plan dédié** (« New Feature — Armoire à Pharmacie Familiale ») :

| Exigence plan | Livré |
|---|---|
| 3.3 Foyer → Membres (nom, bande d'âge, relation, avatar/couleur, drapeaux grossesse/allaitement/rénal/allergies) | ✅ membres + 8 couleurs, drapeaux alimentant Analyse |
| 3.3 Entrée (AMM/DCI liée, forme, quantité, péremption, ouverture/achat, kit, membres multiples partagés, catégorie 5 dont stupéfiants & contrôlés, lot, ordonnance) | ✅ dialogue complet + modèle store v2 |
| 3.3 Kits (Cuisine, Salle de bain, Réfrigérateur, Voyage, Auto, Cartable) | ✅ 6 kits multi-sélection |
| 3.4.1 Recherche-répertoire avec autofill (9 555 AMM) | ✅ statut + PPA + bannière retrait/non renouvelé |
| 3.4.3 Saisie manuelle OTC/parapharmacie | ✅ onglet dédié, détachement AMM possible |
| 3.4.4 Multi-membres + vue par membre | ✅ assignation partagée + filtres + groupes |
| 3.4.5 Auto-catégorisation (5 catégories) + kits manuels | ✅ |
| 3.4.6 Péremption couleur+icône+texte, rappels 7/30/90 configurables | ✅ Réglages |
| 3.4.7 Stock faible chroniques (« jours restants ») | ✅ alerte dédiée |
| 3.4.8 Interactions du FOYER ENTIER, automatique à chaque changement | ✅ auto-run debounced + attribution par membre |
| 3.4.9 Fiche d'urgence < 10 s (noms, doses, allergies) | ✅ onglet Urgence + partage + impression |
| 3.4.10 Grossesse/allaitement → CRAT ; rénal → renvoi honnête | ✅ via moteurs existants, zéro invention |
| 3.4.11 Guidage destruction produits périmés (source officielle) | ✅ consigne ANSM/Ministère + pharmacie |
| 3.4.14 Réassort → fiche prix PPA + équivalents | ✅ depuis les alertes de renouvellement |
| 3.4.15 Export PDF inventaire complet | ✅ A4 imprimable (portail .print-counter) |
| 3.4.16 Widget « X expirent ce mois » | ✅ page d'accueil |
| 3.6 Confidentialité (local-first, PIN dédié, restreint par membre, zéro analytics, consentement 1er usage, export/effacement) | ✅ + Loi 18-07 notée |
| Migration v1 → v2 | ✅ données existantes conservées (testée E2E) |

**Brainstorm livré au-delà du plan** : score d'organisation indicatif (explicitement non clinique), échéancier de péremption visuel 90 j, groupement 3 axes (membre/catégorie/lieu), journal des contrôles dédupliqué, nouveautés 7 jours, conseils saisonniers, badge « Liste contrôlée », alerte doublons DCI par membre.

**Revue approfondie avant livraison** (E2E agent-browser) : parcours complet vert — consentement, membres (drapeaux), ajout répertoire, analyse auto (paire MAJEURE PLAVIX×MOPRAL + attribution, grossesse « Non documenté » honnête, posologie Lina 24 kg → 360 mg = 15 mL exacte), urgence, PIN verrou/déverrouillage, migration v0→v1, impression, mobile 390 px 0 débordement, console 0 erreur, lint 0, tsc 0. SW v8.

**Restent hors périmètre (décision humaine)** : ajout par photo (VLM), accès partagé/délégué (nécessite comptes), scan code-barres (couverture GS1 DZ à vérifier), lien pharmacien sécurisé, carnet de santé familial (sous-régime réglementaire distinct).
