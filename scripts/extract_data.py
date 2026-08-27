#!/usr/bin/env python3
"""DzPharm data extraction: xlsx nomenclature + docx DCI mappings -> JSON."""
import json
import os
import re
import unicodedata
from datetime import datetime, date

import openpyxl
from docx import Document

BASE = "/home/z/my-project"
UPLOAD = os.path.join(BASE, "upload")
OUT = os.path.join(BASE, "data")
os.makedirs(OUT, exist_ok=True)


def norm(s):
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    # collapse multiple spaces
    s = re.sub(r"\s+", " ", s)
    return s


def upper_no_accents(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9 ]", " ", s.upper()).strip()


def iso(d):
    if isinstance(d, (datetime, date)):
        return d.isoformat()[:10]
    return norm(d)


# ---------------------------------------------------------------- XLSX ----
wb = openpyxl.load_workbook(os.path.join(UPLOAD, "NOMENCLATURE ALGERIEN.xlsx"),
                            read_only=True, data_only=True)


def sheet_records(ws, header_row=None):
    """Yield dict records using header row labels (auto-detected if needed)."""
    if header_row is None:
        header_row = 1
        for i, row in enumerate(ws.iter_rows(min_row=1, max_row=30, values_only=True), start=1):
            c0 = row[0] if row else None
            c1 = row[1] if len(row) > 1 else None
            if c0 is not None and str(c0).strip().upper() in ("N°", "N", "NO") and c1 is not None and "ENREGISTREMENT" in str(c1).upper():
                header_row = i
                break
    headers = []
    for row in ws.iter_rows(min_row=header_row, max_row=header_row, values_only=True):
        for j, v in enumerate(row):
            headers.append(norm(v) or f"col{j}")
    out = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if all(v is None or not str(v).strip() for v in row):
            continue
        rec = {}
        for j, v in enumerate(row):
            if j < len(headers):
                rec[headers[j]] = v
        out.append(rec)
    return out


def map_drug(rec, status):
    """Map a raw sheet record to the unified drug JSON."""
    def g(*names):
        for n in names:
            for k, v in rec.items():
                if k and k.strip().upper() == n.upper():
                    if v is not None and str(v).strip():
                        return v
        return None

    d = {
        "regNumber": norm(g("N°ENREGISTREMENT")),
        "code": norm(g("CODE")),
        "dci": norm(g("DENOMINATION COMMUNE INTERNATIONALE")),
        "brand": norm(g("NOM DE MARQUE")),
        "form": norm(g("FORME")),
        "dosage": norm(g("DOSAGE")),
        "packaging": norm(g("CONDITIONNEMENT")),
        "liste": norm(g("LISTE")),
        "p1": norm(g("P1")),
        "p2": norm(g("P2")),
        "obs": norm(g("OBS")),
        "lab": norm(g("LABORATOIRES DETENTEUR DE LA DECISION D'ENREGISTREMENT",
                       "LABORATOIRES DETENTEUR DE LA DECISION D’ENREGISTREMENT")),
        "country": norm(g("PAYS DU LABORATOIRE DETENTEUR DE LA DECISION D'ENREGISTREMENT",
                          "PAYS DU LABORATOIRE DETENTEUR DE LA DECISION D’ENREGISTREMENT")),
        "regDateInitial": iso(g("DATE D'ENREGISTREMENT INITIAL", "DATE D’ENREGISTREMENT INITIAL")),
        "regDateFinal": iso(g("DATE D'ENREGISTREMENT  FINAL", "DATE D’ENREGISTREMENT  FINAL")),
        "type": norm(g("TYPE")),
        "statut": norm(g("STATUT")),
        "stability": norm(g("DUREE DE STABILITE")),
        "withdrawDate": iso(g("DATE DE RETRAIT")),
        "withdrawReason": norm(g("MOTIF DE RETRAIT")),
        "status": status,
    }
    # skip rows without dci and brand
    if not d["dci"] and not d["brand"]:
        return None
    d["dciKey"] = upper_no_accents(d["dci"] or "")
    d["brandKey"] = upper_no_accents(d["brand"] or "")
    return d


# --- Sheet 1: active nomenclature (header auto-detected = 14)
ws1 = wb["Nomenclature Juin 2026"]
active = [r for r in (map_drug(rec, "ACTIF") for rec in sheet_records(ws1)) if r]

# --- Sheet 2: non renewed
ws2 = wb["Non Renouvelés "]
nonren = [r for r in (map_drug(rec, "NON_RENOUVELE") for rec in sheet_records(ws2)) if r]

