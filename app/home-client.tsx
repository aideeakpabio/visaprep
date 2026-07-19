"use client";

import { useState, useEffect } from "react";

// ── Analyzing state ──────────────────────────────────────────────────────────

const STATUS_MESSAGES = [
  "Reading your DS-160",
  "Looking at your application details",
  "Connecting your answers across sections",
  "Finding areas to help you prepare",
  "Getting your Application Insights ready",
];

function AnalyzingState() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((i) => {
        if (i >= STATUS_MESSAGES.length - 1) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border border-gray-100 rounded-2xl p-8 text-center bg-white shadow-sm">
      <p className="text-sm text-gray-700 font-medium mb-3 flex items-center justify-center gap-1">
        Going through your application
        <span className="inline-flex gap-[3px] ml-1 translate-y-px">
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
          <span className="analyzing-dot w-[3px] h-[3px] rounded-full bg-gray-500 inline-block" />
        </span>
      </p>
      <p key={statusIndex} className="status-message text-xs text-gray-400">
        {STATUS_MESSAGES[statusIndex]}
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
  strengths: ApplicationStrength[];
  topPreparationAreas: TopPreparationArea[];
  sections: Section[];
  crossSectionObservations: CrossSectionObservation[];
  readyToExplain: ReadyToExplainItem[];
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WeightBadge({ label }: { label: string }) {
  const high = label.toLowerCase().includes("high");
  const low = label.toLowerCase().endsWith("low");
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
        high
          ? "border-gray-800 text-gray-800"
          : low
          ? "border-gray-300 text-gray-400"
          : "border-gray-500 text-gray-500"
      }`}
    >
      {label}
    </span>
  );
}

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

function LessonCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const missing =
    section.insights.length === 1 &&
    section.insights[0].observation.startsWith("Not enough information");

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium text-sm text-gray-900">
            {section.lesson}
          </span>
          <WeightBadge label={`Interview Weight: ${section.interviewWeight}`} />
          {missing && (
            <span className="text-xs text-gray-400 italic">
              Insufficient data
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm ml-4 shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-4 space-y-4 bg-white">
          {section.keySignals.length > 0 && (
            <div>
              <FieldLabel>What your application shows</FieldLabel>
              <ul className="space-y-1">
                {section.keySignals.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="shrink-0 text-gray-300">—</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missing ? (
            <p className="text-sm text-gray-500 italic">
              {section.insights[0].observation}
            </p>
          ) : (
            <div className="space-y-5">
              {section.insights.map((insight, i) => (
                <div key={i} className="space-y-3">
                  {i > 0 && <div className="border-t border-gray-100" />}
                  <div>
                    <FieldLabel>What we noticed</FieldLabel>
                    <p className="text-sm text-gray-700">{insight.observation}</p>
                  </div>
                  {insight.whyItMatters ? (
                    <div>
                      <FieldLabel>Why this may matter</FieldLabel>
                      <p className="text-sm text-gray-700">{insight.whyItMatters}</p>
                    </div>
                  ) : null}
                  {insight.preparationGuidance ? (
                    <div>
                      <FieldLabel>What to prepare</FieldLabel>
                      <p className="text-sm text-gray-700">{insight.preparationGuidance}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

// v2 key — old schema results are automatically ignored rather than crashing
const SESSION_KEY = "visaprep_analysis_v2";

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
  const [showFull, setShowFull] = useState(false);
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
    setShowFull(false);
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
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center pt-14 pb-10 px-8">
            <h1 className="text-5xl font-bold mb-6 tracking-tight">VisaPrep</h1>

            <p className="text-xl font-medium text-gray-800 mb-1 leading-snug">
              Your interview starts with your application.
            </p>
            <p className="text-lg italic text-gray-400 mb-5">
              So do we.
            </p>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
              Upload your completed DS-160 and get your Application Insights
              in minutes.
            </p>
          </div>

          {/* Upload widget */}
          <div className="relative z-10 w-full max-w-md px-8 pb-16">
            {!analyzing && (
              <div className="border border-gray-200 rounded-2xl p-8 text-center bg-white shadow-sm">
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  Upload your completed DS-160 PDF
                </p>

                {!pendingFile ? (
                  /* Step 1: select file */
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
                  /* Step 2: file chosen — confirm and analyze */
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="font-medium truncate max-w-xs">{pendingFile.name}</span>
                    </p>
                    <button
                      onClick={() => handleUpload(pendingFile)}
                      className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      Analyze My Application
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 opacity-70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <label className="text-xs text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors">
                      Choose a different file
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
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
        <div className="w-full max-w-2xl mt-8 space-y-5 px-8 pb-8">

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Analyzed:{" "}
              <span className="font-medium text-gray-700">{fileName}</span>
            </p>
            <label className="text-sm text-gray-500 underline cursor-pointer hover:text-gray-700">
              Upload another
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
              {/* 1 — Applicant Snapshot */}
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

              {/* 1b — Encouragement */}
              <p className="text-sm text-gray-600 leading-relaxed px-1">
                You're off to a good start. Your application already tells your story, and understanding it is the first step toward a confident interview. As you go through these insights, we'll help you understand the areas that may come up and how to prepare for them.
              </p>

              {/* 2 — Strengths in Your Application */}
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
                    These strengths do not guarantee a visa decision, but they provide a solid foundation for your interview preparation.
                  </p>
                </Card>
              )}

              {/* 3 — Top Preparation Areas */}
              {analysis.topPreparationAreas.length > 0 && (
                <Card>
                  <SectionHeading>Top Preparation Areas</SectionHeading>
                  <div className="space-y-6">
                    {analysis.topPreparationAreas.map((area, i) => (
                      <div key={i} className="space-y-3">
                        {i > 0 && <div className="border-t border-gray-100" />}
                        <p className="font-medium text-sm text-gray-900">
                          {i + 1}. {area.title}
                        </p>
                        <p className="text-sm text-gray-700">{area.observation}</p>
                        <div>
                          <FieldLabel>Why this may come up</FieldLabel>
                          <p className="text-sm text-gray-700">{area.whyItMayComeUp}</p>
                        </div>
                        <div>
                          <FieldLabel>What you should be ready to explain</FieldLabel>
                          <p className="text-sm text-gray-700">{area.whatToBeReadyToExplain}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 3 — What You Should Be Ready to Explain */}
              {analysis.readyToExplain.length > 0 && (
                <Card>
                  <SectionHeading>What You Should Be Ready to Explain</SectionHeading>
                  <p className="text-xs text-gray-400 mb-4">
                    These topics come from your application and may naturally come up during your interview.
                  </p>
                  <div className="space-y-6">
                    {analysis.readyToExplain.map((item, i) => (
                      <div key={i} className="space-y-3">
                        {i > 0 && <div className="border-t border-gray-100" />}
                        <p className="font-medium text-sm text-gray-900">{item.topic}</p>
                        <div>
                          <FieldLabel>Why this may come up</FieldLabel>
                          <p className="text-sm text-gray-700">{item.whyItMayComeUp}</p>
                        </div>
                        <div>
                          <FieldLabel>What you should be ready to explain</FieldLabel>
                          <p className="text-sm text-gray-700">{item.whatToBeReadyToExplain}</p>
                        </div>
                        {item.possibleQuestions.length > 0 && (
                          <div>
                            <FieldLabel>Questions you may hear</FieldLabel>
                            <ul className="space-y-1 mt-1">
                              {item.possibleQuestions.map((q, j) => (
                                <li key={j} className="flex gap-2 text-sm text-gray-600">
                                  <span className="shrink-0 text-gray-300">—</span>
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 4 — View Full Analysis (collapsible) */}
              <div className="border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowFull((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900">
                    View Full Analysis
                  </span>
                  <span className="text-gray-400 text-sm">
                    {showFull ? "▲ Hide" : "▼ Show all sections"}
                  </span>
                </button>

                {showFull && (
                  <div className="border-t px-4 py-4 space-y-3 bg-gray-50">
                    {analysis.crossSectionObservations.length > 0 && (
                      <div className="border rounded-xl bg-white p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          How Your Answers Connect
                        </p>
                        {analysis.crossSectionObservations.map((obs, i) => (
                          <div key={i} className="space-y-2">
                            {i > 0 && <div className="border-t border-gray-100" />}
                            <p className="font-medium text-sm text-gray-900">{obs.title}</p>
                            <p className="text-sm text-gray-700">{obs.connection}</p>
                            {obs.whyItMatters ? (
                              <div>
                                <FieldLabel>Why this matters</FieldLabel>
                                <p className="text-sm text-gray-700">{obs.whyItMatters}</p>
                              </div>
                            ) : null}
                            {obs.whatToReview ? (
                              <div>
                                <FieldLabel>What to review</FieldLabel>
                                <p className="text-sm text-gray-700">{obs.whatToReview}</p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                    {analysis.sections.map((section, i) => (
                      <LessonCard key={i} section={section} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* CTA */}
          {!isInvalidDoc && analysis && (
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex flex-col items-center text-center gap-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Go beyond your free Application Insights with a comprehensive assessment that identifies additional strengths, highlights potential concerns, and helps you explain your application with clarity and confidence during your visa interview.
              </p>
              <button
                onClick={() => { setShowPayment(true); setPayError(""); setPayEmail(""); }}
                className="w-full sm:w-auto px-8 py-3 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 shadow-sm"
              >
                Unlock a deeper understanding of your application
              </button>
              <p className="text-xs text-gray-400 italic">
                Your interview starts with your application. So do we.
              </p>
            </div>
          )}

          {/* Payment offer modal */}
          {showPayment && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => { if (!paySubmitting) setShowPayment(false); }}
            >
              <div
                className="bg-white rounded-2xl shadow-xl p-8 mx-4 max-w-sm w-full flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex flex-col gap-1">
                  {testMode && (
                    <span className="self-start inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 mb-1">
                      Test Mode
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">VisaPrep Full Assessment</h2>
                  <p className="text-2xl font-bold text-gray-900">₦20,000</p>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  A deeper, personalized preparation based on your actual application — covering more areas, more connections between your answers, and more of what you need to be ready to explain.
                </p>

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
                  className="w-full py-3 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paySubmitting ? "Redirecting to payment…" : "Continue to Secure Payment"}
                </button>

                {/* Cancel */}
                {!paySubmitting && (
                  <button
                    onClick={() => setShowPayment(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                  >
                    Cancel
                  </button>
                )}

                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Payment is processed securely by Paystack. VisaPrep does not store your card details.
                </p>
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
