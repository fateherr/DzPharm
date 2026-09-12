#!/usr/bin/env bun
/** Seed Monograph table from data/monographs.json */
import { readFileSync } from "fs";
import { db } from "../src/lib/db";

interface MonoJson {
  label: string;
  context?: string | null;
  alias?: string | null;
  domain: string;
  domains_extra?: string[];
  book: string;
  sections: Record<string, unknown>;
  keys: string[];
}

async function main() {
  const raw = readFileSync("/home/z/my-project/data/monographs.json", "utf-8");
  const monos = JSON.parse(raw) as MonoJson[];
  console.log(`monographs to seed: ${monos.length}`);

  // wipe & reseed
  await db.monograph.deleteMany({});

  const BATCH = 200;
  for (let i = 0; i < monos.length; i += BATCH) {
    const batch = monos.slice(i, i + BATCH).map((m) => ({
      dciKey: normalize(m.label),
      dci: m.label,
      domain: m.domain,
      book: m.book,
      content: JSON.stringify({
        context: m.context ?? null,
        alias: m.alias ?? null,
        domainsExtra: m.domains_extra ?? [],
        keys: m.keys,
        sections: m.sections,
      }),
    }));
    await db.monograph.createMany({ data: batch });
  }
  const total = await db.monograph.count();
  console.log(`seeded monographs: ${total}`);
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect?.());
