import { NextRequest, NextResponse } from "next/server";

const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "dzpharm_ok";

/**
 * GET /api/auth/verify
 * Vérifie si le cookie httpOnly dzpharm_auth est présent et valide.
 * Utilisé par le SessionGuard côté client pour fermer le contournement
 * via sessionStorage.setItem('dzpharm_session','active').
 *
 * P0-02 Phase 1 — Renforcement de l'authentification.
 */
export async function GET(req: NextRequest) {
  const authCookie = req.cookies.get("dzpharm_auth")?.value;
  const nextAuthCookie =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  const authenticated = authCookie === AUTH_TOKEN || Boolean(nextAuthCookie);

  return NextResponse.json({ authenticated });
}
