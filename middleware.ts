import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const auth = req.cookies.get("dzpharm_auth")?.value;
  if (auth === process.env.AUTH_TOKEN) {
    return NextResponse.next();
  }

  // P0-02 — When the NextAuth flag is on (full migration shipped), also accept
  // the next-auth session cookie. Transitional: the dzpharm_auth cookie above
  // remains the default path until the flag rolls out 10% → 50% → 100%.
  if (process.env.NEXT_PUBLIC_FEATURE_NEXTAUTH === "true") {
    const nextAuthToken =
      req.cookies.get("next-auth.session-token")?.value ??
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    if (nextAuthToken) {
      return NextResponse.next();
    }
  }

  // Redirect to login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  const target = pathname + (req.nextUrl.search || "");
  if (target && target !== "/") {
    loginUrl.searchParams.set("redirectTo", target);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
