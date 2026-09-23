import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/novelty — Nouveautés : enregistrements les plus récents de la
 * nomenclature officielle (dates d'enregistrement initial réelles de la
 * base — aucune date fabriquée). Cached 10 min in memory.
 *
 * Query params:
 *   limit — default 15, clamped 5..50
 */

const cache = new Map<string, { value: unknown; expires: number }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") || "15", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(50, Math.max(5, limitRaw))
      : 15;

    const hit = cache.get(`novelty:${limit}`);
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json(hit.value);
    }

    // regDateInitial est stocké au format ISO "YYYY-MM-DD" (vérifié sur la
    // base) : le tri lexicographique DESC est donc chronologique. Les
    // enregistrements sans date sont exclus (aucune date devinée).
    const [rows, totalDated] = await Promise.all([
      db.drug.findMany({
        where: { status: "ACTIF", regDateInitial: { not: null } },
        orderBy: [{ regDateInitial: "desc" }, { brandKey: "asc" }],
        take: limit,
        select: {
          id: true,
          brand: true,
          dci: true,
          form: true,
          dosage: true,
          lab: true,
          country: true,
          regNumber: true,
          regDateInitial: true,
        },
      }),
      db.drug.count({ where: { status: "ACTIF", regDateInitial: { not: null } } }),
    ]);

    const value = {
      recent: rows.map((r) => ({
        id: r.id,
        brand: r.brand,
        dci: r.dci,
        form: r.form,
        dosage: r.dosage,
        lab: r.lab,
        country: r.country,
        regNumber: r.regNumber,
        regDateInitial: r.regDateInitial,
      })),
      /** Nombre total d'actifs portant une date initiale (transparence). */
      totalDated,
      limit,
      generatedAt: new Date().toISOString(),
    };

    cache.set(`novelty:${limit}`, { value, expires: Date.now() + TTL });
    return NextResponse.json(value);
  } catch (error) {
    console.error("[api/novelty]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
