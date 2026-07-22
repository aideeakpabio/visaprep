import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAndUnlockPayment } from "@/lib/payment";
import { queryOne } from "@/lib/db";
import { createSessionCookie, COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/session";

export const metadata: Metadata = { title: "Payment — VisaPrep" };
export const dynamic = "force-dynamic";

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

function HomeButton({ label = "Back to VisaPrep", href = "/" }: { label?: string; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-block px-6 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150"
    >
      {label}
    </Link>
  );
}

function GreenButton({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150"
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

  // ── Server-side verify + unlock ───────────────────────────────────────────
  const result = await verifyAndUnlockPayment(reference);

  // ── Success ───────────────────────────────────────────────────────────────
  if (result.status === "success" || result.status === "already_processed") {
    // Set session cookie so the user can access their preparation immediately
    let sessionEmail = "";
    try {
      const payRow = await queryOne<{ email: string }>(
        "SELECT email FROM payments WHERE paystack_reference = $1 LIMIT 1",
        [reference]
      );
      if (payRow?.email) {
        sessionEmail = payRow.email;
        const token = await createSessionCookie(sessionEmail);
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
          path: "/",
        });
      }
    } catch (e) {
      console.error("[callback] Could not set session cookie:", e);
    }

    const alreadyDone = result.status === "already_processed";
    const isPremium = result.paymentType === "premium_application";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
        <Card>
          <TestModeBadge />
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-semibold text-gray-900">
            {alreadyDone ? "Payment already confirmed" : "Payment confirmed"}
          </h1>
          <p className="text-sm text-gray-700 leading-relaxed">
            {isPremium
              ? "Your purchase unlocks the complete preparation package for this application, permanent access to your saved materials, and five personalised interview-practice sessions available for 90 days."
              : "Your 30-day Practice Extension has been added — three additional personalised interview-practice sessions are now available for this application."}
          </p>

          {result.analysisId && (
            <div className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-left">
              <p className="text-xs text-gray-500 mb-0.5">Application ID</p>
              <p className="text-sm font-mono font-medium text-gray-800">{result.analysisId}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Keep this ID. Your premium access is permanently linked to this application.
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 leading-relaxed">
            Your premium access is linked to this application. A new or materially revised DS-160 requires a separate analysis and purchase.
          </p>

          <div className="flex flex-col gap-3">
            <GreenButton label="Access My Preparation" href="/my-preparations" />
            <HomeButton label="Back to VisaPrep" href="/" />
          </div>
        </Card>
      </main>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (result.status === "cancelled") {
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
  if (result.status === "pending") {
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
  if (result.status === "failed") {
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
  if (result.status === "mismatch") {
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