# --- Sheet 3: withdrawn
ws3 = wb["Retraits"]
withdrawn = [r for r in (map_drug(rec, "RETRIE") for rec in sheet_records(ws3)) if r]

print(f"active={len(active)} non_renewed={len(nonren)} withdrawn={len(withdrawn)}")

# ---------------------------------------------------------------- DOCX ----
DOMAINS = {
    "Antalgiques_Anti-inflammatoires": ("Antalgiques & Anti-inflammatoires", "Antalgiques"),
    "Antibiotiques": ("Antibiotiques", "Anti-infectieux"),
    "Antifongiques_Antiparasitaires": ("Antifongiques & Antiparasitaires", "Anti-infectieux"),
    "Cardiologie": ("Cardiologie", "Cardiologie"),
    "Dermatologie": ("Dermatologie", "Dermatologie"),
    "Diabetologie_Endocrinologie": ("Diabétologie & Endocrinologie", "Endocrinologie"),
    "Gastro-enterologie": ("Gastro-entérologie", "Gastro-entérologie"),
    "Gynecologie_Obstetrique": ("Gynécologie & Obstétrique", "Gynécologie"),
    "Neurologie_Antiepileptiques": ("Neurologie & Antiépileptiques", "Neurologie"),
    "ORL": ("ORL", "ORL"),
    "Oncologie": ("Oncologie", "Oncologie"),
    "Ophtalmologie": ("Ophtalmologie", "Ophtalmologie"),
    "Pneumologie_Antiasthmatiques": ("Pneumologie & Antiasthmatiques", "Pneumologie"),
    "Psychiatrie_Psychotropes": ("Psychiatrie & Psychotropes", "Psychiatrie"),
    "Rhumatologie": ("Rhumatologie", "Rhumatologie"),
    "Urologie": ("Urologie", "Urologie"),
    "Vitamines_Mineraux": ("Vitamines & Minéraux", "Nutrition"),
}

# Matches: '1. DCI : Fluoxétine (Seule)' | '2.1.1 DCI : X (En association)'
#          | '161.9.1. DCI : Rétinol (Vitamine A)' | 'DCI : X'
DCI_RE = re.compile(
    r"^(?:\d+(?:\.\d+)*\.?\s*)?DCI\s*:\s*(.+?)\s*$", re.IGNORECASE)


def clean_dci(raw):
    """Strip trailing (Seule)/(En Association) markers, keep alias parens."""
    t = raw.strip()
    t = re.sub(r"\s*\((?:Seule|En Association|En assoc)\)\s*$", "", t, flags=re.IGNORECASE)
    return t.strip()

dci_map = {}  # dciKey -> {domains: [...], classes: [...], label: dci clean name}

for fname in sorted(os.listdir(os.path.join(UPLOAD, "pharmacie_extracted/pharmacie"))):
    if not fname.endswith(".docx"):
        continue
    stem = fname.replace(".docx", "").split("_")[0]
    if stem not in DOMAINS:
        continue
    domain, family = DOMAINS[stem]
    path = os.path.join(UPLOAD, "pharmacie_extracted/pharmacie", fname)
    doc = Document(path)
    current_class = None
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        style = p.style.name
        if style in ("Heading 1", "Heading 2") and re.match(r"(?i)^(chapitre|section|sous[- ]classe)", t):
            # keep last sub/section title as class hint
            m = re.sub(r"(?i)^(chapitre|section)\s*\d+\s*[—-]\s*", "", t)
            m = re.sub(r"(?i)^sous[- ]classe\s*:?\s*", "", m)
            current_class = m[:120]
        m = DCI_RE.match(t)
        if m:
            name = clean_dci(m.group(1))
            key = upper_no_accents(name)
            if not key or len(key) < 3:
                continue
            entry = dci_map.setdefault(key, {"label": name, "domains": [], "classes": []})
            if domain not in entry["domains"]:
                entry["domains"].append(domain)
            if current_class and current_class not in entry["classes"]:
                entry["classes"].append(current_class)

print(f"dci_map entries={len(dci_map)}")

