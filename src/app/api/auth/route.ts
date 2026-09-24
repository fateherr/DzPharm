import { NextRequest, NextResponse } from "next/server";
import { logAction, logAuthEvent } from "@/lib/auth/audit-log";

const PASSWORD = process.env.APP_PASSWORD ?? "dzpharm2025";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "dzpharm_ok";

/**
 * In-memory rate limiter for brute-force protection (P0-02 Phase 1).
 * Limits to 5 failed attempts per IP within a 15-minute window.
 * Automatically cleans up expired entries.
 */
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record) return { allowed: true };

  // Window expired — reset
  if (now - record.firstAttempt > WINDOW_MS) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - record.firstAttempt);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
}

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [ip, record] of failedAttempts) {
      if (now - record.firstAttempt > WINDOW_MS) {
        failedAttempts.delete(ip);
      }
    }
  };
  setInterval(cleanup, 5 * 60 * 1000).unref?.();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Check rate limit
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil((retryAfterMs || 0) / 1000);
    const userAgent = req.headers.get("user-agent") ?? undefined;
    void logAction({
      action: "RATE_LIMIT_HIT",
      meta: { ip, userAgent, retryAfterSec },
      severity: "WARNING",
    });
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSec / 60)} minute${retryAfterSec > 60 ? "s" : ""}.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  const { password } = await req.json();
  const userAgent = req.headers.get("user-agent") ?? undefined;

  if (password !== PASSWORD) {
    recordFailedAttempt(ip);
    await logAuthEvent("LOGIN_FAILURE", {
      ip,
      userAgent,
      reason: "wrong_password",
    });
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  // Success — clear failed attempts
  clearFailedAttempts(ip);
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
