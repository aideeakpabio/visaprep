import { NextRequest, NextResponse } from "next/server";
import { verifyAndUnlockPayment } from "@/lib/payment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reference = body?.reference;

    if (typeof reference !== "string" || !reference.trim()) {
      return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const result = await verifyAndUnlockPayment(reference.trim());

    switch (result.status) {
      case "success":
      case "already_processed":
        return NextResponse.json({ success: true, ...result });
      case "cancelled":
        return NextResponse.json({ success: false, status: "cancelled" }, { status: 200 });
      case "pending":
        return NextResponse.json({ success: false, status: "pending" }, { status: 200 });
      case "failed":
        return NextResponse.json({ success: false, status: "failed" }, { status: 200 });
      case "mismatch":
        return NextResponse.json({ success: false, status: "mismatch", detail: result.detail }, { status: 200 });
      case "network":
        return NextResponse.json({ error: "Could not reach the payment provider." }, { status: 502 });
      case "no_reference":
        return NextResponse.json({ error: "No reference provided." }, { status: 400 });
      case "invalid_metadata":
        return NextResponse.json({ error: "Invalid payment metadata.", detail: result.detail }, { status: 422 });
      case "application_not_found":
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      case "not_paid":
        return NextResponse.json({ error: result.detail ?? "Application is not paid." }, { status: 402 });
      default:
        return NextResponse.json({ error: "Unknown error." }, { status: 500 });
    }
  } catch (err) {
    console.error("[payment/verify] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
