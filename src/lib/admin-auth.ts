import { NextRequest } from "next/server";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "dzpharm_admin_2026";
export const ADMIN_SESSION_COOKIE = "dzpharm_admin_session";
export const ADMIN_SESSION_TOKEN = "dzpharm_adm_token_sec_2026";

/**
 * Checks if the incoming request has valid admin credentials:
 * 1. Checks dzpharm_admin_session cookie matching ADMIN_SESSION_TOKEN
 * 2. Or checks x-admin-token header matching ADMIN_SESSION_TOKEN
 * 3. Or checks Authorization: Bearer <token>
 */
export function verifyAdminRequest(req: NextRequest): boolean {
  // Check cookie
  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookie && cookie === ADMIN_SESSION_TOKEN) {
    return true;
  }

  // Check header
  const headerToken = req.headers.get("x-admin-token");
  if (headerToken && headerToken === ADMIN_SESSION_TOKEN) {
    return true;
  }

  // Check bearer authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer === ADMIN_SESSION_TOKEN) {
      return true;
    }
  }

  return false;
}
