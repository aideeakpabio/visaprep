import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canAccessPremium } from "@/lib/access";

interface ApplicationRow {
  analysis_id: string;
  email: string | null;
  premium_report: Record<string, unknown> | null;
  premium_unlocked: boolean;
  practice_session_limit: number;
  practice_sessions_used: number;
  practice_expires_at: string | null;
  practice_access_started_at: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;

    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json(
        { error: "Sign in is required to access premium content." },
        { status: 401 }
      );
    }

    const access = await canAccessPremium(analysisId, session.email);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Access denied." }, { status: 403 });
    }

    const app = await queryOne<ApplicationRow>(
      "SELECT * FROM applications WHERE analysis_id = $1",
      [analysisId]
    );

    if (!app) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!app.premium_report) {
      return NextResponse.json(
        { error: "Premium report not yet generated. Please contact support." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      analysisId,
      premiumReport: app.premium_report,
      practiceSessionLimit: app.practice_session_limit,
      practiceSessionsUsed: app.practice_sessions_used,
      practiceExpiresAt: app.practice_expires_at,
      practiceAccessStartedAt: app.practice_access_started_at,
    });
  } catch (err) {
    console.error("[analysis/premium] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
