import { db } from "@/lib/db";

/**
 * Normalise une chaîne pour la recherche : majuscules, suppression des accents et caractères non alphanumériques.
 */
export function toCleanKey(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convertit un terme en sa clé phonétique pharmaceutique franco-algérienne.
 * Élimine les ambiguïtés orthographiques courantes (PH/F, AU/O, Y/I, TH/T, K/QU/C, double consonnes, E muet).
 */
export function pharmaPhoneticKey(s: string): string {
  let k = toCleanKey(s);
  if (!k) return "";

  // Normalisations phonétiques pharmaceutiques
  k = k.replace(/PH/g, "F");
  k = k.replace(/EAU/g, "O");
  k = k.replace(/AU/g, "O");
  k = k.replace(/Y/g, "I");
  k = k.replace(/TH/g, "T");
  k = k.replace(/QU/g, "K");
  k = k.replace(/CK/g, "K");
  k = k.replace(/C([EIY])/g, "S$1"); // C doux -> S
  k = k.replace(/C/g, "K"); // C dur -> K
  k = k.replace(/CH([AEIOU])/g, "K$1"); // CH dur -> K
  k = k.replace(/([A-Z])\1+/g, "$1"); // Dédoublement des consonnes (LL->L, MM->M, etc.)

  // Élimination du E muet en fin de mot
  const words = k.split(" ").map((w) => (w.endsWith("E") && w.length > 3 ? w.slice(0, -1) : w));
  return words.join(" ").trim();
}

/**
 * Distance de Levenshtein avec seuil de coupure précoce.
 */
export function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > max) return max + 1;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

/* ------------------------------------------------------------------ */
/* Cache en mémoire des candidats (Index phonétique + Trie simplifié)  */
/* ------------------------------------------------------------------ */

interface CandidateIndex {
  loadedAt: number;
  distinctKeys: string[];
  phoneticMap: Map<string, string[]>;
}

let cachedIndex: CandidateIndex | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

async function getCandidateIndex(): Promise<CandidateIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.loadedAt < CACHE_TTL_MS) {
    return cachedIndex;
  }

  const rows = await db.drug.findMany({
    select: { brandKey: true, dciKey: true, status: true },
    orderBy: [{ status: "asc" }], // ACTIF comes before NON_RENOUVELE, RETRIE
  });

  const seen = new Set<string>();
  const activeKeys = new Set<string>();
  const phoneticMap = new Map<string, string[]>();

  for (const r of rows) {
    if (r.status === "ACTIF") {
      if (r.brandKey && r.brandKey.length >= 3) activeKeys.add(r.brandKey);
      if (r.dciKey && r.dciKey.length >= 3) activeKeys.add(r.dciKey);
    }
    if (r.brandKey && r.brandKey.length >= 3) seen.add(r.brandKey);
    if (r.dciKey && r.dciKey.length >= 3) seen.add(r.dciKey);
  }

  for (const key of seen) {
    const pKey = pharmaPhoneticKey(key);
    if (!pKey) continue;
    const existing = phoneticMap.get(pKey);
    if (existing) {
      // Prioritize active keys at the head of the candidate array
      if (activeKeys.has(key)) {
        existing.unshift(key);
      } else {
        existing.push(key);
      }
    } else {
      phoneticMap.set(pKey, [key]);
    }

    // Indexer également chaque mot individuel (ex: "AUGMENTIN" dans "AUGMENTIN ADULTE")
    const words = key.split(" ").filter((w) => w.length >= 3);
    for (const w of words) {
      const pw = pharmaPhoneticKey(w);
      if (pw && pw !== pKey) {
        const list = phoneticMap.get(pw);
        if (list) {
          if (!list.includes(key)) {
            if (activeKeys.has(key)) list.unshift(key);
            else list.push(key);
          }
        } else {
          phoneticMap.set(pw, [key]);
        }
      }
    }
  }

  // Put active keys first in distinctKeys so Levenshtein tie-breaking favors active medicines
  const distinctKeys = [
    ...Array.from(activeKeys),
    ...Array.from(seen).filter((k) => !activeKeys.has(k)),
  ];

  cachedIndex = {
    loadedAt: now,
    distinctKeys,
    phoneticMap,
  };

  return cachedIndex;
}

export interface FuzzyMatchResult {
  candidates: string[];
  suggestion: string | null;
  method: "phonetic" | "levenshtein" | "none";
}

/**
 * Recherche les correspondances phonétiques et orthographiques les plus proches.
 * Tente d'abord la correspondance phonétique O(1), puis bascule sur Levenshtein si aucun résultat.
 */
export async function findPhoneticAndFuzzyMatches(
  query: string,
  limit = 5
): Promise<FuzzyMatchResult> {
  const clean = toCleanKey(query);
  if (clean.length < 3) {
    return { candidates: [], suggestion: null, method: "none" };
  }

  const index = await getCandidateIndex();

  // 1. Tenter la clé phonétique exacte (0ms lookup)
  const pQuery = pharmaPhoneticKey(clean);
  if (pQuery) {
    const directPhonetic = index.phoneticMap.get(pQuery);
    if (directPhonetic && directPhonetic.length > 0) {
      // Trier par ressemblance textuelle
      const sorted = [...directPhonetic].sort((a, b) => {
        const da = levenshtein(a, clean, 4);
        const db = levenshtein(b, clean, 4);
        return da - db;
      });
      const top = sorted.slice(0, limit);
      return {
        candidates: top,
        suggestion: top[0] ?? null,
        method: "phonetic",
      };
    }
  }

  // 2. Recherche tolérante Levenshtein sur les clés distinctes
  const maxDist = clean.length <= 6 ? 1 : 2;
  const scored: { key: string; dist: number }[] = [];

  for (const k of index.distinctKeys) {
    // Test direct du terme complet
    if (Math.abs(k.length - clean.length) <= maxDist) {
      const d = levenshtein(k, clean, maxDist);
      if (d <= maxDist) {
        scored.push({ key: k, dist: d });
        continue;
      }
    }

    // Test sur chaque mot de la clé
    const words = k.split(" ");
    for (const w of words) {
      if (Math.abs(w.length - clean.length) <= maxDist) {
        const d = levenshtein(w, clean, maxDist);
        if (d <= maxDist) {
          scored.push({ key: k, dist: d + 0.5 }); // Légère pénalité pour correspondance sur sous-mot
          break;
        }
      }
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => a.dist - b.dist);
    const top = scored.slice(0, limit).map((s) => s.key);
    return {
      candidates: top,
      suggestion: top[0] ?? null,
      method: "levenshtein",
    };
  }

  return { candidates: [], suggestion: null, method: "none" };
}
