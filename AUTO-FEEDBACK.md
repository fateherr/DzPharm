# DzPharm — Auto-Feedback (bugs, anomalies, modifications)

> Journal automatique alimenté pendant le développement et les tests.
> Chaque bug, anomalie ou changement est consigné au moment de sa découverte,
> puis repris dans le rapport final. Objectif : exactitude et perfection
> clinique de l'outil d'interactions.

## Session 2026-08-30 — Moteur d'interactions : invariance DCI

### BUG-001 — Verdict fluctuant « Contre-indication » ↔ « Risque majeur » (critique)
- **Symptôme** (signalé par l'utilisateur) : PLAVIX + OMÉPRAZOLE donnait
  « Contre-indication » à une exécution, « Risque majeur » à une autre.
- **Cause racine** : le résultat affiché provenait en dernière étape du LLM
  (JSON libre) qui REMPLAÇAIT le verdict déterministe du moteur local de
  règles. Deux exécutions → deux libellés de sévérité.
- **Correctif** : arbitrage déterministe côté serveur — le moteur local
  s'exécute d'abord ; toute paire IA déjà couverte par une règle locale est
  ÉCARTÉE (la version locale fait foi) ; la sévérité globale et le résumé
  sont recalculés à partir des paires fusionnées, jamais repris du LLM.
- **Vérifié** : PLAVIX+MOPRAL et PIDOGREL+ANTAG (mêmes molécules, marques
  différentes) → verdict, mécanisme, conduite et résumé strictement
  identiques sur 3 exécutions (hash MD5 identique).

### BUG-002 — Verdict et résumé dépendant du nom commercial (critique)
- **Symptôme** (signalé par l'utilisateur) : changer le nom commercial
  changeait le verdict ET le résumé de l'interaction.
- **Causes racines** :
  1. Les jetons de correspondance incluaient la MARQUE en plus de la DCI ;
  2. Le prompt LLM contenait les noms de marque → résumés différents ;
  3. La résolution `findFirst(contains)` pouvait sélectionner des produits
     différents selon la graphie saisie.
- **Correctif** :
  1. Nouvelle couche `src/lib/dci-normalizer.ts` : chaque produit est réduit
     à ses jetons canoniques DCI (marques EXCLUES de la correspondance) ;
  2. Le prompt LLM ne voit QUE la liste canonique des DCI ;
  3. Résolution exacte d'abord (brandKey/dciKey = saisie), puis partielle ;
     la DCI fournie par le panier (registre) est prioritaire.
- **Vérifié** : PLAVIX+MOPRAL ≡ CLOPIDOGREL+OMEPRAZOLE ≡ PIDOGREL+ANTAG ≡
  INEXIUM+PLAVIX (dérivé ésoméprazole) → même MAJEURE, même texte.

### BUG-003 — Éclatement des associations cassé (majeur, découvert à l'audit)
- **Anomalie** : `normalizeKey` remplaçait « + » et « / » par des espaces
  AVANT le découpage sur « + » — le split ne fonctionnait jamais. Les
  associations (ex. CLOPIDOGREL/ACIDE ACÉTYLSALICYLIQUE, 1135 produits avec
  « / ») ne matchaient que par accident via la correspondance de mots.
- **Correctif** : découpage sur la chaîne brute (`+`, `/`, `,`, `ET`,
  `AVEC`, `EXPRIME`) puis normalisation de chaque constituant. Chaque DCI
  d'une association fixe est désormais testée individuellement.
- **Vérifié** : CARDIOFLUX (clopidogrel/aspirine) + MOPRAL → MAJEURE
  (constituant clopidogrel détecté).

### BUG-004 — Faux positif du mot générique « ACIDE » (majeur, découvert à l'audit)
- **Anomalie** : le mot isolé « ACIDE » (issu de « acide ascorbique »,
  « acide folique »…) matchait les jetons de classe commençant par
  « ACIDE … » (ex. ACIDE MÉFÉNAMIQUE). SINTROM+ASPEGIC produisait 2 paires
  (double comptage) ; la vitamine C aurait matché la classe AINS.
- **Correctif** : liste `GENERIC_WORDS` (ACIDE, VITAMINE, COMPLEXE…)
  exclue des mots-porteurs ; le constituant COMPLET reste un jeton valide.
- **Vérifié** : SINTROM+ASPEGIC → 1 seule paire (aspirine-AVK, MAJEURE) ;
  VITAMINE C + MÉTHOTREXATE → 0 interaction (aucun faux positif).

### BUG-005 — Hallucination du LLM sur produit non résolu (découvert à l'audit)
- **Anomalie** : produit absent du registre (ex. TILDEN) envoyé au LLM sans
  DCI → le LLM inventait une molécule (« tildémédine ») et générait une
  paire fantôme.
- **Correctif** : les produits non résolus sont EXCLUS du prompt IA et
  marqués « ne devine jamais leur molécule » ; toute paire IA référençant
  un produit sans DCI est rejetée à la fusion. L'avertissement « analyse
  partielle » reste affiché.
- **Vérifié** : TAHOR+TILDEN → aucune paire inventée, avertissement affiché.

### ANOMALIE-001 — Coquille « LEVNORGESTREL »
- La classe contraceptive contenait « LEVNORGESTREL » (graphie fausse,
  jamais présente dans le registre) → aucune règle contraceptive ne
  matchait le lévonorgestrel réel. Corrigé vers « LEVONORGESTREL » dans la
  classe unifiée `CONTRACEPTIFS_HORMONAUX` (+ norethistérone, gestodène,
  étonogestrel).

### ANOMALIE-002 — Couverture de classe incomplète (extensions cliniques)
- Molécules présentes sur le marché mais absentes des listes de classe →
  interactions manquées : dexkétoprofène, dexibuprofène, nimésulide,
  célécoxib, étoricoxib, parcécoxib, étodolac, ténoxicam, acides
  niflumique/méfénamique/tiaprofique (AINS) ; sotalol, bétaxolol,
  acébutolol, céliprolol, pindolol, labétalol (bêtabloquants) ; josamycine,
  midécamycine (macrolides) ; péfloxacine, loméfloxacine, gatifloxacine,
  sparfloxacine (fluoroquinolones) ; phénprocoumone (AVK) ; posaconazole
  (azolés CYP3A4) ; déxlansoprazole (IPP) ; nitroglycérine (dérivés
  nitrés) ; digitoxine (digitaliques) ; lovastatine ; cilazapril,
  moexipril, spirapril (IEC) ; azilsartan (ARA2) ; triazolam, prazépam,
  brotizolam (benzodiazépines) ; xipamide, métolazone (thiazidiques) ;
  liquidone (sulfamides hypoglycémiants) ; péthidine (opioïdes) ;
  étonogestrel, noréthistérone, gestodène (contraceptifs).
- **Statut** : ajoutées avec marqueur « en attente de validation
  pharmaceutique » dans le code (règle établie du projet).

### ANOMALIE-003 — Dérivés de DCI non rattachés
- Dérivés/énantiomères dont le nom ne contient pas la molécule mère :
  rattachés via table d'alias (DEXKETOPROFENE→KETOPROFENE,
  PHENPROCOUMON→AVK, NITROGLYCERINE→TRINITRINE, AMINOPHYLLINE→THEOPHYLLINE,
  DEXLANSOPRAZOLE→LANSOPRAZOLE, MESTRANOL→ETHINYLESTRADIOL…).
- L'ésoméprazole (S-isomètre de l'oméprazole) était déjà couvert par la
  classe IPP ; le mécanisme l'explicite (« l'oméprazole et l'ésoméprazole
  inhibent le CYP2C19 »).

