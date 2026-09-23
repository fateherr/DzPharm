import { NextRequest, NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/auth/audit-log";

const PASSWORD = process.env.APP_PASSWORD ?? "dzpharm2025";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "dzpharm_ok";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (password !== PASSWORD) {
    // P0-02: audit login failures (rate-limiting arrives in Phase 5).
    await logAuthEvent("LOGIN_FAILURE", {
      ip,
      userAgent,
      reason: "wrong_password",
    });
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  // P0-02: audit login success (Law 85-05 traceability).
  await logAuthEvent("LOGIN_SUCCESS", { ip, userAgent });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("dzpharm_auth", AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // No maxAge = session cookie → expires when browser closes
    path: "/",
  });
  return response;
}
