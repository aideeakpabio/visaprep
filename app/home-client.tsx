"use client";

import { useState, useEffect } from "react";

// ── Analyzing state ──────────────────────────────────────────────────────────

// Stage 1 — generic, shown while the document is being checked (~7s)
const STAGE_1_MESSAGES = [
  "Uploading your document...",
  "Checking the file...",
  "Reading the document...",
  "Preparing your file for analysis...",
];

// Stage 2 — DS-160-specific, shown once the document is confirmed usable
const STAGE_2_MESSAGES = [
  "Reviewing your application details...",
  "Understanding your travel plans...",
  "Examining your application sections...",
  "Identifying your application strengths...",
  "Preparing your Application Insights...",
];

const STAGE_1_DURATION_MS = 7000;
const MESSAGE_INTERVAL_MS = 2200;

function AnalyzingState() {
  const [stage, setStage] = useState<1 | 2>(1);
  const [msgIndex, setMsgIndex] = useState(0);

  // Transition from stage 1 → stage 2 after a fixed delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(2);
      setMsgIndex(0);
    }, STAGE_1_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Advance message within the current stage
  useEffect(() => {
    const messages = stage === 1 ? STAGE_1_MESSAGES : STAGE_2_MESSAGES;
    const id = setInterval(() => {
      setMsgIndex((i) => {
        if (i >= messages.length - 1) { clearInterval(id); return i; }
        return i + 1;
      });
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [stage]);

  const messages = stage === 1 ? STAGE_1_MESSAGES : STAGE_2_MESSAGES;
  const heading = stage === 1 ? "Checking your document" : "Going through your application";

  return (
    <div className="border border-gray-100 rounded-2xl p-8 text-center bg-white shadow-sm">
      <p className="text-sm text-gray-700 font-medium mb-3 flex items-center justify-center gap-1">
        {heading}
        <span className="inline-flex gap-[3px] ml-1 translate-y-px">
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
        </span>
      </p>
      <p key={`${stage}-${msgIndex}`} className="status-message text-xs text-gray-400">
        {messages[msgIndex]}
      </p>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface DocumentAssessment {
  isLikelyDS160: boolean;
  message: string | null;
}

interface TopPreparationArea {
  title: string;
  observation: string;
  whyItMayComeUp: string;
  whatToBeReadyToExplain: string;
}

interface SectionInsight {
  observation: string;
  whyItMatters: string;
  preparationGuidance: string;
}

interface Section {
  lesson: string;
  interviewWeight: string;
  memoryRisk: string;
  keySignals: string[];
  insights: SectionInsight[];
}

interface CrossSectionObservation {
  title: string;
  connection: string;
  whyItMatters: string;
  whatToReview: string;
}

interface ReadyToExplainItem {
  topic: string;
  whyItMayComeUp: string;
  whatToBeReadyToExplain: string;
  possibleQuestions: string[];
}

interface ApplicationStrength {
  label: string;
  detail: string;
}

interface Analysis {
  documentAssessment: DocumentAssessment;
  applicationProfile: string;
  submissionDate: string | null;
  firstName: string | null;
  encouragement: string | null;
  strengths: ApplicationStrength[];
  topPreparationAreas: TopPreparationArea[];
  sections: Section[];
  crossSectionObservations: CrossSectionObservation[];
  readyToExplain: ReadyToExplainItem[];
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border rounded-xl p-6 ${className}`}>{children}</div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-base mb-3 text-gray-900">{children}</h3>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
      {children}
    </p>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

// v4 key — bumped when encouragement field was added to the schema
const SESSION_KEY = "visaprep_analysis_v4";

function readSaved(): { analysis: Analysis | null; fileName: string } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.analysis?.documentAssessment !== undefined) {
        return { analysis: parsed.analysis, fileName: parsed.fileName ?? "" };
      }
    }
  } catch { /* ignore */ }
  return { analysis: null, fileName: "" };
}

export default function HomeClient({ testMode = false }: { testMode?: boolean }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [payEmail, setPayEmail] = useState("");
  const [payError, setPayError] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Restore from sessionStorage after mount. Initial state is null so SSR and
  // the first client render both show the upload page — no hydration mismatch.
  useEffect(() => {
    const saved = readSaved();
    if (saved.analysis) {
      setAnalysis(saved.analysis);
      setFileName(saved.fileName);
    }
  }, []);

  async function handleUpload(file: File) {
    setFileName(file.name);
    setPendingFile(null);
    setAnalyzing(true);
    setAnalysis(null);
    setError("");
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAnalysis(data.analysis);
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ analysis: data.analysis, fileName: file.name })
        );
      } catch { /* ignore storage errors */ }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing your document.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setFileName(f.name);
    setError("");
  }

  const isInvalidDoc =
    analysis !== null && analysis.documentAssessment?.isLikelyDS160 === false;

  return (
    <main className="min-h-screen flex flex-col items-center bg-white">

      {/* ── Hero — upload / analyzing ────────────────────────────────────── */}
      {!analysis && (
        <div className="relative overflow-hidden w-full flex flex-col items-center min-h-screen">

          {/* Hero content */}
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center pt-12 sm:pt-14 pb-10 px-5 sm:px-8">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">VisaPrep</h1>

            <p className="text-lg sm:text-xl font-medium text-gray-800 mb-1 leading-tight sm:leading-snug">
              Your interview starts with your application.
            </p>
            <p className="text-base sm:text-lg italic text-gray-400 mb-5">
              So do we.
            </p>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed mb-5">
              VisaPrep helps you understand what your application communicates and prepares you to explain it with clarity and confidence during your interview.
            </p>
            <div className="flex flex-col items-center gap-1.5">
              {["Understand your application.", "Prepare with clarity.", "Interview with confidence."].map((phrase) => (
                <p key={phrase} className="text-sm font-medium text-green-600 tracking-wide">
                  {phrase}
                </p>
              ))}
            </div>
          </div>

          {/* Upload widget */}
          <div className="relative z-10 w-full max-w-md px-4 sm:px-8 pb-16">
            {!analyzing && (
              <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 text-center bg-white shadow-sm">
                {/* Line 1: label text OR checkmark + filename — same height in both states */}
                <div className="mb-5 flex items-center justify-center min-h-[20px]">
                  {!pendingFile ? (
                    <p className="text-sm text-gray-500 leading-relaxed">Upload your DS-160 to begin</p>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer group">
                      <span className="text-green-500 shrink-0">✓</span>
                      <span className="font-medium text-gray-800 truncate max-w-[220px] sm:max-w-xs">{pendingFile.name}</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">(change)</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                  )}
                </div>

                {/* Line 2: action button — same size in both states */}
                {!pendingFile ? (
                  <label className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                    </svg>
                    Select DS-160 PDF
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <button
                    onClick={() => handleUpload(pendingFile)}
                    className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    Analyze My DS-160
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 opacity-90"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {analyzing && <AnalyzingState />}

            <p className="mt-3 text-xs text-gray-400 text-center">
              🔒 Your document is analyzed securely.
            </p>

            {error && (
              <div className="mt-4 border border-red-200 rounded-xl p-5 w-full bg-red-50">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {analysis && (
        <div className="w-full max-w-2xl mt-8 space-y-5 px-4 sm:px-8 pb-8">

          {/* ── 1: File Analyzed ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-green-500 shrink-0 text-base">✓</span>
              <p className="text-sm text-gray-600 truncate">
                <span className="font-medium text-gray-800 truncate">{fileName}</span>
                <span className="text-gray-400"> — analyzed successfully</span>
              </p>
            </div>
            <label className="text-sm text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors whitespace-nowrap shrink-0">
              Try another file
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
                    handleUpload(f);
                  }
                }}
              />
            </label>
          </div>

          {/* ── Invalid document ──────────────────────────────────────────── */}
          {isInvalidDoc && (
            <Card className="border-amber-200 bg-amber-50">
              <SectionHeading>We Need Your DS-160</SectionHeading>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {analysis.documentAssessment.message}
              </p>
              <label className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                Upload another document
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
                      handleUpload(f);
                    }
                  }}
                />
              </label>
            </Card>
          )}

          {/* ── Valid DS-160 results ──────────────────────────────────────── */}
          {!isInvalidDoc && (
            <>
              {/* 2 — Applicant Snapshot */}
              <Card>
                <SectionHeading>Applicant Snapshot</SectionHeading>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.applicationProfile}
                </p>
                {analysis.submissionDate && (
                  <p className="mt-3 text-xs text-gray-400">
                    Submission date: {analysis.submissionDate}
                  </p>
                )}
              </Card>

              {/* 3 — Personalized opening encouragement */}
              <p className="text-sm text-gray-600 leading-relaxed px-1">
                {analysis.encouragement
                  ?? (analysis.firstName
                    ? `${analysis.firstName}, you're off to a good start. Understanding what your application communicates is the first step towards preparing to explain it clearly and confidently.`
                    : "You're off to a good start. Understanding what your application communicates is the first step towards preparing to explain it clearly and confidently.")}
              </p>

              {/* 4 — Strengths in Your Application */}
              {analysis.strengths?.length > 0 && (
                <Card>
                  <SectionHeading>Strengths in Your Application</SectionHeading>
                  <ul className="space-y-3 mb-4">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.label}</p>
                          {s.detail && (
                            <p className="text-sm text-gray-600 mt-0.5">{s.detail}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                    These strengths do not guarantee a visa decision, but they reflect well-supported details in your application.
                  </p>
                </Card>
              )}

              {/* 5 — Application Highlights */}
              {analysis.topPreparationAreas.length > 0 && (
                <Card>
                  <SectionHeading>Application Highlights</SectionHeading>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                    These are important details in your application that are worth understanding clearly before your interview.
                  </p>
                  <div className="space-y-6">
                    {analysis.topPreparationAreas.map((area, i) => (
                      <div key={i} className="space-y-2">
                        {i > 0 && <div className="border-t border-gray-100 mt-4" />}
                        <p className="font-semibold text-sm text-gray-900">{area.title}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{area.observation}</p>
                        <div className="mt-1">
                          <FieldLabel>Why this may come up</FieldLabel>
                          <p className="text-sm text-gray-700 leading-relaxed">{area.whyItMayComeUp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 6 — Premium Preparation CTA */}
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex flex-col items-center text-center gap-4">
                <p className="text-sm text-gray-700 leading-relaxed max-w-md">
                  Your free Application Insights are a good start, but they cover only a part of your application. Continue with your full VisaPrep Assessment to understand your application more deeply and prepare to explain it clearly and confidently during your interview.
                </p>
                <button
                  onClick={() => { setShowPayment(true); setPayError(""); setPayEmail(""); }}
                  className="w-full sm:w-auto px-8 py-3 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 shadow-sm"
                >
                  Start My Personalized Interview Preparation
                </button>
                <p className="text-xs text-gray-400 italic">
                  Your interview starts with your application. So do we.
                </p>
              </div>
            </>
          )}

          {/* Payment offer modal */}
          {showPayment && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => { if (!paySubmitting) setShowPayment(false); }}
            >
              <div
                className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-0 sm:mx-4 max-w-sm w-full flex flex-col max-h-[92vh] sm:max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Sticky top bar — always visible */}
                <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0">
                  <div className="flex flex-col gap-1">
                    {testMode && (
                      <span className="self-start inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 mb-1">
                        Test Mode
                      </span>
                    )}
                    <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">
                      Continue with Your Full VisaPrep Assessment
                    </h2>
                  </div>
                  {!paySubmitting && (
                    <button
                      onClick={() => setShowPayment(false)}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none mt-0.5"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 pb-6 flex flex-col gap-5">

                  {/* Supporting copy */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your free Application Insights are a great start.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your Full VisaPrep Assessment helps you understand your application more deeply and prepares you to explain it with clarity and confidence during your interview.
                    </p>
                  </div>

                  {/* Philosophy bridge */}
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    Your interview will be based on your application. Here&rsquo;s what we&rsquo;ll help you prepare for next:
                  </p>

                  {/* Benefits list */}
                  <ul className="flex flex-col gap-3">
                    {[
                      { label: "Comprehensive Application Assessment", detail: "Understand the strengths, connections, and interview implications across your full application." },
                      { label: "Personalized Interview Preparation", detail: "Know exactly which parts of your application deserve the most attention before your interview." },
                      { label: "Areas You Should Be Ready to Explain", detail: "Understand what a consular officer may naturally want to explore further in your application." },
                      { label: "Personalized Interview Questions", detail: "Questions generated specifically from your own DS-160 — not a generic question bank." },
                      { label: "Personalized Preparation Roadmap", detail: "A clear plan showing what to review and understand before your interview." },
                      { label: "AI Interview Practice", detail: "Practice realistic visa interview conversations based on your own application and receive personalized feedback after every session.", soon: true },
                    ].map(({ label, detail, soon }) => (
                      <li key={label} className="flex gap-3 items-start">
                        <span className="mt-0.5 text-green-500 shrink-0 text-sm">✓</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 leading-snug">
                            {label}{soon && <span className="ml-2 text-xs font-normal text-gray-400">(Coming Soon)</span>}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">₦20,000</p>
                    <p className="text-sm text-gray-400">one-time</p>
                  </div>

                  {/* Email field */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pay-email" className="text-xs font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="pay-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={payEmail}
                      onChange={(e) => { setPayEmail(e.target.value); setPayError(""); }}
                      disabled={paySubmitting}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                    />
                    {payError && (
                      <p className="text-xs text-red-600">{payError}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    disabled={paySubmitting}
                    onClick={async () => {
                      const trimmed = payEmail.trim();
                      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                        setPayError("Please enter a valid email address.");
                        return;
                      }
                      setPayError("");
                      setPaySubmitting(true);
                      try {
                        const res = await fetch("/api/payment/initialize", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: trimmed }),
                        });
                        const data = await res.json();
                        if (!res.ok || data.error) {
                          setPayError(data.error ?? "Could not start payment. Please try again.");
                          setPaySubmitting(false);
                          return;
                        }
                        // Redirect to Paystack hosted checkout
                        window.location.href = data.authorization_url;
                      } catch {
                        setPayError("Network error. Please check your connection and try again.");
                        setPaySubmitting(false);
                      }
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paySubmitting ? "Redirecting to payment…" : "Continue to Payment"}
                  </button>

                  {/* Security note */}
                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    Payment is processed securely by Paystack. VisaPrep does not store your card details.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center pb-8">
            VisaPrep is a preparation tool. It does not provide legal advice,
            predict visa outcomes, or guarantee any result.
          </p>
        </div>
      )}
    </main>
  );
}