### CHANGE-001 — Nettoyage des textes « méta » des résultats
- Suppression des bandeaux « Analyse IA approfondie — croisée avec la base
  de règles locale », « Moteur local de règles — réponse instantanée »,
  « L'analyse est générée par IA… », « Matrice générée par le moteur local
  de règles… ». Ne restent que le résultat clinique et une seule ligne de
  prudence (« Ne remplace pas la validation pharmaceutique ni l'avis
  médical »).

### CHANGE-002 — Synchronisation matrice ↔ vérificateur
- La matrice et le vérificateur partageaient déjà le même moteur local,
  mais le vérificateur affichait en finale le verdict LLM → désync perçue.
- Désormais le verdict de toute paire couverte par la base de référence est
  identique dans les deux onglets (vérifié : MAJEURE PLAVIX×MOPRAL dans la
  matrice ET le vérificateur).

### CHANGE-003 — Nouvelle fonctionnalité : détection de doublons de DCI
- Le même constituant actif dans plusieurs produits (ex. DOLIPRANE +
  EFFERALGAN → paracétamol en double ; ou deux associations fixes
  contenant toutes deux de l'ibuprofène) génère une alerte dédiée
  (MAJEURE si DCI à faible marge thérapeutique — paracétamol, AVK,
  lithium, méthotrexate, digoxine, opioïdes… — sinon MODÉRÉE) avec
  surveillance hépatique si paracétamol cumulé.
- **Statut clinique** : en attente de validation pharmaceutique.

### CHANGE-004 — Nouvelle règle clinique : sérotoninergiques × linézolide
- Le linézolide (IMAO-A antibiotique) est contre-indiqué avec TOUS les
  antidépresseurs sérotoninergiques (ISRS + ISRSN : venlafaxine,
  duloxétine, milnacipran). Les règles IMAO et tramadol étendues aux ISRSN.
- **Statut clinique** : en attente de validation pharmaceutique.

### Tests de non-régression passés (2026-08-30)
| Cas | Attendu | Obtenu |
|---|---|---|
| PLAVIX + MOPRAL | MAJEURE | ✅ MAJEURE |
| CLOPIDOGREL + OMÉPRAZOLE | = précédent | ✅ identique (hash égal) |
| PIDOGREL + ANTAG (autres marques) | = précédent | ✅ identique |
| INEXIUM + PLAVIX (dérivé) | MAJEURE | ✅ MAJEURE |
| CARDIOFLUX (association) + MOPRAL | MAJEURE | ✅ MAJEURE |
| SINTROM + ASPEGIC (AVK algérien) | 1× MAJEURE | ✅ 1 paire (aspirine-AVK) |
| WARFARINE + DICLOFENAC | MAJEURE | ✅ MAJEURE |
| BRUFEN + LOPRIL | MAJEURE | ✅ MAJEURE (régression OK) |
| PROZAC + MOCLOBEMIDE (IMAO) | CI | ✅ CONTRE-INDIQUE |
| DOLIPRANE + EFFERALGAN | doublon | ✅ MAJEURE + doublon paracétamol |
| DOLIPRANE + LEXOMIL | aucune | ✅ FAIBLE, 0 paire |
| VITAMINE C + MÉTHOTREXATE | aucune | ✅ 0 (faux positif éliminé) |
| PLAVIX + MOPRAL × 3 exécutions | déterminisme | ✅ MD5 identique ×3 |
| MOTILIUM + ZITHROMAX (hors base) | enrichissement IA | ✅ MODERÉE (QT) + ECG |
| TAHOR + TILDEN (non résolu) | anti-hallucination | ✅ 0 paire inventée |
