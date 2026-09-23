/**
 * P0-01 — Route map (single source of truth for ViewId ↔ URL).
 * Audit: docs/audit/06_tool_deep_dives/DzPharm_Tool01_RoutingArchitecture_TechnicalDesign.pdf
 *
 * This is the FOUNDATION only of the 2-week routing migration. The full plan
 * (9,555 dynamic medication pages, intercepting routes, 7 clinical-tool routes)
 * is multi-week and flagged NEEDS HUMAN REVIEW in the worklog.
 *
 * Feature flag: NEXT_PUBLIC_FEATURE_APP_ROUTER
 *   - "true"  → header nav uses <Link href={ROUTE_MAP[view]}> (real URLs)
 *   - unset   → header nav falls back to setView() (legacy SPA behaviour)
 *   The stub routes (/repertoire, /prix-chifa, /interactions, /copilote) work
 *   either way; the flag only controls how the header navigates.
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
  apropos: "/apropos",
};

/** Reverse lookup: URL path → ViewId (for deep-linking / SSR). */
export const VIEW_FROM_PATH: Partial<Record<string, ViewId>> = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([v, p]) => [p, v as ViewId]),
);

export const APP_ROUTER_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_APP_ROUTER === "true";

/**
 * Returns the URL for a view. When the flag is off, returns "/" (legacy SPA —
 * the view lives in Zustand state, the URL never changes). When the flag is on,
 * returns the real route path.
 */
export function urlForView(view: ViewId): string {
  return APP_ROUTER_ENABLED ? ROUTE_MAP[view] ?? "/" : "/";
}
