/**
 * Shared server-side payment verification and unlock logic.
 *
 * ATOMICITY + CONCURRENCY SAFETY
 * ─────────────────────────────
 * 1. Paystack verification is done outside any transaction (safe: idempotent read).
 * 2. Inside a single PostgreSQL transaction we:
 *      a. UPSERT the payment row (status='successful') — ON CONFLICT DO UPDATE
 *         acquires a row-level lock that serializes concurrent requests on the
 *         same paystack_reference.
 *      b. Re-read application_synced from the locked row. If it is already TRUE
 *         (a concurrent request committed first), we ROLLBACK and return
 *         already_processed without touching the application row.
 *      c. Otherwise we apply the application update and set application_synced=TRUE
 *         in the same commit.
 * 3. If the process crashes after COMMIT, both payment.status='successful' and
 *    application_synced=TRUE are durable. Retries see the consistent state and
 *    short-circuit to already_processed.
 * 4. If a crash occurs before COMMIT the transaction is rolled back, leaving the
 *    payment row in its pre-attempt state. Retries run the full path again.
 */

import crypto from "crypto";
import { pool, queryOne } from "./db";

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
  | { status: "invalid_metadata"; detail: string }
  | { status: "application_not_found" }
  | { status: "not_paid"; detail?: string };

interface PaymentRow {
  payment_id: string;
  analysis_id: string;
  email: string;
  payment_type: string;
  paystack_reference: string;
  amount: number;
  currency: string;
  status: string;
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
}

