#!/usr/bin/env python3
"""
Match the pharmacy price database (upload/0530a7b5-...xls) against the drug registry
(data/drugs.json) and export data/pharmacy_prices.json for seeding.

Price file columns: Produit | Laboratoire | PPA | ID CNAS | Classe thérapeutique
Output rows: { name, lab, ppa, cnasId, class, matchedDrugId, matchScore }
"""
import json, re, unicodedata
from collections import defaultdict

PRICE_XLS = "upload/0530a7b5-5ecd-434d-86d2-c102fb1007dc.xls"
DRUGS_JSON = "data/drugs.json"
OUT_JSON = "data/pharmacy_prices.json"


def norm(s):
    """same normalization as extract_data.py: uppercase, strip accents, non-alnum -> space"""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^A-Z0-9]", " ", s.upper())
    return re.sub(r"\s+", " ", s).strip()


def squash(s):
    return norm(s).replace(" ", "")


def num(s):
    """normalize a numeric string: '0,1' -> '0.1'"""
    return str(s).upper().replace(",", ".").strip()


# ---------------------------------------------------------------- load prices
import xlrd

wb = xlrd.open_workbook(PRICE_XLS)
sh = wb.sheet_by_name("A")
raw = []
for r in range(1, sh.nrows):
    name = str(sh.cell_value(r, 0)).strip()
    if not name:
        continue
    lab = str(sh.cell_value(r, 1)).strip()
    ppa = sh.cell_value(r, 2)
    cnas = sh.cell_value(r, 3)
    classe = str(sh.cell_value(r, 4)).strip()
    ppa = round(float(ppa), 2) if isinstance(ppa, float) else None
    cnas = int(cnas) if isinstance(cnas, float) and cnas > 0 else None
    raw.append({"name": name, "lab": lab, "ppa": ppa, "cnasId": cnas, "class": classe})

# dedupe: exact dupes removed; same name (case-insensitive) -> keep LAST occurrence
by_name = {}
for row in raw:
    by_name[row["name"].upper()] = row  # later rows overwrite -> most recent price
prices = list(by_name.values())
print(f"Rows: {len(raw)} -> deduped unique names: {len(prices)}")

# ---------------------------------------------------------------- load drugs
drugs = json.load(open(DRUGS_JSON))
for i, d in enumerate(drugs):
    d["_id"] = i + 1  # sequential id matches prisma autoincrement (seed order)

# index: squashed brandKey -> drug indices
exact_idx = defaultdict(list)
# sorted list for prefix (startsWith) fallback
prefix_list = []  # (squashed brandKey, drugIdx)

for i, d in enumerate(drugs):
    bk = squash(d.get("brandKey") or d.get("brand", ""))
    if not bk:
        continue
    exact_idx[bk].append(i)
    prefix_list.append((bk, i))

prefix_list.sort()

import bisect


def find_prefix_candidates(prefix):
    """registry brands whose squashed key STARTS with `prefix` (prefix >= 5 chars)"""
    out = []
    if len(prefix) < 5:
        return out
    keys = [k for k, _ in prefix_list]
    pos = bisect.bisect_left(keys, prefix)
    while pos < len(keys) and keys[pos].startswith(prefix):
        out.append(prefix_list[pos][1])
        pos += 1
    return out


# ---------------------------------------------------------------- signal extraction
DOSAGE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(MG|ML|G|UI|UG|MCG|%|MEQ|MMOL|IU)(?![A-Z])", re.I)
FORM_MAP = [
    (r"\bCOMP?\b|COMPRIM|DISPERSIBL|MASTIC", "COMPRIM"),
    (r"\bGEL\b|GELULE|GLS|GLES|\bCAPS\b|CAPSULE", "GEL"),
    (r"\bSIR\b|SIROP|SUSP", "SIR"),
    (r"\bINJ\b|INJECT|AMP|AMPoule|SOL INJ|IM\b|IV\b", "INJ"),
    (r"\bSUPP", "SUPP"),
    (r"\bCREME|CREM\b", "CREME"),
    (r"\bCOLLY", "COLLY"),
    (r"\bGTT|GOUTT", "GTT"),
    (r"\bOVUL", "OVULE"),
    (r"\bPOUDR|PDR\b", "POUDRE"),
    (r"\bTUBE|T/|TUB\b", "TUBE"),
    (r"\bSACH", "SACHET"),
    (r"\bPATCH|DISPOSITIF|SYSTEME", "PATCH"),
    (r"\bSPRAY|AEROSOL|INHAL", "SPRAY"),
    (r"\bOLUTION|LOTION", "LOTION"),
    (r"\bPASTILL|PAST\b", "PASTILLE"),
    (r"\bSHAMP", "SHAMP"),
    (r"\bUNIDOSE|UD\b", "UNIDOSE"),
]
PACK_RE = re.compile(r"\b(?:B/|BTE/|BT/|BOITE/|FL/|FA/|T/|P/)\s*(\d+)")


def extract_dosages(s):
    out = set()
    for m in DOSAGE_RE.finditer(s.upper()):
        out.add((num(m.group(1)), m.group(2).upper()))
    return out


def extract_forms(s):
    su = s.upper()
    tags = set()
    for pat, tag in FORM_MAP:
        if re.search(pat, su):
            tags.add(tag)
    return tags