# ------------------------------------------------- Keyword fallback rules ----
# Classify DCIs by pharmacological suffix/keyword when docx matching missed.
SUFFIX_DOMAINS = [
    # (test on upper key, domain)
    (lambda k: k.endswith("PRIL") or k.endswith("SARTAN") or k.endswith("OLOL")
     or k.endswith("DIPINE") or k.endswith("STATINE") or k.endswith("VASTATINE")
     or k.endswith("STIMESULE") or k.endswith("PRAZOSIN"), "Cardiologie"),
    (lambda k: any(x in k for x in (
        "FUROSEMIDE", "HYDROCHLOROTHIAZIDE", "INDAPAMIDE", "SPIRONOLACTONE",
        "WARFARIN", "ACENOCOUMAROL", "CLOPIDOGREL", "TICAGRELOR", "PRASUGREL",
        "RIVAROXABAN", "APIXABAN", "DABIGATRAN", "ENOXAPARINE", "DIGOXINE",
        "AMINOPHYLLINE", "NITRATE", "MOLSIDOMINE", "TRIMEPERIDINE")), "Cardiologie"),
    (lambda k: k.endswith("CILLINE") or "PENICILL" in k or k.endswith("MYCINE")
     or k.endswith("FLOXACINE") or k.endswith("CYCLINE") or k.endswith("CONAZOLE")
     or k.endswith("AVICIN") or k.endswith("THROMYCIN") or k.endswith("RIDAZOLE")
     or k.endswith("NIDAZOLE") or k.endswith("SULFAMID") or "SULFAMETHOXAZOLE" in k
     or "TRIMETHOPRIME" in k or k.endswith("FOSFOMYCINE") or k.endswith("ACIDE FUSIDIQUE")
     or k.endswith("GLYCOPEPTIDE") or "VANCOMYCINE" in k or "TEICOPLANINE" in k
     or "RIFAMPICINE" in k or "ISONIAZIDE" in k or k.endswith("NITROFURANE")
     or k.endswith("QUININE") or k.endswith("ARTHEMETHER") or k.endswith("CEFTRIAXONE")
     or k.startswith("CEF") or k.startswith("CEFT") or k.startswith("CEFA"), "Anti-infectieux"),
    (lambda k: any(x in k for x in ("ALBENDAZOLE", "IVERMECTINE", "PRAZIQUANTEL",
     "MEBENDAZOLE", "FLUCONAZOLE", "TERBINAFINE", "GRISEOFULVINE", "NYSTATINE",
     "AMPHOTERICINE", "KETOCONAZOLE", "CLOTRIMAZOLE", "ECONAZOLE", "SEKNIDAZOLE",
     "TINIDAZOLE", "ORNIDAZOLE")), "Antifongiques & Antiparasitaires"),
    (lambda k: any(x in k for x in ("PARACETAMOL", "ASPIRINE", "ACIDE ACETYLSALICYLIQUE",
     "TRAMADOL", "CODEINE", "MORPHINE", "FENTANYL", "NALBUPHINE", "PETHIDINE",
     "PIROXICAM", "MELOXICAM", "TENOXICAM", "NIMESULIDE", "NEFOPAM", "FLUPIRTINE",
     "DIACEREIN", "COLCHICINE", "ALLOPURINOL", "FEBUXOSTAT")) or k.endswith("PROFENE")
     or k.endswith("PROFEN") or k.endswith("OXICAM") or k.endswith("COXIB"), "Antalgiques & Anti-inflammatoires"),
    (lambda k: any(x in k for x in ("FLUOXETINE", "PAROXETINE", "SERTRALINE", "CITALOPRAM",
     "ESCITALOPRAM", "FLUVOXAMINE", "VENLAFAXINE", "MIRTAZAPINE", "MOCLOBEMIDE",
     "DIAZEPAM", "ALPRAZOLAM", "BROMAZEPAM", "ZOPICLONE", "ZOLPIDEM", "LORAZEPAM",
     "CLONAZEPAM", "OLANZAPINE", "RISPERIDONE", "HALOPERIDOL", "CLOZAPINE",
     "ARIPIPRAZOLE", "QUETIAPINE", "LITHIUM", "CLOMIPRAMINE", "AMITRIPTYLINE",
     "IMIPRAMINE", "MAPROTILINE", "METHADONE")) or k.endswith("TRIPTYLINE")
     or k.endswith("AZEPAM") or k.endswith("PRILO"), "Psychiatrie & Psychotropes"),
    (lambda k: any(x in k for x in ("LAMOTRIGINE", "LEVETIRACETAM", "VALPROATE",
     "VALPROIQUE", "PHENOBARBITAL", "CARBAMAZEPINE", "OXCARBAZEPINE", "TOPIRAMATE",
     "PHENYTOINE", "ETHOSUXIMIDE", "VIGABATRINE", "GABAPENTINE", "PREGABALINE",
     "RILUZOLE", "MEMANTINE", "DONEPEZILE", "RIVASTIGMINE", "SUMATRIPTAN",
     "RIZATRIPTAN", "AMANTADINE", "LEVODOPA", "BIPERIDENE", "TRIHEXYPHENIDYLE")), "Neurologie & Antiépileptiques"),
    (lambda k: any(x in k for x in ("METFORMINE", "GLICLAZIDE", "GLIMEPIRIDE", "GLIBENCLAMIDE",
     "INSULINE", "SITAGLIPTINE", "VILDAGLIPTINE", "SAXAGLIPTINE", "EMPAGLIFLOZINE",
     "DAPAGLIFLOZINE", "CANAGLIFLOZINE", "PIOGLITAZONE", "ROSIGLITAZONE",
     "ACARBOSE", "REPAGLINIDE", "LEVOTHYROXINE", "CARBIMAZOLE", "PROPILTHIOURACILE"
     "PROPRANOLOL")) or k.endswith("GLITAZONE") or k.endswith("GLINIDE")
     or k.endswith("GLIFLOZINE") or k.endswith("GLIPTINE") or k.endswith("PRANDIN"), "Diabétologie & Endocrinologie"),
    (lambda k: k.endswith("PRAZOLE") or any(x in k for x in ("DOMPERIDONE",
     "METOCLOPRAMIDE", "ONDANSETRON", "LOPERAMIDE", "RACECADOTRIL", "SIMETHICONE",
     "DICETEL", "MEBEVERINE", "SPASMOLYTIQUE", "PHLOROGLUCINOL", "TRIMEBUTINE",
     "BISACODYL", "LACTULOSE", "MACROGOL", "PHOSPHATE", "MESALAZINE",
     "SALAZOSULFAPYRIDINE", "URSODESOXYCHOLIQUE", "SIMECRONE", "METOCLOPRAMID")), "Gastro-entérologie"),
    (lambda k: any(x in k for x in ("SALBUTAMOL", "FORMOTEROL", "IPRATROPIUM",
     "MONTELUKAST", "THEOPHYLLINE", "BUDESONIDE", "FLUTICASONE", "BECLOMETASONE",
     "CROMOGLYCATE", "KETOTIFENE", "OMALIZUMAB", "DEXTROMETHORPHANE", "CODETYLLINE"))
     or k.endswith("TEROL") or k.endswith("TROPIUM"), "Pneumologie & Antiasthmatiques"),
    (lambda k: any(x in k for x in ("CETIRIZINE", "LORATADINE", "DESLORATADINE",
     "EBASTINE", "FEXOFENADINE", "BILASTINE", "RUPATADINE", "BUDESOMIDE",
     "XYLOMETAZOLINE", "PSEUDOEPHEDRINE", "AMBROXOL", "CARBOCISTEINE", "ACETYLCYSTEINE",
     "BUDESONIDA", "FLUNARIZINE", "DIMENHYDRINATE", "MECLOZINE", "PSEUDOEPHEDRIN")), "ORL"),
    (lambda k: any(x in k for x in ("TAMSULOSINE", "ALFUZOSINE", "FINASTERIDE",
     "SILDENAFIL", "TADALAFIL", "SOLIFENACINE", "OXYBUTYNINE", "TOLTERODINE",
     "MIRABEGRON", "DESLORELIN", "ALLOPURINOL")) or k.endswith("ALPHA"), "Urologie"),
    (lambda k: any(x in k for x in ("HYDROCORTISONE", "BETAMETHASONE", "CLOBETASOL",
     "TACROLIMUS", "ISOTRETINOINE", "ADAPALENE", "BENZOYLE", "CLINDAMYCINE",
     "ERYTHROMYCINE", "PERMETHRINE", "CALCIPOTRIOL", "PIMECROLIMUS", "SELENIUM",
     "MINOXIDIL", "KETOCONAZOLE", "TRETINOINE", "SCABIES")), "Dermatologie"),
    (lambda k: any(x in k for x in ("TIMOLOL", "LATANOPROST", "TRAVOPROST",
     "DORZOLAMIDE", "BRINZOLAMIDE", "BRIMONIDINE", "TAFLUPROST", "CARBOL",
     "PILOCARPINE", "CYCLOPLEGIQUE", "TOBRAMYCINE", "OFLOXACINE OPHTALIQUE")), "Ophtalmologie"),
    (lambda k: any(x in k for x in ("METHOTREXATE", "CYCLOPHOSPHAMIDE", "CAPECITABINE",
     "TAMOXIFENE", "IMATINIB", "DASATINIB", "NILOTINIB", "SUNITINIB", "SORAFENIB",
     "PACLITAXEL", "DOCETAXEL", "VINCRISTINE", "VINORELBINE", "GEMCITABINE",
     "CYTARABINE", "MELPHALAN", "BUSULFAN", "BLEOMYCINE", "ETOPOSIDE", "CISPLATINE",
     "CARBOPLATINE", "OXALIPLATINE", "5 FLUOROURACILE", "TRASTUZUMAB", "RITUXIMAB",
     "BEVACIZUMAB", "ANASTROZOLE", "LETROZOLE", "EXEMESTANE", "BICALUTAMIDE",
     "LENALIDOMIDE", "THALIDOMIDE", "HYDROXYUREE", "IMIQUIMOD")) or k.endswith("PLATINE")
     or k.endswith("TECANIB") or k.endswith("NIB") and "NILOTINIB" in k, "Oncologie"),
    (lambda k: any(x in k for x in ("VITAMINE", "RETINOL", "THIAMINE", "RIBOFLAVINE",
     "PYRIDOXINE", "CYANOCOBALAMINE", "ACIDE FOLIQUE", "FOLIQUE", "ASCORBIQUE",
     "CHOLECALCIFEROL", "ERGOCALCIFEROL", "TOCOPHEROL", "FER", "CALCIUM", "ZINC",
     "MAGNESIUM", "POTASSIUM", "SELENIUM", "MULTIVITAMINE", "OMEGA", "PHOSPHORE",
     "FLUOR", "MANGANESE", "CUIVRE", "CHROME", "MOLYBDENE", "IODE", "LEVOCARNITINE",
     "COENZYME", "TAURINE", "ARGININE", "ACIDES AMINES")), "Vitamines & Minéraux"),
    (lambda k: any(x in k for x in ("DYDROGESTERONE", "PROGESTERONE", "NORETHISTERONE",
     "LEVONORGESTREL", "ESTRADIOL", "ETHINYLESTRADIOL", "CLOMIFENE", "UTROGESTAN",
     "MISOPROSTOL", "MIFEPRISTONE", "ALPHA DIHYDRO", "DROSPIRENONE", "DESOGESTREL",
     "CYPROTERONE", "SPIRONOLACTONE", "TOCOLYTIQUE", "SALBUTAMOL OBSTETRICAL")), "Gynécologie & Obstétrique"),
]


