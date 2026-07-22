import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/access";

const OTP_EXPIRY_MINUTES = 15;
const MAX_PENDING_CODES = 5; // Rate limit per email

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = body?.email;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalised = normalizeEmail(email.trim());

    // Rate-limit: max 5 pending codes per email
    await query(
      `DELETE FROM auth_tokens WHERE email = $1 AND used_at IS NULL AND expires_at < NOW()`,
      [normalised]
    );
    const pendingResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM auth_tokens WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [normalised]
    );
    const pending = parseInt(pendingResult[0]?.count ?? "0", 10);
    if (pending >= MAX_PENDING_CODES) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const tokenHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO auth_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)`,
      [tokenHash, normalised, expiresAt.toISOString()]
    );

    // Send email (logs to console in dev if RESEND_API_KEY is not set)
    await sendOtpEmail(normalised, otp);

    // Always return the same message regardless of whether email exists
    return NextResponse.json({
      sent: true,
      message: "If an account is associated with this email, a sign-in code has been sent.",
    });
  } catch (err) {
    console.error("[auth/request-code] Error:", err);
    return NextResponse.json(
      { error: "Could not send the sign-in code. Please try again." },
      { status: 500 }
    );
  }
}