def drug_dosages(d):
    out = set()
    src = f"{d.get('dosage') or ''} {d.get('dci') or ''}"
    for m in DOSAGE_RE.finditer(src.upper()):
        out.add((num(m.group(1)), m.group(2).upper()))
    return out


def drug_forms(d):
    tags = set()
    src = f"{d.get('form') or ''} {d.get('brand') or ''}"
    su = src.upper()
    for pat, tag in FORM_MAP:
        if re.search(pat, su):
            tags.add(tag)
    return tags


def drug_pack_num(d):
    m = re.search(r"(\d+)", d.get("packaging") or "")
    return int(m.group(1)) if m else None


def score_candidate(p_dos, p_forms, p_pack, d):
    sc = 0
    d_dos = drug_dosages(d)
    if p_dos and d_dos:
        inter = p_dos & d_dos
        if inter:
            sc += 4 * len(inter)
        else:
            # numeric-only comparison (unit mismatch e.g. 0,1% vs 0.1)
            pnums = {n for n, _ in p_dos}
            dnums = {n for n, _ in d_dos}
            if pnums & dnums:
                sc += 2
    d_forms = drug_forms(d)
    if p_forms and d_forms:
        inter = p_forms & d_forms
        if inter:
            sc += 3 * len(inter)
    if p_pack and drug_pack_num(d) == p_pack:
        sc += 2
    # prefer active drugs
    if d.get("status") == "ACTIF":
        sc += 1
    return sc


matched_count = 0
results = []
drug_best = {}  # drugIdx -> (score, row index)

for row in prices:
    name = row["name"]
    tokens = re.split(r"[\s/]+", name.strip())
    # candidate brand prefixes: leading tokens WITHOUT digits, longest first
    alpha_prefixes = []
    cur = []
    for t in tokens:
        if re.match(r"^[A-Za-zÀ-ÿ\-\']+$", t):  # alpha (hyphen/apostrophe allowed), no digits
            cur.append(t)
            alpha_prefixes.append(" ".join(cur))
        else:
            break

    cands = []  # drug indices (merged from all strategies)
    seen = set()

    def add_cands(lst):
        for di in lst:
            if di not in seen:
                seen.add(di)
                cands.append(di)

    # 1) exact brandKey prefix (longest first)
    for pref in reversed(alpha_prefixes):
        k = squash(pref)
        if k in exact_idx:
            add_cands(exact_idx[k])
            break
    # 2) registry brands starting with a shorter prefix (e.g. ADAPALENE -> ADAPALENE NOVAGENIRCS)
    for pref in reversed(alpha_prefixes):
        k = squash(pref)
        if len(k) < 5:
            continue
        pc = find_prefix_candidates(k)
        if pc and len(pc) <= 40:  # reject overly generic prefixes
            add_cands(pc)
            break
    # 3) spelling variants: drop 1-2 trailing chars (ALPROFENE -> ALPROFEN)
    for pref in reversed(alpha_prefixes):
        k = squash(pref)
        for drop in (1, 2):
            if len(k) - drop < 5:
                continue
            if k[: len(k) - drop] in exact_idx:
                add_cands(exact_idx[k[: len(k) - drop]])
                break
        else:
            continue
        break

    matched_id = None
    score = 0
    if cands:
        rest = name  # use full name for signals (dosage/form/pack live in the tail)
        p_dos = extract_dosages(rest)
        p_forms = extract_forms(rest)
        m = PACK_RE.search(name.upper())
        p_pack = int(m.group(1)) if m else None
        best = None
        for di in cands:
            sc = score_candidate(p_dos, p_forms, p_pack, drugs[di])
            if best is None or sc > best[0]:
                best = (sc, di)
        if best:
            bsc, bdi = best
            if bsc >= 2:
                score = bsc
                matched_id = drugs[bdi]["_id"]
                matched_count += 1
            elif bsc == 1:
                # weak match (only "ACTIF" bonus): accept only if the brand
                # family has a single registry presentation (unambiguous)
                fam_key = squash(drugs[bdi].get("brandKey") or drugs[bdi].get("brand", ""))
                fam = [j for j in cands if squash(drugs[j].get("brandKey") or drugs[j].get("brand", "")) == fam_key]
                if len(fam) == 1:
                    score = bsc
                    matched_id = drugs[bdi]["_id"]
                    matched_count += 1

    results.append({**row, "matchedDrugId": matched_id, "matchScore": score})

print(f"Matched to registry: {matched_count}/{len(prices)} ({matched_count/len(prices)*100:.1f}%)")
classes = defaultdict(int)
refundable = 0
for r in results:
    if r["class"]:
        classes[r["class"]] += 1
    if r["cnasId"]:
        refundable += 1
print(f"CNAS refundable: {refundable}, with class: {sum(classes.values())}")

json.dump(results, open(OUT_JSON, "w"), ensure_ascii=False, indent=0)
print(f"Wrote {OUT_JSON}")

# sample matches for eyeball check
print("\n--- matched samples:")
for r in results[:12]:
    if r["matchedDrugId"]:
        d = drugs[r["matchedDrugId"] - 1]
        print(f"  {r['name'][:45]:45s} -> {d['brand'][:25]:25s} {d.get('dosage','')} {d.get('form','')[:20]} sc={r['matchScore']}")
print("\n--- unmatched drug-like samples:")
n = 0
for r in results:
    if not r["matchedDrugId"] and r["cnasId"] and n < 15:
        print("  ", r["name"])
        n += 1
