/**
 * DzPharm seed script — imports data/drugs.json into SQLite via Prisma.
 * Run with: bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const db = new PrismaClient();

interface RawDrug {
  regNumber: string | null;
  code: string | null;
  dci: string | null;
  brand: string | null;
  form: string | null;
  dosage: string | null;
  packaging: string | null;
  liste: string | null;
  p1: string | null;
  p2: string | null;
  obs: string | null;
  lab: string | null;
  country: string | null;
  regDateInitial: string | null;
  regDateFinal: string | null;
  type: string | null;
  statut: string | null;
  stability: string | null;
  withdrawDate: string | null;
  withdrawReason: string | null;
  status: string;
  dciKey: string | null;
  brandKey: string | null;
  domains: string[];
  classes: string[];
}

async function main() {
  const raw = readFileSync(join(__dirname, "..", "data", "drugs.json"), "utf-8");
  const drugs: RawDrug[] = JSON.parse(raw);
  console.log(`Loaded ${drugs.length} drugs from JSON`);

  await db.drug.deleteMany({});

  const BATCH = 500;
  for (let i = 0; i < drugs.length; i += BATCH) {
    const batch = drugs.slice(i, i + BATCH).map((d) => ({
      regNumber: d.regNumber,
      code: d.code,
      dci: d.dci,
      dciKey: d.dciKey,
      brand: d.brand,
      brandKey: d.brandKey,
      form: d.form,
      dosage: d.dosage,
      packaging: d.packaging,
      liste: d.liste,
      p1: d.p1,
      p2: d.p2,
      obs: d.obs,
      lab: d.lab,
      country: d.country,
      regDateInitial: d.regDateInitial,
      regDateFinal: d.regDateFinal,
      type: d.type,
      statut: d.statut,
      stability: d.stability,
      withdrawDate: d.withdrawDate,
      withdrawReason: d.withdrawReason,
      status: d.status,
      domains: JSON.stringify(d.domains ?? []),
      classes: JSON.stringify(d.classes ?? []),
      domain: d.domains?.[0] ?? null,
    }));
    await db.drug.createMany({ data: batch });
    process.stdout.write(`\rSeeded ${Math.min(i + BATCH, drugs.length)}/${drugs.length}`);
  }
  console.log("\nDone.");
  const total = await db.drug.count();
  console.log(`Total drugs in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
