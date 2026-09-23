import type { MetadataRoute } from "next";

/**
 * P0-01 — Sitemap (foundation).
 * Lists the 4 static deep-link routes registered by the routing foundation.
 * The 9,555 dynamic medication pages (/medicament/[slug]) land in Phase 3 of
 * the migration (Tool01 deep dive) — deferred, NEEDS HUMAN REVIEW.
 *
 * @see src/lib/route-map.ts
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://dzpharm.dz";
  const now = new Date();
  const staticRoutes = [
    "",
    "/repertoire",
    "/prix-chifa",
    "/interactions",
    "/copilote",
    "/login",
  ];
  return staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/repertoire" ? 0.9 : 0.7,
  }));
}
