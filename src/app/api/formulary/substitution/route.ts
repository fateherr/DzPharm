import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

interface FormularyInputItem {
  id?: string;
  name: string;
  stockStatus?: "disponible" | "rupture" | "tension";
  notes?: string;
}

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req);
  if (!rateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessayez dans une minute" },
      { status: 429 }
    );
  }

  let body: { items?: FormularyInputItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const items = body.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Veuillez fournir une liste de produits du livret / stock" },
      { status: 400 }
    );
  }

  // Limite à 50 produits par analyse
  const slice = items.slice(0, 50);

  const results = await Promise.all(
    slice.map(async (item) => {
      const cleanName = item.name.trim();
      const firstWord = cleanName.split(/\s+/)[0] || cleanName;

      // 1. Recherche du médicament dans le référentiel officiel
      const matched = await db.drug.findFirst({
        where: {
          OR: [
            { brand: { contains: cleanName } },
            { dci: { contains: cleanName } },
            { brand: { contains: firstWord } },
          ],
        },
        include: {
          pharmacyProducts: true,
        },
      });

      if (!matched) {
        return {
          inputName: cleanName,
          stockStatus: item.stockStatus || "rupture",
          found: false,
          matchedDrug: null,
          substitutes: [],
          statusNote: "Médicament non répertorié à la nomenclature officielle MSPRH.",
        };
      }

      // 2. Recherche des substituts génériques équivalents actifs (même DCI)
      const substitutes = await db.drug.findMany({
        where: {
          dci: matched.dci,
          status: "ACTIF",
          id: { not: matched.id },
        },
        take: 5,
        include: {
          pharmacyProducts: true,
        },
      });

      const formattedSubstitutes = substitutes.map((s) => ({
        id: s.id,
        brand: s.brand,
        lab: s.lab,
        form: s.form,
        dosage: s.dosage,
        country: s.country,
        ppa: s.pharmacyProducts[0]?.ppa ?? null,
        refundable: Boolean(s.pharmacyProducts[0]?.cnasId),
        cnasId: s.pharmacyProducts[0]?.cnasId ?? null,
      }));

      // 3. Détection d'alerte réglementaire
      let alert: string | null = null;
      if (matched.status === "RETRIE") {
        alert = "PRODUIT RETIRÉ DU MARCHÉ : Ne peut plus être délivré légalement.";
      } else if (matched.status === "NON_RENOUVELE") {
        alert = "ENREGISTREMENT NON RENOUVELÉ : AMM expirée.";
      } else if (item.stockStatus === "rupture") {
        alert = "RUPTURE DE STOCK SIGNALÉE : Substitution générique recommandée.";
      }

      return {
        inputName: cleanName,
        stockStatus: item.stockStatus || "rupture",
        found: true,
        matchedDrug: {
          id: matched.id,
          brand: matched.brand,
          dci: matched.dci,
          dosage: matched.dosage,
          form: matched.form,
          status: matched.status,
          lab: matched.lab,
          country: matched.country,
          ppa: matched.pharmacyProducts[0]?.ppa ?? null,
          refundable: Boolean(matched.pharmacyProducts[0]?.cnasId),
        },
        alert,
        substitutes: formattedSubstitutes,
      };
    })
  );

  return NextResponse.json({
    success: true,
    totalProcessed: results.length,
    results,
  });
}
