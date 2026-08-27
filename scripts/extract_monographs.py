#!/usr/bin/env python3
"""DzPharm — Extract full DCI monographs from the 17 pharmacology docx books.

Handles 3 layout formats:
  A) "N. DCI : Name (Seule)" heading (H2/H3) + sections as Normal ":" paragraphs + bullets
  B) Numbered fiches "131.8.1. Name" (H3) + sections as Heading 4
  C) "152A.5 DCI : Name" at H2 level

Output: data/monographs.json — one entry per DCI fiche with canonical sections.
"""
import json
import os
import re
import unicodedata

from docx import Document

BASE = "/home/z/my-project"
BOOKS = os.path.join(BASE, "upload/pharmacie_extracted/pharmacie")
OUT = os.path.join(BASE, "data")

DOMAINS = {
    "Antalgiques": ("Antalgiques & Anti-inflammatoires", "Antalgiques_Anti-inflammatoires"),
    "Antibiotiques": ("Antibiotiques", "Antibiotiques"),
    "Antifongiques": ("Antifongiques & Antiparasitaires", "Antifongiques_Antiparasitaires"),
    "Cardiologie": ("Cardiologie", "Cardiologie"),
    "Dermatologie": ("Dermatologie", "Dermatologie"),
    "Diabetologie": ("Diabétologie & Endocrinologie", "Diabetologie_Endocrinologie"),
    "Gastro-enterologie": ("Gastro-entérologie", "Gastro-enterologie"),
    "Gynecologie": ("Gynécologie & Obstétrique", "Gynecologie_Obstetrique"),
    "Neurologie": ("Neurologie & Antiépileptiques", "Neurologie_Antiepileptiques"),
    "ORL": ("ORL", "ORL"),
    "Oncologie": ("Oncologie", "Oncologie"),
    "Ophtalmologie": ("Ophtalmologie", "Ophtalmologie"),
    "Pneumologie": ("Pneumologie & Antiasthmatiques", "Pneumologie_Antiasthmatiques"),
    "Psychiatrie": ("Psychiatrie & Psychotropes", "Psychiatrie_Psychotropes"),
    "Rhumatologie": ("Rhumatologie", "Rhumatologie"),
    "Urologie": ("Urologie", "Urologie"),
    "Vitamines": ("Vitamines & Minéraux", "Vitamines_Mineraux"),
}

GENERIC_HEADS = (
    "INTRODUCTION", "SOMMAIRE", "AVANT-PROPOS", "OBJET DU", "CONTEXTE", "PERIMETRE",
    "PÉRIMÈTRE", "SOURCES", "GENERALITES", "GÉNÉRALITÉS", "SOUS-CLASSE", "TABLEAU",
    "SYNTHESE", "SYNTHÈSE", "CONCLUSION", "ANNEXES", "ANNEXE", "REFERENCES",
    "RÉFÉRENCES", "MESSAGES", "ALGORITHME", "POPULATIONS", "PHARMACO-ÉCONOMIE",
    "PHARMACO", "CAS CLINIQUES", "PARTICULARITES", "METHODOLOGIE", "STRATEGIE",
    "CATEGORIES", "CATÉGORIES", "PLAN DU", "CADRE NOSOLOGIQUE", "RAPPEL", "DEFINITION", "PLACE", "DIFFERENCES",
    "SPECIFICITES", "SPECIFICITÉS", "STRUCTURE TYPE", "ENGAGEMENTS", "FICHES DCI",
)

# Canonical section keys -> regex recognizers (on normalized lowercase label)
SECTION_DEFS = [
    ("categories", r"liste des categories|categories pharmaco|categories therapeutiques|liste categories"),
    ("available", r"medicaments disponibles"),
    ("mechanism", r"sous[- ]classe et mecanisme|mecanisme d action|mecanismes d action"),
    ("profile", r"profil pharmacologique"),
    ("management", r"prevention et gestion des effets|prevention des effets"),
    ("interactions", r"interactions (importantes|medicamenteuses|avec d autres)"),
    ("pregnancy", r"grossesse et allaitement|grossesse"),
    ("posology", r"posologie et mode d administration|posologie"),
    ("galenic", r"arbitrage et benefices|formes galeniques|arbitrage"),
    ("advice", r"instructions et conseils au patient|conseils au patient|conseil au patient"),
    ("notes", r"notes, regles d or|regles d or|pieges au comptoir|notes et regles"),
    ("pk", r"pharmacocinetique"),
]

