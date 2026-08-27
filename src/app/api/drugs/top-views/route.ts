import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/drugs/top-views — médicaments les plus consultés (compteur DzPharm).
 * Query: ?limit=8 (max 20)
 */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const limit = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "8", 10) || 8));

    const rows = await db.drug.findMany({
      where: { views: { gt: 0 } },
      orderBy: [{ views: "desc" }, { brandKey: "asc" }],
      take: limit,
    });

    const index = await getMonoIndex();

    return NextResponse.json({
      top: rows.map((d) => ({
        id: d.id,
        brand: d.brand,
        dci: d.dci,
        form: d.form,
        dosage: d.dosage,
        lab: d.lab,
        status: d.status,
        domain: d.domain,
        views: d.views,
        hasBookRcp: index ? matchMonograph(index, d.dciKey ?? d.dci) !== null : false,
      })),
    });
  } catch (error) {
    console.error("[api/drugs/top-views]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
