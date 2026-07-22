import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

interface ApplicationRow {
  analysis_id: string;
  applicant_first_name: string | null;
  free_report: Record<string, unknown>;
  payment_status: string;
  premium_unlocked: boolean;
  created_at: string;
}

// Returns the free report for a given analysisId.
// The analysisId is cryptographically unpredictable, which limits enumeration risk.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;

    if (!analysisId || !/^VP-\w{8}-\w{6}$/.test(analysisId)) {
      return NextResponse.json({ error: "Invalid analysis ID." }, { status: 400 });
    }

    const app = await queryOne<ApplicationRow>(
      "SELECT analysis_id, applicant_first_name, free_report, payment_status, premium_unlocked, created_at FROM applications WHERE analysis_id = $1",
      [analysisId]
    );

    if (!app) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      analysisId: app.analysis_id,
      freeReport: app.free_report,
      premiumUnlocked: app.premium_unlocked,
      createdAt: app.created_at,
    });
  } catch (err) {
    console.error("[analysis/get] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
