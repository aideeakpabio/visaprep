import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ── Constants — defined server-side only; never accepted from the client ──────
const AMOUNT = 2_000_000; // NGN kobo (₦20,000)
const CURRENCY = "NGN";
const PRODUCT = "VisaPrep Full Assessment";

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
        { error: "A valid email address is required." },
        { status: 400 }
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
      email: email.trim(),
      amount: AMOUNT,
      currency: CURRENCY,
      reference,
      callback_url: callbackUrl,
      metadata: {
        custom_fields: [
          {
            display_name: "Product",
            variable_name: "product",
            value: PRODUCT,
          },
        ],
      },
    };

    console.log(
      `[payment/initialize] Initializing transaction ref=${reference} callback=${callbackUrl}`
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
