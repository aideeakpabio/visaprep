import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment — VisaPrep" };
export const dynamic = "force-dynamic";

// ── Constants — must match the initializer exactly ────────────────────────────
const AMOUNT_KOBO = 2_000_000;
const CURRENCY = "NGN";

// ── Verification ──────────────────────────────────────────────────────────────

type VerifyStatus =
  | "success"
  | "cancelled"
  | "pending"
  | "failed"
  | "mismatch"
  | "network"
  | "no-reference";

async function verifyTransaction(reference: string): Promise<VerifyStatus> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[payment/callback] PAYSTACK_SECRET_KEY is not configured");
    return "network";
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(
        `[payment/callback] Paystack verify HTTP ${res.status} ref=${reference}`
      );
      return "network";
    }

    const json = await res.json();

    if (!json.status || !json.data) {
      console.error(
        `[payment/callback] Unexpected Paystack response ref=${reference}`
      );
      return "network";
    }

    const tx = json.data as {
      status: string;
      amount: number;
      currency: string;
      reference: string;
    };

    if (tx.status === "abandoned") return "cancelled";
    if (tx.status === "pending") return "pending";
    if (tx.status !== "success") return "failed";

    if (tx.amount !== AMOUNT_KOBO || tx.currency !== CURRENCY) {
      console.error(
        `[payment/callback] Amount/currency mismatch amount=${tx.amount} currency=${tx.currency} ref=${reference}`
      );
      return "mismatch";
    }

    if (tx.reference !== reference) {
      console.error(
        `[payment/callback] Reference mismatch expected=${reference} got=${tx.reference}`
      );
      return "mismatch";
    }

    console.log(`[payment/callback] Payment verified successfully ref=${reference}`);
    return "success";
  } catch (err) {
    console.error(
      "[payment/callback] Network error:",
      err instanceof Error ? err.message : String(err)
    );
    return "network";
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const testMode =
  (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");

function TestModeBadge() {
  if (!testMode) return null;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
      Test Mode
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm max-w-md w-full mx-auto flex flex-col gap-5 text-center">
      {children}
    </div>
  );
}

function HomeButton({ label = "Back to VisaPrep" }: { label?: string }) {
  return (
    <Link
      href="/"
      className="inline-block px-6 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150"
    >
      {label}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? "";

  if (!reference) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <div className="text-3xl">⚠️</div>
          <h1 className="text-lg font-semibold text-gray-900">No payment reference</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            This page can only be reached after completing a payment. If you
            were in the middle of a payment, please try again from the beginning.
          </p>
          <HomeButton label="Back to VisaPrep" />
        </Card>
      </main>
    );
  }

  const result = await verifyTransaction(reference);

  // ── Success ──────────────────────────────────────────────────────────────

  if (result === "success") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <TestModeBadge />
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-semibold text-gray-900">Payment confirmed</h1>
          <p className="text-sm text-gray-700 leading-relaxed">
            Your payment has been confirmed. Your VisaPrep Full Assessment will
            be prepared from your application.
          </p>
          <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Full Assessment access</span>
            <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
              Coming soon
            </span>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              We will notify you as soon as your assessment is ready.
            </p>
          </div>
          <HomeButton label="Back to VisaPrep" />
        </Card>
      </main>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────

  if (result === "cancelled") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <TestModeBadge />
          <div className="text-4xl">🚫</div>
          <h1 className="text-xl font-semibold text-gray-900">Payment cancelled</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            You cancelled before completing payment. No charge was made.
            You can try again whenever you&apos;re ready.
          </p>
          <HomeButton label="Try again" />
        </Card>
      </main>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────

  if (result === "pending") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <TestModeBadge />
          <div className="text-4xl">🕐</div>
          <h1 className="text-xl font-semibold text-gray-900">Payment pending</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your payment is still being processed. Please check back shortly.
            If you were charged and this persists, contact your bank.
          </p>
          <HomeButton label="Back to VisaPrep" />
        </Card>
      </main>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────

  if (result === "failed") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <TestModeBadge />
          <div className="text-4xl">❌</div>
          <h1 className="text-xl font-semibold text-gray-900">Payment unsuccessful</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your payment did not go through. No charge was made.
            Please try again with a different card or payment method.
          </p>
          <HomeButton label="Try again" />
        </Card>
      </main>
    );
  }

  // ── Mismatch (security) ───────────────────────────────────────────────────

  if (result === "mismatch") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900">
            Payment could not be verified
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We could not confirm the details of this payment. If you were
            charged, please contact us so we can look into it.
          </p>
          <HomeButton label="Back to VisaPrep" />
        </Card>
      </main>
    );
  }

  // ── Network / default error ───────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
      <Card>
        <TestModeBadge />
        <div className="text-4xl">🔌</div>
        <h1 className="text-xl font-semibold text-gray-900">Connection error</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          We could not reach the payment service to verify your transaction.
          Please try again in a moment.
        </p>
        <HomeButton label="Back to VisaPrep" />
      </Card>
    </main>
  );
}