DCI_RE = re.compile(r"^(?:\d{1,3}[A-Za-z]?(?:\.\d+)*\.?\s*)?DCI\s*:\s*(.+?)\s*$", re.IGNORECASE)
NUM_RE = re.compile(r"^(\d{2,}[A-Za-z]?(?:\.\d+)+)\.?\s+(.+)$")

SALTS = {
    "DICHLORHYDRATE", "CHLORHYDRATE", "HYDROCHLORIDE", "MALEATE", "SUCCINATE",
    "HEMISULFATE", "SULFATE", "SODIQUE", "POTASSIQUE", "MESILATE", "TARTRATE",
    "BESYLATE", "FUMARATE", "CITRATE", "ACETATE", "BROMHYDRATE", "TOSYLATE",
    "MALATE", "PROPIONATE", "VALERATE", "CALCIQUE", "MAGNESIQUE", "ZINCIQUE",
    "ANHYDRE", "DIHYDRATE", "TRIHYDRATE", "MONOHYDRATE", "BROMURE", "GLUCONATE",
    "LACTATE", "ASCORBATE", "SALICYLATE", "NITRATE", "THEOCLATE", "CAMSYLATE",
    "EMBONATE", "STEARATE", "PALMITATE", "PIVALATE", "ENANTATE", "FURENOATE",
}


