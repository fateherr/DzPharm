import { db } from "../src/lib/db";
async function main() {
  const ibu = await db.drug.findMany({
    where: { dciKey: { contains: "IBUPROFENE" } },
    select: { brand: true, dci: true, status: true, dosage: true, form: true, dciKey: true },
    orderBy: { status: "asc" },
  });
  const byStatus: Record<string, number> = {};
  for (const d of ibu) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
  console.log("TOTAL IBUPROFENE-containing dciKey rows:", ibu.length, byStatus);
  console.log("Pure IBUPROFENE by status:");
  for (const d of ibu.filter(x => x.dciKey === "IBUPROFENE")) {
    console.log(`  ${d.status} | ${d.brand} | ${d.dosage} ${d.form ?? ""}`);
  }
  const ant = await db.drug.findMany({ where: { brandKey: { startsWith: "ANTALFEN" } }, select: { brand: true, dci: true, status: true, dosage: true, dciKey: true } });
  console.log("ANTALFEN*:", JSON.stringify(ant, null, 0));
  const bru = await db.drug.findMany({ where: { brandKey: { startsWith: "BRUFEN" } }, select: { brand: true, dci: true, status: true, dosage: true } });
  console.log("BRUFEN*:", JSON.stringify(bru, null, 0));
  const para = await db.drug.count({ where: { dciKey: "PARACETAMOL", status: "ACTIF" } });
  console.log("Pure PARACETAMOL ACTIF count:", para);
}
main();
