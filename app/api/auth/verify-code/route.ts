import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, queryOne } from "@/lib/db";
import { normalizeEmail } from "@/lib/access";
import { createSessionCookie, COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/session";

interface AuthTokenRow {
  id: number;
  token_hash: string;
  email: string;
  expires_at: string;
  used_at: string | null;
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
    const tokenHash = crypto.createHash("sha256").update(code.trim()).digest("hex");

    const tokenRow = await queryOne<AuthTokenRow>(
      `SELECT * FROM auth_tokens
       WHERE email = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalised, tokenHash]
    );

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired sign-in code. Please request a new one." },
        { status: 401 }
      );
    }

    // Mark token as used
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