def norm_label(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("'", " ").replace("\u2019", " ")
    return re.sub(r"\s+", " ", s).lower().strip()


def ukey(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9 ]", " ", s.upper()).strip()


def clean_dci_name(raw):
    """Remove trailing (Seule)/(En Association)/context markers -> (label, context, alias_in_parens)."""
    t = raw.strip()
    alias = None
    context = None
    t = re.sub(r"\s*\((?:Seule|En Association|En assoc)\)\s*$", "", t, flags=re.IGNORECASE)
    m = re.match(r"^(.*?)\s*\((usage [a-zéèêàç]+|larmes artificielles|visco-supplémentation)\)\s*$", t, flags=re.IGNORECASE)
    if m:
        t, context = m.group(1).strip(), m.group(2)
    m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", t)
    if m and len(m.group(2)) < 40 and "," not in m.group(2):
        alias = m.group(2)
        t = m.group(1).strip()
    return t, context, alias


def canonical_section(label):
    n = norm_label(label)
    for key, pat in SECTION_DEFS:
        if re.search(pat, n):
            return key
    return None


def is_generic_fiche_name(name):
    n = norm_label(name)
    return any(n.startswith(g.lower()) or g.lower() in n for g in GENERIC_HEADS)


class FicheParser:
    """Parses one monograph: list of (style, text) blocks -> canonical sections."""

    def __init__(self):
        self.sections = {k: [] for k, _ in SECTION_DEFS}
        self.sections["profile"] = {}

    def parse(self, blocks):
        current = None          # canonical key of current section
        sub = None              # sub-key inside profile
        for style, text in blocks:
            st = style or ""
            t = text.strip()
            if not t:
                continue
            if st.startswith("Heading"):
                key = canonical_section(t)
                if key:
                    current = key
                    sub = None
                    # section heading text itself may carry info e.g. "Posologie"
                    continue
                # unknown heading -> end of tracked sections
                current = None
                sub = None
                continue
            is_bullet = "List" in st
            # Format C (inline): "Label : content - item - item" in ONE paragraph
            m2 = re.match(r"^(.{3,90}?)\s*:\s*(.+)$", t, flags=re.DOTALL)
            if m2 and not is_bullet:
                key = canonical_section(m2.group(1))
                if key:
                    current = key
                    sub = None
                    body = m2.group(2).strip()
                    for piece in re.split(r"\s+[\u2013-]\s+", body):
                        piece = piece.strip().lstrip("\u2013-").strip()
                        if piece:
                            self._feed(piece, current)
                    continue
            # Format A: paragraph ending with ':' that names a canonical section
            if not is_bullet and t.endswith(":"):
                key = canonical_section(t.rstrip(":").strip())
                if key:
                    current = key
                    sub = None
                    continue
                # sub-header inside profile ("Indications :", "Contre-indications :")
                n = norm_label(t.rstrip(":").strip())
                if current == "profile" or current is None:
                    if "contre" in n:
                        current, sub = "profile", "contraindications"
                        continue
                    if "indication" in n:
                        current, sub = "profile", "indications"
                        continue
                    if "effet indesirable" in n:
                        current, sub = "profile", "adverse"
                        continue
                # non-canonical Normal text: keep as prose if a section is open
                if current:
                    self._add(current, t, sub)
                continue
            if current is None:
                # text before first canonical section (e.g. categories line w/o colon)
                n = norm_label(t)
                if n.startswith("liste des categories"):
                    current = "categories"
                    body = t.split(":", 1)[-1].strip()
                    if body:
                        self._add("categories", body, None)
                continue
            self._feed(t, current, sub)

    def _feed(self, t, current, sub=None):
        """Add one item, auto-detecting profile sub-labels."""
        if current == "profile":
            m = re.match(r"^(Indications|Contre[- ]indications|Effets ind[ée]sirables)\s*:\s*(.+)$",
                         t, flags=re.IGNORECASE)
            if m:
                lbl = norm_label(m.group(1))
                sub = ("contraindications" if "contre" in lbl
                       else "indications" if "indication" in lbl else "adverse")
                self._add("profile", m.group(2), sub)
                return
        self._add(current, t, sub)

    def _add(self, key, text, sub):
        if key == "profile":
            prof = self.sections["profile"]
            if sub:
                prof.setdefault(sub, [])
                if len(prof[sub]) < 40:
                    prof[sub].append(text)
            else:
                prof.setdefault("other", [])
                if len(prof["other"]) < 40:
                    prof["other"].append(text)
        else:
            arr = self.sections[key]
            if len(arr) < 45:
                arr.append(text)


def extract_book(path, domain):
    doc = Document(path)
    paragraphs = [(p.style.name if p.style else "Normal", p.text) for p in doc.paragraphs]
    fiches = []          # list of dict(label, blocks)
    cur = None           # current fiche blocks
    i = 0
    n = len(paragraphs)
    while i < n:
        style, text = paragraphs[i]
        t = text.strip()
        is_head = style.startswith("Heading")
        if is_head and t:
            m = DCI_RE.match(t)
            is_fiche = False
            name = None
            if m and not re.match(r"(?i)^fiches dci$", m.group(1)):
                name = m.group(1)
                is_fiche = True
            else:
                mn = NUM_RE.match(t)
                if mn and style in ("Heading 2", "Heading 3"):
                    cand = mn.group(2).strip()
                    # numbered fiche: name not generic & not itself a section heading,
                    # and next ~45 blocks contain >=2 canonical sections
                    if not is_generic_fiche_name(cand) and not canonical_section(cand) \
                            and len(cand) > 3 and len(cand) < 90 and not cand.isdigit():
                        look = []
                        for j in range(i + 1, min(i + 45, n)):
                            st2, tx2 = paragraphs[j]
                            if tx2.strip() and st2.startswith("Heading"):
                                if canonical_section(tx2):
                                    look.append(tx2)
                            if len(look) >= 2:
                                break
                        if len(look) >= 2:
                            name = cand
                            is_fiche = True
            if is_fiche:
                if cur and len(cur["blocks"]) >= 3:
                    fiches.append(cur)
                cur = {"label": name, "blocks": []}
                i += 1
                continue
            # any other heading ends the current fiche (chapter/sous-classe boundary)
            if style in ("Heading 1", "Heading 2") and cur:
                if len(cur["blocks"]) >= 3:
                    fiches.append(cur)
                cur = None
            elif cur is not None:
                # H3/H4 section heading inside the current fiche (e.g. Format B)
                cur["blocks"].append((style, t))
        elif cur is not None:
            cur["blocks"].append((style, t))
        i += 1
    if cur and len(cur["blocks"]) >= 3:
        fiches.append(cur)

    out = []
    for f in fiches:
        parser = FicheParser()
        parser.parse(f["blocks"])
        secs = parser.sections
        # keep only fiches with real clinical content (>= 2 non-empty canonical sections)
        filled = sum(1 for k in secs if k != "profile" and secs[k])
        prof_filled = sum(1 for k in secs.get("profile", {}) if secs["profile"][k])
        if filled + prof_filled < 2:
            continue
        label, context, alias = clean_dci_name(f["label"])
        if len(label) < 3:
            continue
        out.append({
            "label": label,
            "context": context,
            "alias": alias,
            "domain": domain,
            "book": os.path.basename(path),
            "sections": secs,
        })
    return out


def fiche_size(mo):
    secs = mo["sections"]
    total = 0
    for v in secs.values():
        if isinstance(v, list):
            total += len(v)
    for v in secs.get("profile", {}).values():
        total += len(v)
    return total


def main():
    all_monos = []
    seen = {}
    for fname in sorted(os.listdir(BOOKS)):
        if not fname.endswith(".docx"):
            continue
        stem = fname.replace(".docx", "").split("_")[0]
        if stem not in DOMAINS:
            continue
        domain, _ = DOMAINS[stem]
        monos = extract_book(os.path.join(BOOKS, fname), domain)
        print(f"{stem:18} fiches={len(monos):3}")
        for mo in monos:
            k = ukey(mo["label"])
            if k in seen:
                # keep the richer fiche, merge domain info
                prev = seen[k]
                if fiche_size(mo) > fiche_size(prev):
                    mo["domains_extra"] = sorted(set([prev["domain"], mo["domain"]]))
                    seen[k] = mo
                else:
                    prev.setdefault("domains_extra", [])
                    if mo["domain"] not in prev["domains_extra"]:
                        prev["domains_extra"].append(mo["domain"])
                continue
            seen[k] = mo
    all_monos = list(seen.values())

    # build alias index
    for mo in all_monos:
        keys = {ukey(mo["label"])}
        if mo.get("alias"):
            keys.add(ukey(mo["alias"]))
        if mo.get("context"):
            keys.add(ukey(mo["label"] + " " + mo["context"]))
        # salt-stripped
        for k in list(keys):
            words = [w for w in k.split() if w not in SALTS]
            if words:
                keys.add(" ".join(words))
        mo["keys"] = sorted(k for k in keys if len(k) >= 3)

    with open(os.path.join(OUT, "monographs.json"), "w", encoding="utf-8") as f:
        json.dump(all_monos, f, ensure_ascii=False)

    total_items = sum(fiche_size(mo) for mo in all_monos)
    print(f"\nTOTAL monographs={len(all_monos)} items={total_items}")
    # coverage vs drugs.json
    with open(os.path.join(OUT, "drugs.json"), encoding="utf-8") as f:
        drugs = json.load(f)
    mono_index = {}
    word_index = {}
    for mo in all_monos:
        for k in mo["keys"]:
            mono_index[k] = mo
        for w in ukey(mo["label"]).split():
            if len(w) >= 6:
                word_index.setdefault(w, mo)

    def match(k):
        if not k:
            return None
        if k in mono_index:
            return k
        words = [w for w in k.split() if w not in SALTS]
        s = " ".join(words)
        if s in mono_index:
            return s
        m = re.match(r"^(.*?)\s+EXPRIME\s+EN\s+(.*)$", k)
        if m and m.group(2) in mono_index:
            return m.group(2)
        parts = re.split(r"\s*\+\s*|\s*/\s*|\s+ET\s+", k)
        for p in parts:
            p = p.strip()
            pw = [w for w in p.split() if w not in SALTS]
            ps = " ".join(pw)
            if ps and ps in mono_index:
                return ps
            for w in reversed(pw):
                if len(w) >= 6 and w in word_index:
                    return w
        for w in words:
            if len(w) >= 7 and w in word_index:
                return w
        return None

    matched = sum(1 for d in drugs if match(d.get("dciKey", "")))
    active_m = sum(1 for d in drugs if d["status"] == "ACTIF" and match(d.get("dciKey", "")))
    active_all = sum(1 for d in drugs if d["status"] == "ACTIF")
    print(f"drug coverage: {matched}/{len(drugs)} | active {active_m}/{active_all} = {round(100*active_m/active_all,1)}%")


if __name__ == "__main__":
    main()