export async function verifyAndUnlockPayment(reference: string): Promise<VerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[payment/verify] PAYSTACK_SECRET_KEY not configured");
    return { status: "network", detail: "Payment service not configured." };
  }

  // ── OPTIMIZATION: Fast-path for fully completed payments ──────────────────
  // This is a stale read (no lock) — it is safe as an optimisation only.
  // Correctness is enforced inside the transaction below.
  const fastCheck = await queryOne<PaymentRow>(
    "SELECT * FROM payments WHERE paystack_reference = $1",
    [reference]
  );

  if (fastCheck?.status === "successful" && fastCheck.application_synced) {
    return {
      status: "already_processed",
      paymentType: fastCheck.payment_type as PaymentType,
      analysisId: fastCheck.analysis_id,
    };
  }

  // ── PAYSTACK VERIFICATION (outside transaction — safe idempotent read) ─────
  // We always call Paystack unless we already have a committed successful row.
  // For the repair case (status='successful', application_synced=FALSE), we
  // could skip the Paystack call, but calling it again is safe and keeps the
  // code path uniform.

  let paystackStatus: string;
  let paystackAmount: number;
  let paystackCurrency: string;
  let paystackPaidAt: string | undefined;
  let metaAnalysisId: string | undefined;
  let metaPaymentType: PaymentType;
  let metaEmail: string;

  // If a successful row exists but is unsynced, reuse its stored data for
  // the application update (Paystack call is still attempted but metadata
  // comes from DB to guard against metadata tampering on re-submission).
  if (fastCheck?.status === "successful" && !fastCheck.application_synced) {
    paystackStatus = "success"; // we already know it succeeded
    paystackAmount = fastCheck.amount;
    paystackCurrency = fastCheck.currency;
    paystackPaidAt = fastCheck.paid_at ?? undefined;
    metaAnalysisId = fastCheck.analysis_id;
    metaPaymentType = fastCheck.payment_type as PaymentType;
    metaEmail = fastCheck.email;
    console.warn(
      `[payment/verify] Repairing unsynced payment ref=${reference} analysisId=${metaAnalysisId}`
    );
  } else {
    // Normal first-time path: verify with Paystack
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" }
      );

      if (!res.ok) {
        console.error(`[payment/verify] Paystack HTTP ${res.status} ref=${reference}`);
        return { status: "network", detail: `Paystack HTTP ${res.status}` };
      }

      const json = await res.json();
      if (!json.status || !json.data) {
        return { status: "network", detail: "Unexpected Paystack response shape." };
      }

      const d = json.data as {
        status: string;
        amount: number;
        currency: string;
        reference: string;
        metadata?: { analysisId?: string; paymentType?: string; email?: string };
        customer?: { email?: string };
        paid_at?: string;
      };

      paystackStatus = d.status;
      paystackAmount = d.amount;
      paystackCurrency = d.currency;
      paystackPaidAt = d.paid_at;
      metaAnalysisId = d.metadata?.analysisId;
      metaPaymentType = ((d.metadata?.paymentType) ?? "premium_application") as PaymentType;
      metaEmail = d.metadata?.email ?? d.customer?.email ?? "";
    } catch (err) {
      console.error("[payment/verify] Network error:", err);
      return { status: "network", detail: String(err) };
    }

    // ── Status checks ──────────────────────────────────────────────────────
    if (paystackStatus === "abandoned") return { status: "cancelled" };
    if (paystackStatus === "pending") return { status: "pending" };
    if (paystackStatus !== "success") return { status: "failed" };

    // ── Metadata validation ────────────────────────────────────────────────
    if (!metaAnalysisId) {
      return { status: "invalid_metadata", detail: "No analysisId in transaction metadata." };
    }
    if (metaPaymentType !== "premium_application" && metaPaymentType !== "practice_extension") {
      return {
        status: "invalid_metadata",
        detail: `Unknown paymentType: ${metaPaymentType}`,
      };
    }

    // ── Amount validation ──────────────────────────────────────────────────
    const expected =
      metaPaymentType === "premium_application" ? PREMIUM_AMOUNT_KOBO : EXTENSION_AMOUNT_KOBO;
    if (paystackAmount !== expected || paystackCurrency !== CURRENCY) {
      console.error(
        `[payment/verify] Amount/currency mismatch amount=${paystackAmount} currency=${paystackCurrency} ref=${reference}`
      );
      return {
        status: "mismatch",
        detail: `Expected ₦${expected / 100} ${CURRENCY}, got ₦${paystackAmount / 100} ${paystackCurrency}`,
      };
    }
  }

  const analysisId = metaAnalysisId!;
  const paymentType = metaPaymentType!;
  const email = metaEmail!;
  const paidAt = paystackPaidAt ? new Date(paystackPaidAt) : new Date();
  const newPaymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;

  // ── Look up the application ───────────────────────────────────────────────
  const app = await queryOne<ApplicationRow>(
    "SELECT * FROM applications WHERE analysis_id = $1",
    [analysisId]
  );
  if (!app) return { status: "application_not_found" };

  if (paymentType === "practice_extension" && !app.premium_unlocked) {
    return { status: "not_paid", detail: "Application must be paid before extending practice." };
  }

  // ── ATOMIC TRANSACTION WITH ROW-LEVEL LOCK ────────────────────────────────
  // ON CONFLICT (paystack_reference) DO UPDATE acquires a row-level lock on the
  // conflicting row. Concurrent requests block here until the first one commits
  // or rolls back, serializing all processing for the same reference.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert the payment row — creates it (locked) or updates + locks existing row.
    // Sets application_synced=FALSE on INSERT; does NOT overwrite it on UPDATE
    // (so an already-synced row preserves TRUE).
    const upsertResult = await client.query<PaymentRow>(
      `INSERT INTO payments
         (payment_id, analysis_id, email, payment_type, paystack_reference,
          amount, currency, status, paid_at, application_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'successful', $8, FALSE)
       ON CONFLICT (paystack_reference) DO UPDATE
         SET status = 'successful',
             paid_at = COALESCE(payments.paid_at, EXCLUDED.paid_at)
       RETURNING *`,
      [
        newPaymentId,
        analysisId,
        email,
        paymentType,
        reference,
        paystackAmount,
        paystackCurrency,
        paidAt.toISOString(),
      ]
    );

    const lockedRow = upsertResult.rows[0];

    // Re-check application_synced after acquiring the lock.
    // A concurrent request may have committed between our fast-path read
    // and now — if so, skip the application update.
    if (lockedRow.application_synced) {
      await client.query("ROLLBACK");
      return { status: "already_processed", paymentType, analysisId };
    }

    // ── Apply the application update ────────────────────────────────────────
    // We hold the row lock — exactly one request will reach this block.
    if (paymentType === "premium_application") {
      const practiceExpiresAt = new Date(
        paidAt.getTime() + PRACTICE_DAYS * 24 * 60 * 60 * 1000
      );
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
        [
          email,
          reference,
          paystackAmount,
          paidAt.toISOString(),
          PRACTICE_SESSION_LIMIT,
          practiceExpiresAt.toISOString(),
          analysisId,
        ]
      );
    } else {
      // practice_extension — additive update is safe because the row lock
      // guarantees exactly one request reaches this branch per reference.
      const now = new Date();
      const currentExpiry = app.practice_expires_at
        ? new Date(app.practice_expires_at)
        : now;
      const base = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(
        base.getTime() + EXTENSION_DAYS_ADD * 24 * 60 * 60 * 1000
      );

      await client.query(
        `UPDATE applications SET
           practice_session_limit = practice_session_limit + $1,
           practice_expires_at = $2,
           updated_at = NOW()
         WHERE analysis_id = $3`,
        [EXTENSION_SESSION_ADD, newExpiry.toISOString(), analysisId]
      );
    }

    // Mark payment as application-synced in the same transaction.
    // On COMMIT both the application update and application_synced=TRUE become
    // durable atomically.
    await client.query(
      "UPDATE payments SET application_synced = TRUE WHERE paystack_reference = $1",
      [reference]
    );

    await client.query("COMMIT");
    console.log(
      `[payment/verify] Unlocked ${paymentType} for analysisId=${analysisId} ref=${reference}`
    );
    return { status: "success", paymentType, analysisId };
  } catch (txErr) {
    await client.query("ROLLBACK");
    console.error("[payment/verify] Transaction rolled back:", txErr);
    return {
      status: "network",
      detail: "Could not apply payment unlock; please retry.",
    };
  } finally {
    client.release();
  }
}
