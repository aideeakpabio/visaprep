/**
 * Shared server-side payment verification and unlock logic.
 * Used by both /api/payment/verify (API route) and the payment callback page.
 */

import crypto from "crypto";
import { query, queryOne } from "./db";

const PREMIUM_AMOUNT_KOBO = 2_000_000; // ₦20,000
const EXTENSION_AMOUNT_KOBO = 500_000; // ₦5,000
const CURRENCY = "NGN";
const PRACTICE_SESSION_LIMIT = 5;
const PRACTICE_DAYS = 90;
const EXTENSION_SESSION_ADD = 3;
const EXTENSION_DAYS_ADD = 30;

export type PaymentType = "premium_application" | "practice_extension";

export type VerifyResult =
  | { status: "success"; paymentType: PaymentType; analysisId: string }
  | { status: "already_processed"; paymentType: PaymentType; analysisId: string }
  | { status: "cancelled" }
  | { status: "pending" }
  | { status: "failed" }
  | { status: "mismatch"; detail: string }
  | { status: "network"; detail?: string }
  | { status: "no_reference" }
  | { status: "invalid_metadata"; detail: string }
  | { status: "application_not_found" }
  | { status: "not_paid"; detail?: string };

export async function verifyAndUnlockPayment(reference: string): Promise<VerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[payment/verify] PAYSTACK_SECRET_KEY not configured");
    return { status: "network", detail: "Payment service not configured." };
  }

  // ── 1. Check if we already processed this reference ──────────────────────
  const existingPayment = await queryOne<{ status: string; analysis_id: string; payment_type: string }>(
    "SELECT status, analysis_id, payment_type FROM payments WHERE paystack_reference = $1",
    [reference]
  );

  if (existingPayment?.status === "successful") {
    return {
      status: "already_processed",
      paymentType: existingPayment.payment_type as PaymentType,
      analysisId: existingPayment.analysis_id,
    };
  }

  // ── 2. Verify with Paystack ───────────────────────────────────────────────
  let paystackData: {
    status: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: { analysisId?: string; paymentType?: string; email?: string };
    customer?: { email?: string };
    paid_at?: string;
  };

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(`[payment/verify] Paystack HTTP ${res.status} ref=${reference}`);
      return { status: "network", detail: `Paystack HTTP ${res.status}` };
    }

    const json = await res.json();
    if (!json.status || !json.data) {
      return { status: "network", detail: "Unexpected Paystack response." };
    }

    paystackData = json.data;
  } catch (err) {
    console.error("[payment/verify] Network error:", err);
    return { status: "network", detail: String(err) };
  }

  // ── 3. Check transaction status ───────────────────────────────────────────
  if (paystackData.status === "abandoned") return { status: "cancelled" };
  if (paystackData.status === "pending") return { status: "pending" };
  if (paystackData.status !== "success") return { status: "failed" };

  // ── 4. Extract metadata ───────────────────────────────────────────────────
  const meta = paystackData.metadata ?? {};
  const analysisId = meta.analysisId;
  const paymentType = (meta.paymentType ?? "premium_application") as PaymentType;
  const email = meta.email ?? paystackData.customer?.email ?? "";

  if (!analysisId) {
    return { status: "invalid_metadata", detail: "No analysisId in transaction metadata." };
  }

  if (paymentType !== "premium_application" && paymentType !== "practice_extension") {
    return { status: "invalid_metadata", detail: `Unknown paymentType: ${paymentType}` };
  }

  // ── 5. Validate amount ────────────────────────────────────────────────────
  const expectedAmount =
    paymentType === "premium_application" ? PREMIUM_AMOUNT_KOBO : EXTENSION_AMOUNT_KOBO;

  if (paystackData.amount !== expectedAmount || paystackData.currency !== CURRENCY) {
    console.error(
      `[payment/verify] Amount/currency mismatch amount=${paystackData.amount} currency=${paystackData.currency} ref=${reference}`
    );
    return {
      status: "mismatch",
      detail: `Expected ₦${expectedAmount / 100} ${CURRENCY}, got ₦${paystackData.amount / 100} ${paystackData.currency}`,
    };
  }

  // ── 6. Look up the application ────────────────────────────────────────────
  const app = await queryOne<{
    analysis_id: string;
    premium_unlocked: boolean;
    practice_session_limit: number;
    practice_sessions_used: number;
    practice_expires_at: string | null;
  }>("SELECT * FROM applications WHERE analysis_id = $1", [analysisId]);

  if (!app) {
    return { status: "application_not_found" };
  }

  const paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();
  const paymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;

  // ── 7. Record the payment ─────────────────────────────────────────────────
  await query(
    `INSERT INTO payments (payment_id, analysis_id, email, payment_type, paystack_reference, amount, currency, status, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'successful', $8)
     ON CONFLICT (paystack_reference) DO UPDATE SET status = 'successful', paid_at = EXCLUDED.paid_at`,
    [paymentId, analysisId, email, paymentType, reference, paystackData.amount, paystackData.currency, paidAt.toISOString()]
  );

  // ── 8. Unlock or extend ───────────────────────────────────────────────────
  if (paymentType === "premium_application") {
    if (app.premium_unlocked) {
      // Already paid — idempotent
      return { status: "already_processed", paymentType, analysisId };
    }

    const practiceExpiresAt = new Date(paidAt.getTime() + PRACTICE_DAYS * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE applications SET
        email = COALESCE(email, $1),
        premium_unlocked = TRUE,
        payment_status = 'paid',
        payment_reference = $2,
        payment_amount = $3,
        paid_at = $4,
        practice_session_limit = $5,
        practice_sessions_used = 0,
        practice_access_started_at = $4,
        practice_expires_at = $6,
        updated_at = NOW()
       WHERE analysis_id = $7`,
      [email, reference, paystackData.amount, paidAt.toISOString(), PRACTICE_SESSION_LIMIT, practiceExpiresAt.toISOString(), analysisId]
    );
  } else {
    // practice_extension
    if (!app.premium_unlocked) {
      return { status: "not_paid", detail: "Application must be paid before extending practice." };
    }

    const now = new Date();
    const currentExpiry = app.practice_expires_at ? new Date(app.practice_expires_at) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base.getTime() + EXTENSION_DAYS_ADD * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE applications SET
        practice_session_limit = practice_session_limit + $1,
        practice_expires_at = $2,
        updated_at = NOW()
       WHERE analysis_id = $3`,
      [EXTENSION_SESSION_ADD, newExpiry.toISOString(), analysisId]
    );
  }

  console.log(`[payment/verify] Unlocked ${paymentType} for analysisId=${analysisId} ref=${reference}`);
  return { status: "success", paymentType, analysisId };
}
