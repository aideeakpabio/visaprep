import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, queryOne } from "@/lib/db";
import { normalizeEmail } from "@/lib/access";
import { createSessionCookie, COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/session";

const MAX_FAILED_ATTEMPTS = 5; // OTP locked after 5 wrong guesses
const MAX_RECENT_FAILURES_PER_EMAIL = 10; // email-level rate limit in a 15-min window

interface AuthTokenRow {
  id: number;
  token_hash: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  failed_attempts: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = body?.email;
    const code: unknown = body?.code;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: "Enter your 6-digit sign-in code." }, { status: 400 });
    }

    const normalised = normalizeEmail(email.trim());

    // ── Email-level rate limit: too many recent failed attempts across all tokens ──
    const recentFailures = await query<{ total: string }>(
      `SELECT COALESCE(SUM(failed_attempts), 0) AS total
       FROM auth_tokens
       WHERE email = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [normalised]
    );
    const totalFailures = parseInt(recentFailures[0]?.total ?? "0", 10);
    if (totalFailures >= MAX_RECENT_FAILURES_PER_EMAIL) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    // ── Look up token ─────────────────────────────────────────────────────────
    const tokenHash = crypto.createHash("sha256").update(code.trim()).digest("hex");

    // Find the most recent valid (unused, not expired, not locked) token for this email
    const tokenRow = await queryOne<AuthTokenRow>(
      `SELECT * FROM auth_tokens
       WHERE email = $1
         AND used_at IS NULL
         AND expires_at > NOW()
         AND failed_attempts < $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalised, MAX_FAILED_ATTEMPTS]
    );

    if (!tokenRow) {
      // No valid token — don't reveal whether it's expired, used, or locked
      return NextResponse.json(
        { error: "Invalid or expired sign-in code. Please request a new one." },
        { status: 401 }
      );
    }

    if (tokenRow.token_hash !== tokenHash) {
      // Wrong code — increment failed_attempts on this specific token
      await query(
        "UPDATE auth_tokens SET failed_attempts = failed_attempts + 1 WHERE id = $1",
        [tokenRow.id]
      );

      const attemptsLeft = MAX_FAILED_ATTEMPTS - (tokenRow.failed_attempts + 1);
      const message =
        attemptsLeft <= 0
          ? "Incorrect code. This code has been locked — please request a new one."
          : `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`;

      return NextResponse.json({ error: message }, { status: 401 });
    }

    // ── Correct code: mark as used ─────────────────────────────────────────
    await query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [tokenRow.id]);

    // Issue JWT session cookie
    const token = await createSessionCookie(normalised);
    const cookieMaxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;

    const response = NextResponse.json({ verified: true, email: normalised });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/verify-code] Error:", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
