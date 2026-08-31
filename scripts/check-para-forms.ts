import { db } from "../src/lib/db";
async function main() {
  const groups: [string, string][] = [
    ["SOLUTION BUVABLE", "100MG/5ML"],
    ["SACHET", ""],
    ["SUPPO", ""],
    ["GOUTTES", ""],
  ];
  for (const [form, dosage] of groups) {
    const where: any = { dciKey: "PARACETAMOL", status: "ACTIF", form: { contains: form } };
    if (dosage) where.dosage = { contains: dosage };
    const rows = await db.drug.findMany({ where, select: { brand: true, dosage: true, form: true }, orderBy: { brand: "asc" } });
    console.log(`== ${form} ${dosage} (${rows.length}):`);
    for (const r of rows) console.log(`   ${r.brand} | ${r.dosage}`);
  }
  // check specific brands mentioned in pediatric-dosing
  for (const b of ["ISOMOL", "EXPANDOL", "SAPRAMOL", "DOLI-BIEN", "DOLIPRANE"]) {
    const rows = await db.drug.findMany({ where: { brandKey: { startsWith: b }, status: "ACTIF" }, select: { brand: true, dci: true, dosage: true, form: true } });
    console.log(`-- ${b}:`, rows.map(r => `${r.brand} ${r.dosage} (${r.form})`).join(" ; ") || "AUCUN ACTIF");
  }
}
main();
