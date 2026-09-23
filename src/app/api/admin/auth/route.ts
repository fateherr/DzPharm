import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_PASSWORD,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TOKEN,
  verifyAdminRequest,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Mot de passe administrateur incorrect" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      token: ADMIN_SESSION_TOKEN,
      message: "Session administrateur activée avec succès",
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de l'authentification" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const isAuth = verifyAdminRequest(req);
  return NextResponse.json({ authenticated: isAuth });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: "Déconnexion admin réussie" });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
