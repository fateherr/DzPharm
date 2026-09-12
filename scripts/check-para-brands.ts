import { db } from "../src/lib/db";
async function main() {
  const susp = await db.drug.findMany({
    where: { dciKey: "PARACETAMOL", status: "ACTIF", form: { contains: "SUSP" } },
    select: { brand: true, dosage: true, form: true },
    orderBy: { brand: "asc" },
  });
  console.log("PARACETAMOL ACTIF suspensions:", susp.length);
  for (const s of susp) console.log(`  ${s.brand} | ${s.dosage} | ${s.form}`);
  const oral = await db.drug.findMany({
    where: { dciKey: "PARACETAMOL", status: "ACTIF", form: { contains: "SIROP" } },
    select: { brand: true, dosage: true, form: true },
  });
  console.log("PARACETAMOL ACTIF sirop:", oral.length);
  for (const s of oral) console.log(`  ${s.brand} | ${s.dosage} | ${s.form}`);
}
main();
