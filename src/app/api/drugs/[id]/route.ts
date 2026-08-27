import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonoIndex, matchMonograph } from "@/lib/rcp";

/**
 * GET /api/drugs/[id] — full drug detail + equivalents (same DCI, other products)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drugId = parseInt(id, 10);
    if (Number.isNaN(drugId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug) {
      return NextResponse.json({ error: "Médicament introuvable" }, { status: 404 });
    }

    // RCP déjà généré (cache) ou fiche livre disponible ?
    let rcpSource: string | null = null;
    try {
      const cached = await db.rcp.findUnique({
        where: { drugId: drug.id },
        select: { source: true },
      });
      if (cached) {
        rcpSource = cached.source;
      } else {
        const index = await getMonoIndex();
        if (index && matchMonograph(index, drug.dciKey ?? drug.dci)) {
          rcpSource = "BOOK";
        }
      }
    } catch {
      /* non bloquant */
    }

    // equivalents: same DCI (exact key), other products, prefer actives
    let equivalents: Record<string, unknown>[] = [];
    if (drug.dciKey) {
      const eq = await db.drug.findMany({
        where: { dciKey: drug.dciKey, id: { not: drug.id } },
        orderBy: [{ status: "asc" }, { brandKey: "asc" }],
        take: 60,
      });
      equivalents = eq.map((e) => ({
        id: e.id,
        brand: e.brand,
        lab: e.lab,
        country: e.country,
        dosage: e.dosage,
        form: e.form,
        packaging: e.packaging,
        status: e.status,
        type: e.type,
      }));
    }

    return NextResponse.json({
      drug: {
        ...drug,
        domains: drug.domains ? JSON.parse(drug.domains) : [],
        classes: drug.classes ? JSON.parse(drug.classes) : [],
        /** BOOK | AI | REGISTRY si un RCP est déjà disponible (cache ou fiche livre). */
        rcpSource,
      },
      equivalents,
    });
  } catch (error) {
    console.error("[api/drugs/[id]]", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
