// Temp inspection script — withdrawal dates distribution (to be deleted after use)
import { db } from "../src/lib/db";

async function main() {
  const [byDate, sample] = await Promise.all([
    db.drug.groupBy({
      by: ["withdrawDate"],
      where: { status: "RETRIE", withdrawDate: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { withdrawDate: "desc" } },
      take: 30,
    }),
    db.drug.findMany({
      where: { status: "RETRIE", withdrawReason: { not: null } },
      select: { id: true, brand: true, dci: true, lab: true, withdrawDate: true, withdrawReason: true },
      orderBy: { id: "desc" },
      take: 5,
    }),
  ]);
  console.log("byDate:", JSON.stringify(byDate, null, 2));
  console.log("sample recent:", JSON.stringify(sample, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
