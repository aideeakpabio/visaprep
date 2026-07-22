/**
 * Shared server-side payment verification and unlock logic.
 *
 * ATOMICITY GUARANTEE
 * The payment row insert (status='successful') and the application row update
 * (premium unlock or practice extension) are always executed inside a single
 * PostgreSQL transaction. Either both commits succeed, or neither does.
 *
 * IDEMPOTENCY
 * The `application_synced` boolean on the payments row tracks whether the
 * application table was successfully updated inside that transaction.
 * If the process crashes after the payment row is written but before
 * application_synced is set to TRUE, subsequent retries detect the gap and
 * re-apply the application update in a fresh transaction before returning
 * `already_processed`.
 */

import crypto from "crypto";
import { pool, queryOne, query } from "./db";
import { PoolClient } from "pg";

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

interface ExistingPaymentRow {
  payment_id: string;
  status: string;
  analysis_id: string;
  payment_type: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  application_synced: boolean;
}

interface ApplicationRow {
  analysis_id: string;
  email: string | null;
  premium_unlocked: boolean;
  practice_session_limit: number;
  practice_sessions_used: number;
  practice_expires_at: string | null;
  practice_access_started_at: string | null;
}

/** Apply or repair the application update for a given payment inside a client transaction. */
async function applyApplicationUpdate(
  client: PoolClient,
  analysisId: string,
  paymentType: PaymentType,
  email: string,
  paymentReference: string,
  amount: number,
  paidAt: Date,
  paymentId: string
): Promise<void> {
  if (paymentType === "premium_application") {
    const practiceExpiresAt = new Date(paidAt.getTime() + PRACTICE_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
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
      [email, paymentReference, amount, paidAt.toISOString(), PRACTICE_SESSION_LIMIT, practiceExpiresAt.toISOString(), analysisId]
    );
  } else {
    // practice_extension — additive, idempotent via application_synced guard above
    const app = await client.query<ApplicationRow>(
      "SELECT * FROM applications WHERE analysis_id = $1",
      [analysisId]
    );
    const appRow = app.rows[0];
    if (!appRow) throw new Error(`Application ${analysisId} not found during extension repair.`);

    const now = new Date();
    const currentExpiry = appRow.practice_expires_at ? new Date(appRow.practice_expires_at) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base.getTime() + EXTENSION_DAYS_ADD * 24 * 60 * 60 * 1000);

    await client.query(
      `UPDATE applications SET
        practice_session_limit = practice_session_limit + $1,
        practice_expires_at = $2,
        updated_at = NOW()
       WHERE analysis_id = $3`,
      [EXTENSION_SESSION_ADD, newExpiry.toISOString(), analysisId]
    );
  }

  // Mark application_synced = TRUE in the same transaction
  await client.query(
    "UPDATE payments SET application_synced = TRUE WHERE payment_id = $1",
    [paymentId]
  );
}

export async function verifyAndUnlockPayment(reference: string): Promise<VerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[payment/verify] PAYSTACK_SECRET_KEY not configured");
    return { status: "network", detail: "Payment service not configured." };
  }

  // ── 1. Check idempotency ──────────────────────────────────────────────────
  // Look for an existing successful payment row for this reference.
  const existingPayment = await queryOne<ExistingPaymentRow>(
    "SELECT * FROM payments WHERE paystack_reference = $1",
    [reference]
  );

  if (existingPayment?.status === "successful") {
    const analysisId = existingPayment.analysis_id;
    const paymentType = existingPayment.payment_type as PaymentType;

    if (existingPayment.application_synced) {
      // Both payment and application were updated atomically — truly done.
      return { status: "already_processed", paymentType, analysisId };
    }

    // application_synced = FALSE: the payment row committed but the application
    // update did not complete (server crash / network failure between the two
    // statements in a previous run). Repair by re-applying the update now.
    console.warn(`[payment/verify] Repairing partial payment ref=${reference} analysisId=${analysisId}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const email = await queryOne<{ email: string }>(
        "SELECT email FROM applications WHERE analysis_id = $1",
        [analysisId]
      );
      const paidAt = existingPayment.paid_at ? new Date(existingPayment.paid_at) : new Date();
      await applyApplicationUpdate(
        client,
        analysisId,
        paymentType,
        email?.email ?? "",
        reference,
        existingPayment.amount,
        paidAt,
        existingPayment.payment_id
      );
      await client.query("COMMIT");
    } catch (repairErr) {
      await client.query("ROLLBACK");
      console.error("[payment/verify] Repair transaction failed:", repairErr);
      return { status: "network", detail: "Repair of payment state failed; please retry." };
    } finally {
      client.release();
    }
    return { status: "already_processed", paymentType, analysisId };
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

  // ── 4. Extract and validate metadata ─────────────────────────────────────
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
  const app = await queryOne<ApplicationRow>(
    "SELECT * FROM applications WHERE analysis_id = $1",
    [analysisId]
  );

  if (!app) return { status: "application_not_found" };

  if (paymentType === "practice_extension" && !app.premium_unlocked) {
    return { status: "not_paid", detail: "Application must be paid before extending practice." };
  }

  const paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();
  const paymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;

  // ── 7. Atomic: record payment + unlock application ────────────────────────
  // Both writes happen inside a single transaction. If the process crashes or
  // an error occurs mid-way, the entire transaction rolls back. On the next
  // retry the payment row will be absent (or still 'pending'), so the caller
  // re-runs the full Paystack verify path and retries the transaction.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert or update payment row (idempotent via ON CONFLICT)
    await client.query(
      `INSERT INTO payments
         (payment_id, analysis_id, email, payment_type, paystack_reference, amount, currency, status, paid_at, application_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'successful', $8, FALSE)
       ON CONFLICT (paystack_reference)
         DO UPDATE SET status = 'successful', paid_at = EXCLUDED.paid_at`,
      [paymentId, analysisId, email, paymentType, reference, paystackData.amount, paystackData.currency, paidAt.toISOString()]
    );

    // Get the actual payment_id (may differ if row already existed)
    const payRow = await client.query<{ payment_id: string }>(
      "SELECT payment_id FROM payments WHERE paystack_reference = $1",
      [reference]
    );
    const actualPaymentId = payRow.rows[0]?.payment_id ?? paymentId;

    // Apply the application update and set application_synced = TRUE atomically
    await applyApplicationUpdate(
      client,
      analysisId,
      paymentType,
      email,
      reference,
      paystackData.amount,
      paidAt,
      actualPaymentId
    );

    await client.query("COMMIT");
  } catch (txErr) {
    await client.query("ROLLBACK");
    console.error("[payment/verify] Transaction failed:", txErr);
    return { status: "network", detail: "Could not apply payment unlock; please retry." };
  } finally {
    client.release();
  }

  console.log(`[payment/verify] ${paymentType} unlocked for analysisId=${analysisId} ref=${reference}`);
  return { status: "success", paymentType, analysisId };
}
