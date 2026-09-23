import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

// Format / clean barcode string
function normalizeBarcode(raw: string): string {
  return raw.replace(/[\s\-_]/g, "").toUpperCase();
}

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Accès réservé exclusivement à l'administrateur" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const filter = searchParams.get("filter") || "all"; // 'all' | 'with_barcode' | 'without_barcode'
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.DrugWhereInput = {};

    if (filter === "with_barcode") {
      where.OR = [
        { barcode: { not: null } },
        { drugBarcodes: { some: {} } },
      ];
    } else if (filter === "without_barcode") {
      where.AND = [
        { barcode: null },
        { drugBarcodes: { none: {} } },
      ];
    }

    if (q) {
      const cleanQ = normalizeBarcode(q);
      const searchConditions: Prisma.DrugWhereInput[] = [
        { brand: { contains: q } },
        { brandKey: { contains: q.toUpperCase() } },
        { dci: { contains: q } },
        { dciKey: { contains: q.toUpperCase() } },
        { regNumber: { contains: q } },
        { lab: { contains: q } },
        { barcode: { contains: cleanQ } },
        { drugBarcodes: { some: { barcode: { contains: cleanQ } } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ OR: searchConditions });
      } else {
        where.OR = searchConditions;
      }
    }

    const [drugs, totalMatches, totalDrugs, withBarcodeCount, totalBarcodesRegistered] = await Promise.all([
      db.drug.findMany({
        where,
        take: limit,
        skip,
        orderBy: [
          { barcode: "desc" },
          { brand: "asc" },
        ],
        include: {
          drugBarcodes: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.drug.count({ where }),
      db.drug.count(),
      db.drug.count({
        where: {
          OR: [
            { barcode: { not: null } },
            { drugBarcodes: { some: {} } },
          ],
        },
      }),
      db.drugBarcode.count(),
    ]);

    const coveragePercent = totalDrugs > 0 ? ((withBarcodeCount / totalDrugs) * 100).toFixed(2) : "0";

    return NextResponse.json({
      drugs,
      pagination: {
        page,
        limit,
        totalMatches,
        totalPages: Math.ceil(totalMatches / limit),
      },
      stats: {
        totalDrugs,
        withBarcodeCount,
        totalBarcodesRegistered,
        coveragePercent: parseFloat(coveragePercent),
      },
    });
  } catch (err) {
    console.error("Erreur admin barcodes GET:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Accès réservé exclusivement à l'administrateur" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { drugId, barcode: rawBarcode, note, force } = body;

    if (!drugId || typeof drugId !== "number") {
      return NextResponse.json(
        { error: "L'identifiant du médicament (drugId) est requis" },
        { status: 400 }
      );
    }

    const barcode = normalizeBarcode(String(rawBarcode || ""));
    if (!barcode || barcode.length < 5) {
      return NextResponse.json(
        { error: "Le code-barres doit comporter au moins 5 caractères" },
        { status: 400 }
      );
    }

    // Vérifier l'existence du médicament
    const targetDrug = await db.drug.findUnique({
      where: { id: drugId },
      include: { drugBarcodes: true },
    });

    if (!targetDrug) {
      return NextResponse.json(
        { error: "Médicament introuvable dans la nomenclature" },
        { status: 404 }
      );
    }

    // Vérifier si ce code-barres est déjà assigné à un AUTRE médicament
    const existing = await db.drugBarcode.findUnique({
      where: { barcode },
      include: {
        drug: {
          select: { id: true, brand: true, dosage: true, form: true, lab: true },
        },
      },
    });

    if (existing && existing.drugId !== drugId && !force) {
      return NextResponse.json(
        {
          conflict: true,
          error: `Le code-barres ${barcode} est déjà associé au produit « ${existing.drug.brand} (${existing.drug.dosage || ""}) »`,
          existingDrug: existing.drug,
        },
        { status: 409 }
      );
    }

    // Si réassignation forcée, mettre à jour l'ancien drug.barcode si nécessaire
    if (existing && existing.drugId !== drugId && force) {
      await db.drug.updateMany({
        where: { id: existing.drugId, barcode },
        data: { barcode: null },
      });
    }

    // Associer le code-barres
    await db.$transaction([
      db.drugBarcode.upsert({
        where: { barcode },
        update: {
          drugId,
          note: note ? String(note).trim() : undefined,
        },
        create: {
          barcode,
          drugId,
          note: note ? String(note).trim() : undefined,
        },
      }),
      db.drug.update({
        where: { id: drugId },
        data: {
          barcode, // Définir comme code-barres principal
        },
      }),
    ]);

    const updatedDrug = await db.drug.findUnique({
      where: { id: drugId },
      include: { drugBarcodes: true },
    });

    return NextResponse.json({
      ok: true,
      message: `Code-barres ${barcode} associé avec succès à ${targetDrug.brand}`,
      drug: updatedDrug,
    });
  } catch (err) {
    console.error("Erreur admin barcodes POST:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'association du code-barres" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Accès réservé exclusivement à l'administrateur" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawBarcode = searchParams.get("barcode");
    const drugIdParam = searchParams.get("drugId");

    if (!rawBarcode) {
      return NextResponse.json(
        { error: "Le paramètre 'barcode' est requis" },
        { status: 400 }
      );
    }

    const barcode = normalizeBarcode(rawBarcode);
    const drugId = drugIdParam ? parseInt(drugIdParam, 10) : undefined;

    // Supprimer l'entrée DrugBarcode
    await db.drugBarcode.deleteMany({
      where: {
        barcode,
        ...(drugId ? { drugId } : {}),
      },
    });

    // Mettre à jour Drug.barcode si c'était le barcode principal
    if (drugId) {
      const remaining = await db.drugBarcode.findFirst({
        where: { drugId },
        orderBy: { createdAt: "desc" },
      });

      await db.drug.update({
        where: { id: drugId },
        data: {
          barcode: remaining ? remaining.barcode : null,
        },
      });
    } else {
      // Nettoyer tous les drugs qui avaient ce barcode
      await db.drug.updateMany({
        where: { barcode },
        data: { barcode: null },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Code-barres ${barcode} dissocié avec succès`,
    });
  } catch (err) {
    console.error("Erreur admin barcodes DELETE:", err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du code-barres" },
      { status: 500 }
    );
  }
}
