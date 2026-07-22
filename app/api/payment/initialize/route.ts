import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { queryOne, query } from "@/lib/db";
import { normalizeEmail } from "@/lib/access";

// ── Constants — defined server-side only; never accepted from the client ──────
const AMOUNT = 2_000_000; // NGN kobo (₦20,000)
const CURRENCY = "NGN";
const PRODUCT = "VisaPrep Full Assessment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = body?.email;
    const analysisId: unknown = body?.analysisId;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalisedEmail = normalizeEmail(email.trim());

    // analysisId is required for application-linked payments
    if (typeof analysisId !== "string" || !analysisId.trim()) {
      return NextResponse.json(
        { error: "Your analysis session has expired. Please upload your DS-160 again." },
        { status: 400 }
      );
    }

    // Verify the application exists and is not already paid
    const app = await queryOne<{ analysis_id: string; premium_unlocked: boolean }>(
      "SELECT analysis_id, premium_unlocked FROM applications WHERE analysis_id = $1",
      [analysisId.trim()]
    );

    if (!app) {
      return NextResponse.json(
        { error: "Your analysis session has expired. Please upload your DS-160 again." },
        { status: 404 }
      );
    }

    if (app.premium_unlocked) {
      return NextResponse.json(
        { error: "This application is already paid. Use 'Access My Preparation' to continue." },
        { status: 409 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error("[payment/initialize] PAYSTACK_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "Payment service is not configured." },
        { status: 500 }
      );
    }

    // Generate a unique reference
    const reference = `vp_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    // Determine callback URL from the request headers (works behind Replit's proxy)
    const origin =
      req.headers.get("origin") ??
      (req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
        : new URL(req.url).origin);
    const callbackUrl = `${origin}/payment/callback`;

    const payload = {
      email: normalisedEmail,
      amount: AMOUNT,
      currency: CURRENCY,
      reference,
      callback_url: callbackUrl,
      metadata: {
        // Trusted metadata retrieved server-side on verify — not from browser
        analysisId: analysisId.trim(),
        paymentType: "premium_application",
        email: normalisedEmail,
        custom_fields: [
          {
            display_name: "Product",
            variable_name: "product",
            value: PRODUCT,
          },
          {
            display_name: "Application ID",
            variable_name: "analysis_id",
            value: analysisId.trim(),
          },
        ],
      },
    };

    console.log(
      `[payment/initialize] Initializing transaction ref=${reference} analysisId=${analysisId.trim()} callback=${callbackUrl}`
    );

    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!paystackRes.ok) {
      console.error(
        `[payment/initialize] Paystack returned HTTP ${paystackRes.status} ref=${reference}`
      );
      return NextResponse.json(
        { error: "Could not reach the payment provider. Please try again." },
        { status: 502 }
      );
    }

    const result = await paystackRes.json();

    if (!result.status || !result.data?.authorization_url) {
      console.error(
        `[payment/initialize] Unexpected Paystack response shape ref=${reference}`
      );
      return NextResponse.json(
        { error: "Could not initialize payment. Please try again." },
        { status: 502 }
      );
    }

    // Record pending payment in DB (idempotent — reference is unique).
    // We do NOT pre-bind the email to applications here — that only happens
    // after Paystack confirms the charge in /api/payment/verify. Pre-binding
    // would let any caller with a valid analysisId permanently claim ownership
    // before they have actually paid.
    try {
      const paymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;
      await query(
        `INSERT INTO payments (payment_id, analysis_id, email, payment_type, paystack_reference, amount, currency, status)
         VALUES ($1, $2, $3, 'premium_application', $4, $5, $6, 'pending')
         ON CONFLICT (paystack_reference) DO NOTHING`,
        [paymentId, analysisId.trim(), normalisedEmail, reference, AMOUNT, CURRENCY]
      );
    } catch (dbErr) {
      console.error("[payment/initialize] DB error (non-fatal):", dbErr);
    }

    console.log(`[payment/initialize] Transaction initialized ref=${reference}`);

    return NextResponse.json({
      authorization_url: result.data.authorization_url as string,
      reference: result.data.reference as string,
    });
  } catch (err) {
    console.error(
      "[payment/initialize] Unexpected error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
