import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.APP_PASSWORD ?? "dzpharm2025";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "dzpharm_ok";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

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
