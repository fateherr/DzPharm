import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/shortages — community shortage reports (cached 60s in memory).
 * Query params: drugId (optional filter).
 * POST /api/shortages — create a report. Simple abuse guard: max 20 per brand per hour.
 */

interface CacheEntry {
  value: unknown;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 60 * 1000;
const RECENT_LIMIT = 60;
const AGGREGATE_LIMIT = 1000;

/** Bust cached payloads after a new report is created. */
function bustCache() {
  cache.clear();
}

export async function GET(req: NextRequest) {
  try {
    const drugIdRaw = req.nextUrl.searchParams.get("drugId");
    const drugId = drugIdRaw ? parseInt(drugIdRaw, 10) : null;
    const key = drugId ? `shortages:drug:${drugId}` : "shortages:all";

    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json(hit.value);
    }

    const value = await computeShortages(Number.isFinite(drugId) ? drugId : null);
    cache.set(key, { value, expires: Date.now() + TTL });
    return NextResponse.json(value);
  } catch (error) {
    console.error("[api/shortages GET]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      drugId?: unknown;
      brand?: unknown;
      dci?: unknown;
      wilaya?: unknown;
      note?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const brand = typeof body.brand === "string" ? body.brand.trim() : "";
    if (brand.length < 2 || brand.length > 120) {
      return NextResponse.json(
        { error: "Le nom du médicament est requis (2 à 120 caractères)." },
        { status: 400 }
      );
    }

    if (typeof body.note === "string" && body.note.trim().length > 280) {
      return NextResponse.json(
        { error: "La note ne doit pas dépasser 280 caractères." },
        { status: 400 }
      );
    }

    const dci =
      typeof body.dci === "string" && body.dci.trim() ? body.dci.trim().slice(0, 160) : null;
    const wilaya =
      typeof body.wilaya === "string" && body.wilaya.trim() ? body.wilaya.trim().slice(0, 60) : null;
    const note =
      typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 280) : null;
    const drugId =
      typeof body.drugId === "number" && Number.isInteger(body.drugId) && body.drugId > 0
        ? body.drugId
        : null;

    // Abuse guard: max 20 reports per brand per hour (exact brand match, best effort)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.shortageReport.count({
      where: { brand: { equals: brand }, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= 20) {
      return NextResponse.json(
        { error: "Trop de signalements pour ce médicament sur la dernière heure. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const report = await db.shortageReport.create({
      data: { drugId, brand, dci, wilaya, note, status: "SIGNALEE" },
    });

    bustCache();
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("[api/shortages POST]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

/** Reports + aggregate stats, optionally scoped to a single drug. */
async function computeShortages(drugId: number | null) {
  const where = drugId ? { drugId } : {};
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [recentRows, total, active, resolved, last48h] = await Promise.all([
    db.shortageReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
    }),
    db.shortageReport.count({ where }),
    db.shortageReport.count({ where: { ...where, status: "SIGNALEE" } }),
    db.shortageReport.count({ where: { ...where, status: "RESOLUE" } }),
    db.shortageReport.count({ where: { ...where, createdAt: { gte: since48h } } }),
  ]);

  // Manual join with Drug for clickable rows
  const drugIds = [...new Set(recentRows.map((r) => r.drugId).filter((v): v is number => v != null))];
  const drugs = drugIds.length
    ? await db.drug.findMany({
        where: { id: { in: drugIds } },
        select: { id: true, brand: true, dci: true, status: true },
      })
    : [];
  const drugById = new Map(drugs.map((d) => [d.id, d]));

  const reports = recentRows.map((r) => ({
    id: r.id,
    drugId: r.drugId,
    brand: r.brand,
    dci: r.dci,
    wilaya: r.wilaya,
    note: r.note,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    drug: r.drugId ? drugById.get(r.drugId) ?? null : null,
  }));

  // Top reported drugs — aggregate on a larger window, normalized brand keys
  const aggRows = await db.shortageReport.findMany({
    where: {},
    orderBy: { createdAt: "desc" },
    take: AGGREGATE_LIMIT,
    select: { brand: true, dci: true },
  });
  const groups = new Map<string, { brand: string; dci: string | null; count: number }>();
  for (const row of aggRows) {
    const key = normalizeKey(row.brand);
    const entry = groups.get(key) ?? { brand: row.brand, dci: row.dci, count: 0 };
    entry.count += 1;
    if (!entry.dci && row.dci) entry.dci = row.dci;
    groups.set(key, entry);
  }
  const topDrugs = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    reports,
    stats: { total, active, resolved, last48h, topDrugs },
    generatedAt: new Date().toISOString(),
  };
}

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