def keyword_domain(dci_key):
    if not dci_key:
        return None
    words = dci_key.split()
    # test full key, first word (main INN of a combination), then each long word
    candidates = [dci_key] + [w for w in words if len(w) >= 5]
    for test, domain in SUFFIX_DOMAINS:
        for c in candidates:
            try:
                if test(c):
                    return domain
            except Exception:
                continue
    return None


def domains_for_dci(dci):
    key = upper_no_accents(dci or "")
    if not key:
        return [], []
    if key in dci_map:
        e = dci_map[key]
        return e["domains"], e["classes"]
    # split combos on + / / / ET
    parts = re.split(r"\s*\+\s*|\s*/\s*|\s+ET\s+", key)
    doms, cls = [], []
    for part in parts:
        part = part.strip()
        if part in dci_map:
            e = dci_map[part]
            for d in e["domains"]:
                if d not in doms:
                    doms.append(d)
            for c in e["classes"]:
                if c not in cls:
                    cls.append(c)
    return doms, cls


matched = 0
kw_matched = 0
all_drugs = active + nonren + withdrawn
for d in all_drugs:
    doms, cls = domains_for_dci(d["dci"])
    if not doms:
        kw = keyword_domain(d["dciKey"])
        if kw:
            doms = [kw]
            kw_matched += 1
    d["domains"] = doms
    d["classes"] = cls
    if doms:
        matched += 1
print(f"drugs with domain={matched}/{len(all_drugs)} (docx only, +{kw_matched} keyword fallback)")

with open(os.path.join(OUT, "drugs.json"), "w", encoding="utf-8") as f:
    json.dump(all_drugs, f, ensure_ascii=False)

with open(os.path.join(OUT, "dci_map.json"), "w", encoding="utf-8") as f:
    json.dump(dci_map, f, ensure_ascii=False)

# quick sanity
print("sample:", json.dumps(active[0], ensure_ascii=False, default=str)[:600])
print("DONE")
