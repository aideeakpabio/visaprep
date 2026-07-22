import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { normalizeEmail } from "@/lib/access";

export const metadata: Metadata = { title: "My Preparations — VisaPrep" };
export const dynamic = "force-dynamic";

interface ApplicationRow {
  analysis_id: string;
  applicant_first_name: string | null;
  free_report: {
    applicationProfile?: string;
    firstName?: string;
    visaCategory?: string;
  };
  payment_status: string;
  premium_unlocked: boolean;
  practice_session_limit: number;
  practice_sessions_used: number;
  practice_expires_at: string | null;
  practice_access_started_at: string | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function practiceStatus(app: ApplicationRow): { label: string; sublabel?: string; expired: boolean; exhausted: boolean } {
  if (!app.premium_unlocked) return { label: "", expired: false, exhausted: false };
  const now = new Date();
  const expired = app.practice_expires_at ? new Date(app.practice_expires_at) < now : false;
  const exhausted = app.practice_sessions_used >= app.practice_session_limit && app.practice_session_limit > 0;
  const remaining = Math.max(0, app.practice_session_limit - app.practice_sessions_used);

  if (expired) {
    return { label: "Practice period ended", sublabel: `Ended ${formatDate(app.practice_expires_at)}`, expired: true, exhausted: false };
  }
  if (exhausted) {
    return { label: "All practice sessions used", expired: false, exhausted: true };
  }
  return {
    label: `${remaining} of ${app.practice_session_limit} practice sessions remaining`,
    sublabel: app.practice_expires_at ? `Access ends ${formatDate(app.practice_expires_at)}` : undefined,
    expired: false,
    exhausted: false,
  };
}

function extractVisaCategory(profile: string | undefined): string {
  if (!profile) return "DS-160 Application";
  const match = profile.match(/\b(B-?[12]\/B-?[12]|B-?1|B-?2|F-?1|J-?1|H-?1B?|L-?1|O-?1|P-?[0-9]|K-?[0-9]|crew|transit|diplomatic|media)\b/i);
  return match ? match[0].toUpperCase() : "DS-160 Application";
}

export default async function MyPreparationsPage() {
  const session = await getSession();

  if (!session?.email) {
    redirect("/?signin=1");
  }

  const email = normalizeEmail(session.email);

  const applications = await query<ApplicationRow>(
    `SELECT analysis_id, applicant_first_name, free_report, payment_status, premium_unlocked,
            practice_session_limit, practice_sessions_used, practice_expires_at,
            practice_access_started_at, created_at
     FROM applications
     WHERE email = $1
     ORDER BY created_at DESC`,
    [email]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between h-16 sm:h-[68px] px-5 sm:px-10">
          <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight select-none">
            VisaPrep
          </Link>
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </header>

      <main className="pt-16 sm:pt-[68px] px-4 sm:px-8 max-w-2xl mx-auto pb-16">
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Preparations</h1>
          <p className="text-sm text-gray-500">
            All applications linked to {email}
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              No applications found for this email address.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Upload a DS-160
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const profile = app.free_report?.applicationProfile ?? "";
              const visaCategory = extractVisaCategory(profile);
              const ps = practiceStatus(app);
              const isPaid = app.premium_unlocked;

              return (
                <div
                  key={app.analysis_id}
                  className="border border-gray-200 rounded-2xl p-6 bg-white"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-semibold text-gray-900">{visaCategory}</span>
                        {isPaid ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Premium Unlocked
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Free Insights
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">{app.analysis_id}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatDate(app.created_at)}
                    </p>
                  </div>

                  {/* Application profile snippet */}
                  {profile && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">
                      {profile}
                    </p>
                  )}

                  {/* Practice status */}
                  {isPaid && ps.label && (
                    <div className={`rounded-xl px-4 py-3 mb-4 ${ps.expired || ps.exhausted ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-100"}`}>
                      <p className={`text-sm font-medium ${ps.expired || ps.exhausted ? "text-amber-800" : "text-gray-700"}`}>
                        {ps.label}
                      </p>
                      {ps.sublabel && (
                        <p className="text-xs text-gray-500 mt-0.5">{ps.sublabel}</p>
                      )}
                      {(ps.expired || ps.exhausted) && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          You can still review your saved assessment, preparation roadmap, questions, and previous feedback at any time.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    {isPaid ? (
                      <>
                        <Link
                          href={`/?analysisId=${app.analysis_id}`}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Continue Preparation
                        </Link>
                        {(ps.expired || ps.exhausted) && (
                          <Link
                            href={`/?extend=${app.analysis_id}`}
                            className="px-5 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            30-day Practice Extension — ₦5,000
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/?analysisId=${app.analysis_id}`}
                          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                        >
                          View Insights
                        </Link>
                        <Link
                          href={`/?analysisId=${app.analysis_id}&pay=1`}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Unlock Full Preparation
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors">
            Upload a new DS-160
          </Link>
        </div>
      </main>
    </div>
  );
}
