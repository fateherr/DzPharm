/**
 * P0-01 — Route map (single source of truth for ViewId ↔ URL).
 */
import type { ViewId } from "@/components/dzpharm/store";

export const ROUTE_MAP: Record<ViewId, string> = {
  accueil: "/",
  repertoire: "/repertoire",
  catalogue: "/prix-chifa",
  bibliotheque: "/bibliotheque",
  interactions: "/interactions",
  armoire: "/armoire",
  copilote: "/copilote",
  outils: "/outils",
  stats: "/stats",
  apropos: "/a-propos",
};

/** Reverse lookup: URL path → ViewId (for deep-linking / SSR). */
export const VIEW_FROM_PATH: Partial<Record<string, ViewId>> = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([v, p]) => [p, v as ViewId]),
);

export const APP_ROUTER_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_APP_ROUTER !== "false"; // Default enabled in DzPharm v4

/**
 * Returns the URL for a view.
 */
export function urlForView(view: ViewId): string {
  return ROUTE_MAP[view] ?? "/";
}
