import { db } from "@/lib/db";
import type { AuditAction, AuditSeverity } from "@prisma/client";

/**
 * P0-02 — Audit log helper (Tool08 AuthModel §AuditLog).
 * Writes a durable audit-trail entry for clinical actions (Law 85-05 Art. 52
 * traceability — 7-year retention). Server-side only.
 *
 * Usage:
 *   await logAction({ userId: user.id, action: 'DOSE_VERIFIED', target: drugId.toString(),
 *                     meta: JSON.stringify({ engine: 'mg/kg', dose: '500mg' }), severity: 'INFO' })
 *
 * Failures are non-blocking: an audit write error must NEVER break a clinical
 * action — it logs to stderr and continues.
 */
export async function logAction(params: {
  userId?: string | null;
  action: AuditAction;
  target?: string | null;
  meta?: Record<string, unknown> | string | null;
  severity?: AuditSeverity;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        target: params.target ?? null,
        meta:
          typeof params.meta === "string"
            ? params.meta
            : params.meta
              ? JSON.stringify(params.meta)
              : null,
        severity: params.severity ?? "INFO",
      },
    });
  } catch (err) {
    // Non-blocking: audit failure must never break a clinical action.
    console.error("[audit-log] write failed:", err);
  }
}

/** Convenience: log a login success/failure with IP + UA meta. */
export async function logAuthEvent(
  action: "LOGIN_SUCCESS" | "LOGIN_FAILURE",
  opts: { userId?: string | null; ip?: string; userAgent?: string; reason?: string },
) {
  await logAction({
    userId: opts.userId ?? null,
    action,
    meta: { ip: opts.ip, userAgent: opts.userAgent, reason: opts.reason },
    severity: action === "LOGIN_SUCCESS" ? "INFO" : "WARNING",
  });
}
