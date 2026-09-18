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

    const drug = await db.drug.findUnique({
      where: { id: drugId },
      include: {
        pharmacyProducts: {
          orderBy: [{ ppa: "asc" }],
          select: { id: true, name: true, ppa: true, cnasId: true, class: true, lab: true },
        },
        drugBarcodes: {
          orderBy: [{ createdAt: "desc" }],
          select: { id: true, barcode: true, note: true, createdAt: true },
        },
      },
    });
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

    // equivalents: same DCI (exact key), other products, prefer actives — with pharmacy price
    let equivalents: Record<string, unknown>[] = [];
    if (drug.dciKey) {
      const eq = await db.drug.findMany({
        where: { dciKey: drug.dciKey, id: { not: drug.id } },
        orderBy: [{ status: "asc" }, { brandKey: "asc" }],
        take: 60,
        include: {
          pharmacyProducts: {
            orderBy: [{ ppa: "asc" }],
            take: 1,
            select: { ppa: true, cnasId: true },
          },
        },
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
        price: e.pharmacyProducts[0]?.ppa ?? null,
        refundable: e.pharmacyProducts[0]?.cnasId != null,
      }));
    }

    return NextResponse.json({
      drug: {
        ...drug,
        pharmacyProducts: undefined,
        domains: drug.domains ? JSON.parse(drug.domains) : [],
        classes: drug.classes ? JSON.parse(drug.classes) : [],
        /** Produits d'officine (prix PPA) correspondant à ce médicament. */
        pharmacy: drug.pharmacyProducts.map((p) => ({
          id: p.id,
          name: p.name,
          ppa: p.ppa,
          cnasId: p.cnasId,
          refundable: p.cnasId !== null,
          class: p.class,
          lab: p.lab,
        })),
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
