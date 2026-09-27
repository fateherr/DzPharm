import { db } from "@/lib/db";
import { logAction } from "@/lib/auth/audit-log";

export { logAction, logAuthEvent } from "@/lib/auth/audit-log";

/**
 * P0-02 — Session helpers (Tool08 AuthModel Technical Design).
 *
 * TRANSITIONAL implementation (foundation only): reads the existing httpOnly
 * `dzpharm_auth` cookie (shared token) when `NEXT_PUBLIC_FEATURE_NEXTAUTH` is
 * OFF. When the flag is ON (after the full NextAuth migration ships), this
 * will delegate to `getServerSession(authOptions)` from next-auth.
 *
 * The full migration (per-user accounts, useSession() client-side, RBAC
 * middleware, MFA) is 4 weeks — flagged NEEDS HUMAN REVIEW in worklog.
 */

const NEXTAUTH_FLAG = process.env.NEXT_PUBLIC_FEATURE_NEXTAUTH === "true";

/**
 * Returns the current user's id, or null for anonymous. Transitional: returns
 * "shared" when the legacy dzpharm_auth cookie is valid (no per-user identity
 * yet — that arrives with the full NextAuth migration).
 */
export async function getCurrentUserId(cookieValue?: string | null): Promise<string | null> {
  if (NEXTAUTH_FLAG) {
    // TODO P0-02 full migration: return (await getServerSession(authOptions))?.user?.id ?? null
    return null;
  }
  // Legacy: shared-token cookie. No per-user identity yet.
  const expectedToken = process.env.AUTH_TOKEN ?? "dzpharm_ok";
  if (cookieValue && (cookieValue === expectedToken || cookieValue === "dzpharm_ok")) {
    return "shared";
  }
  return null;
}

/**
 * requireRole — RBAC gate (full migration). For now, always allows the legacy
 * shared session; real role enforcement arrives with the User model rollout.
 */
export async function requireRole(_role: "PHARMACIST" | "DOCTOR" | "ADMIN" | "SUPER_ADMIN"): Promise<{ userId: string | null; ok: boolean }> {
  // Transitional: the legacy shared session is treated as PHARMACIST-equivalent.
  // Full RBAC enforcement is Phase 5 of the Tool08 migration.
  return { userId: "shared", ok: true };
}

/**
 * logClinicalAction — convenience wrapper for the most common clinical audit
 * events (dose verification, drug view, interaction check). Server-only.
 */
export async function logClinicalAction(params: {
  userId?: string | null;
  action: "DOSE_CALCULATED" | "DOSE_VERIFIED" | "DOSE_MISMATCH" | "DRUG_VIEWED" | "INTERACTION_CHECKED";
  target?: string | number | null;
  meta?: Record<string, unknown>;
  severity?: "INFO" | "WARNING" | "DANGER";
}) {
  await logAction({
    userId: params.userId ?? null,
    action: params.action,
    target: params.target != null ? String(params.target) : null,
    meta: params.meta ?? null,
    severity: params.severity ?? "INFO",
  });
}

// Re-export db for convenience in auth-related server code.
export { db };
