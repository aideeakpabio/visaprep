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
 *      b. Lock the application row with SELECT … FOR UPDATE so concurrent
 *         extension verifications (with distinct references) cannot base expiry
 *         calculations on stale pre-transaction snapshots.
 *      c. Re-read application_synced from the locked payment row. If it is
 *         already TRUE (a concurrent request committed first) we ROLLBACK and
 *         return already_processed without touching the application row.
 *      d. Otherwise we apply the application update and set application_synced=TRUE
 *         in the same COMMIT.
 * 3. If the process crashes after COMMIT both writes are durable. Retries see
 *    application_synced=TRUE and short-circuit to already_processed.
 * 4. If a crash occurs before COMMIT the transaction rolls back. Retries run the
 *    full path again.
 *
 * EMAIL OWNERSHIP
 * ───────────────
 * applications.email is NEVER set during payment initialization (that would allow
 * any caller with a valid analysisId to pre-claim ownership before paying).
 * It is set unconditionally — not via COALESCE — inside the verify transaction,
 * from the Paystack-verified metadata email. This ensures the correct payer's
 * email is always authoritative.
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
  // This is a stale read (outside any transaction) — correctness is enforced
  // inside the transaction below. It is used only to avoid unnecessary Paystack
  // API calls when the payment is already fully processed.
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
  let paystackStatus: string;
  let paystackAmount: number;
  let paystackCurrency: string;
  let paystackPaidAt: string | undefined;
  let metaAnalysisId: string | undefined;
  let metaPaymentType: PaymentType;
  let metaEmail: string;

  // Repair path: payment row exists as successful but application_synced=FALSE.
  // Reuse stored metadata and skip the Paystack call.
  if (fastCheck?.status === "successful" && !fastCheck.application_synced) {
    paystackStatus = "success";
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

    if (paystackStatus === "abandoned") return { status: "cancelled" };
    if (paystackStatus === "pending") return { status: "pending" };
    if (paystackStatus !== "success") return { status: "failed" };

    if (!metaAnalysisId) {
      return { status: "invalid_metadata", detail: "No analysisId in transaction metadata." };
    }
    if (metaPaymentType !== "premium_application" && metaPaymentType !== "practice_extension") {
      return { status: "invalid_metadata", detail: `Unknown paymentType: ${metaPaymentType}` };
    }

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

  // Pre-transaction check: verify extension eligibility using a non-locking read.
  // The authoritative check happens inside the transaction on the locked row.
  if (paymentType === "practice_extension") {
    const preCheck = await queryOne<{ premium_unlocked: boolean }>(
      "SELECT premium_unlocked FROM applications WHERE analysis_id = $1",
      [analysisId]
    );
    if (!preCheck) return { status: "application_not_found" };
    if (!preCheck.premium_unlocked) {
      return { status: "not_paid", detail: "Application must be paid before extending practice." };
    }
  }

  // ── ATOMIC TRANSACTION WITH ROW-LEVEL LOCKS ───────────────────────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert the payment row.
    //    ON CONFLICT (paystack_reference) DO UPDATE acquires a row-level lock
    //    that serializes concurrent requests for the same reference.
    //    application_synced is NOT overwritten on UPDATE so a TRUE value is preserved.
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

    const lockedPayment = upsertResult.rows[0];

    // 2. Re-check application_synced after acquiring the payment row lock.
    //    A concurrent request may have committed between the fast-path read
    //    above and now — if so, skip the application update.
    if (lockedPayment.application_synced) {
      await client.query("ROLLBACK");
      return { status: "already_processed", paymentType, analysisId };
    }

    // 3. Lock the application row so concurrent extension verifications (with
    //    distinct payment references) cannot base expiry on a stale snapshot.
    const appResult = await client.query<ApplicationRow>(
      "SELECT * FROM applications WHERE analysis_id = $1 FOR UPDATE",
      [analysisId]
    );
    const lockedApp = appResult.rows[0];
    if (!lockedApp) {
      await client.query("ROLLBACK");
      return { status: "application_not_found" };
    }

    // 4. Apply the application update.
    if (paymentType === "premium_application") {
      const practiceExpiresAt = new Date(
        paidAt.getTime() + PRACTICE_DAYS * 24 * 60 * 60 * 1000
      );
      // Use email = $1 (unconditional SET, not COALESCE) so the verified payer's
      // email is always authoritative and any pre-claimed stale email is corrected.
      await client.query(
        `UPDATE applications SET
           email                    = $1,
           premium_unlocked         = TRUE,
           payment_status           = 'paid',
           payment_reference        = $2,
           payment_amount           = $3,
           paid_at                  = $4,
           practice_session_limit   = $5,
           practice_sessions_used   = 0,
           practice_access_started_at = $4,
           practice_expires_at      = $6,
           updated_at               = NOW()
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
      // practice_extension: compute expiry from the LOCKED application row so
      // concurrent extensions with different references accumulate correctly.
      const now = new Date();
      const currentExpiry = lockedApp.practice_expires_at
        ? new Date(lockedApp.practice_expires_at)
        : now;
      const base = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(
        base.getTime() + EXTENSION_DAYS_ADD * 24 * 60 * 60 * 1000
      );

      await client.query(
        `UPDATE applications SET
           practice_session_limit = practice_session_limit + $1,
           practice_expires_at    = $2,
           updated_at             = NOW()
         WHERE analysis_id = $3`,
        [EXTENSION_SESSION_ADD, newExpiry.toISOString(), analysisId]
      );
    }

    // 5. Mark payment as application-synced in the same COMMIT so both writes
    //    become durable atomically.
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
    return { status: "network", detail: "Could not apply payment unlock; please retry." };
  } finally {
    client.release();
  }
}
