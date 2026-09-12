/**
 * Seed PharmacyProduct rows from data/pharmacy_prices.json
 * (output of scripts/match_prices.py — pharmacy price list matched to the registry).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const db = new PrismaClient();

interface PriceRow {
  name: string;
  lab: string;
  ppa: number | null;
  cnasId: number | null;
  class: string;
  matchedDrugId: number | null;
  matchScore: number;
}

function nameKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const rows: PriceRow[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "pharmacy_prices.json"), "utf-8")
  );
  console.log(`Loaded ${rows.length} price rows`);

  await db.pharmacyProduct.deleteMany();

  // Map drugs.json order (used by match_prices.py: _id = index+1) -> actual DB ids.
  // The Drug table was re-seeded at least once, so autoincrement ids are offset.
  const allDrugs = await db.drug.findMany({
    orderBy: { id: "asc" },
    select: { id: true, brand: true, dosage: true },
  });
  console.log(`DB drug rows: ${allDrugs.length}`);
  // jsonIndex (0-based) -> db id
  const idByIndex = new Map<number, number>();
  allDrugs.forEach((d, i) => idByIndex.set(i, d.id));

  const spot = allDrugs[3387]; // should be ACARLYSE 50MG per drugs.json
  console.log("spot check drugs.json #3388:", spot);

  const data = rows.map((r) => ({
    name: r.name,
    nameKey: nameKey(r.name),
    lab: r.lab || null,
    ppa: typeof r.ppa === "number" && !Number.isNaN(r.ppa) ? r.ppa : null,
    cnasId: r.cnasId ?? null,
    class: r.class || null,
    drugId:
      r.matchedDrugId && r.matchedDrugId >= 1 && r.matchedDrugId <= allDrugs.length
        ? (idByIndex.get(r.matchedDrugId - 1) ?? null)
        : null,
    matchScore: r.matchScore ?? 0,
  }));

  const BATCH = 500;
  for (let i = 0; i < data.length; i += BATCH) {
    await db.pharmacyProduct.createMany({ data: data.slice(i, i + BATCH) });
  }

  const total = await db.pharmacyProduct.count();
  const linked = await db.pharmacyProduct.count({ where: { drugId: { not: null } } });
  const refundable = await db.pharmacyProduct.count({ where: { cnasId: { not: null } } });
  const pricedDrugs = await db.drug.count({
    where: { pharmacyProducts: { some: {} } },
  });
  console.log(
    `Seeded ${total} products | linked to registry: ${linked} | refundable: ${refundable} | drugs with price: ${pricedDrugs}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
