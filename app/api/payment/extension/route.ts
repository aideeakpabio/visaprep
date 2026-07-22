import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canAccessPremium } from "@/lib/access";

const EXTENSION_AMOUNT_KOBO = 500_000; // ₦5,000
const CURRENCY = "NGN";

export async function POST(req: NextRequest) {
  try {
    // ── Identity MUST come from the verified session cookie only ─────────────
    // We never trust a client-supplied email for authorization.
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json(
        { error: "You must be signed in to purchase an extension. Use 'Access My Preparation' to sign in." },
        { status: 401 }
      );
    }

    const verifiedEmail = session.email; // cryptographically verified via JWT

    const body = await req.json().catch(() => ({}));
    const { analysisId } = body as { analysisId?: string };

    if (!analysisId || typeof analysisId !== "string") {
      return NextResponse.json({ error: "analysisId is required." }, { status: 400 });
    }

    // Premium access must be verified against the session email
    const access = await canAccessPremium(analysisId, verifiedEmail);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason ?? "Premium access is required before purchasing an extension." },
        { status: 403 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Payment service is not configured." }, { status: 500 });
    }

    const reference = `vp_ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const origin =
      req.headers.get("origin") ??
      (req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
        : new URL(req.url).origin);

    const payload = {
      // Use the session-verified email for Paystack — never the request body
      email: verifiedEmail,
      amount: EXTENSION_AMOUNT_KOBO,
      currency: CURRENCY,
      reference,
      callback_url: `${origin}/payment/callback`,
      metadata: {
        analysisId,
        paymentType: "practice_extension",
        // Do not embed a separate email field — the session email is the identity source
        custom_fields: [
          { display_name: "Product", variable_name: "product", value: "VisaPrep Practice Extension" },
          { display_name: "Application", variable_name: "analysis_id", value: analysisId },
        ],
      },
    };

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!paystackRes.ok) {
      return NextResponse.json({ error: "Could not reach the payment provider." }, { status: 502 });
    }

    const result = await paystackRes.json();
    if (!result.status || !result.data?.authorization_url) {
      return NextResponse.json({ error: "Could not initialize payment." }, { status: 502 });
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url as string,
      reference: result.data.reference as string,
    });
  } catch (err) {
    console.error("[payment/extension] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
