"use client";

import { useState, useEffect } from "react";

// ── Analyzing state ──────────────────────────────────────────────────────────

const STAGE_1_MESSAGES = [
  "Uploading your document...",
  "Checking the file...",
  "Reading the document...",
  "Preparing your file for analysis...",
];

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(2);
      setMsgIndex(0);
    }, STAGE_1_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

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
  whatThisCommunicates: string;
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

interface PremiumReport {
  sections?: Section[];
  crossSectionObservations?: CrossSectionObservation[];
  readyToExplain?: ReadyToExplainItem[];
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

const SESSION_KEY = "visaprep_analysis_v5";

function readSaved(): { analysis: Analysis | null; fileName: string; analysisId: string | null } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.analysis?.documentAssessment !== undefined) {
        return {
          analysis: parsed.analysis,
          fileName: parsed.fileName ?? "",
          analysisId: parsed.analysisId ?? null,
        };
      }
    }
  } catch { /* ignore */ }
  return { analysis: null, fileName: "", analysisId: null };
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

  // ── New: application-linked access state ──────────────────────────────────
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [premiumReport, setPremiumReport] = useState<PremiumReport | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // ── New: Access My Preparation modal state ────────────────────────────────
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessStep, setAccessStep] = useState<"email" | "code">("email");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessOtp, setAccessOtp] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  // ── Practice extension payment state ─────────────────────────────────────
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionAnalysisId, setExtensionAnalysisId] = useState<string | null>(null);
  const [extEmail, setExtEmail] = useState("");
  const [extError, setExtError] = useState("");
  const [extSubmitting, setExtSubmitting] = useState(false);

  // ── Restore session + saved analysis on mount ─────────────────────────────
  useEffect(() => {
    // Restore sessionStorage
    const saved = readSaved();
    if (saved.analysis) {
      setAnalysis(saved.analysis);
      setFileName(saved.fileName);
      setAnalysisId(saved.analysisId);
    }

    // Check for active session — also used to pre-fill extension modal
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.email) {
          setSessionEmail(data.email);
          setExtEmail(data.email); // pre-fill extension modal with verified email
        }
        // Open extension modal only after session check completes
        // (extId is set earlier; modal opens here so sessionEmail is available)
        const extParam = new URLSearchParams(window.location.search).get("extend");
        if (extParam) {
          setShowExtensionModal(true);
        }
      })
      .catch(() => {
        // Even on failure, open extension modal if param present
        const extParam = new URLSearchParams(window.location.search).get("extend");
        if (extParam) {
          setShowExtensionModal(true);
        }
      });

    // Handle URL params
    const params = new URLSearchParams(window.location.search);
    const urlAnalysisId = params.get("analysisId");
    const shouldPay = params.get("pay") === "1";
    const shouldSignIn = params.get("signin") === "1";

    if (shouldSignIn) {
      setShowAccessModal(true);
    }

    // Extension purchase flow: ?extend=VP-XXX (from my-preparations "30-day Extension" link)
    // Only opens after session check completes — sessionEmail is populated in the
    // same useEffect, so we defer modal open to after the session fetch below.
    const extId = params.get("extend");
    if (extId) {
      setExtensionAnalysisId(extId);
    }

    // Load analysis by URL param (e.g. returning from my-preparations)
    if (urlAnalysisId && urlAnalysisId !== saved.analysisId) {
      fetch(`/api/analysis/${urlAnalysisId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.freeReport) {
            setAnalysis(data.freeReport as Analysis);
            setAnalysisId(urlAnalysisId);
            setFileName(`Application ${urlAnalysisId}`);
            if (shouldPay) setShowPayment(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  // ── Auto-fetch premium when analysisId + session are known ────────────────
  useEffect(() => {
    if (!analysisId || !sessionEmail) return;
    let cancelled = false;
    setPremiumLoading(true);
    fetch(`/api/analysis/${analysisId}/premium`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.premiumReport) {
          setPremiumReport(data.premiumReport as PremiumReport);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPremiumLoading(false);
      });
    return () => { cancelled = true; };
  }, [analysisId, sessionEmail]);

  async function handleUpload(file: File) {
    setFileName(file.name);
    setPendingFile(null);
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisId(null);
    setPremiumReport(null);
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

      const newAnalysisId: string | null = data.analysisId ?? null;
      setAnalysis(data.analysis);
      setAnalysisId(newAnalysisId);

      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            analysis: data.analysis,
            fileName: file.name,
            analysisId: newAnalysisId,
          })
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

  // ── Access My Preparation modal handlers ──────────────────────────────────
  async function handleRequestCode() {
    const trimmed = accessEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAccessError("Please enter a valid email address.");
      return;
    }
    setAccessError("");
    setAccessSubmitting(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAccessError(data.error ?? "Could not send the sign-in code. Please try again.");
      } else {
        setAccessStep("code");
      }
    } catch {
      setAccessError("Network error. Please check your connection and try again.");
    } finally {
      setAccessSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!/^\d{6}$/.test(accessOtp.trim())) {
      setAccessError("Enter your 6-digit sign-in code.");
      return;
    }
    setAccessError("");
    setAccessSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accessEmail.trim(), code: accessOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAccessError(data.error ?? "Verification failed. Please try again.");
      } else {
        window.location.href = "/my-preparations";
      }
    } catch {
      setAccessError("Network error. Please check your connection and try again.");
    } finally {
      setAccessSubmitting(false);
    }
  }

  async function handleExtensionPayment() {
    if (!extensionAnalysisId) {
      setExtError("Application not found. Please return to My Preparations.");
      return;
    }
    if (!sessionEmail) {
      setExtError("You must be signed in to purchase an extension. Please use 'Access My Preparation' to sign in first.");
      return;
    }
    setExtError("");
    setExtSubmitting(true);
    try {
      // The extension API requires a verified session and ignores body email entirely.
      // Identity is derived exclusively from the server-side session cookie.
      const res = await fetch("/api/payment/extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: extensionAnalysisId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setExtError(data.error ?? "Could not start payment. Please try again.");
        setExtSubmitting(false);
        return;
      }
      window.location.href = data.authorization_url;
    } catch {
      setExtError("Network error. Please check your connection and try again.");
      setExtSubmitting(false);
    }
  }

  return (
    <>
      {/* ── Fixed navigation bar ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between h-16 sm:h-[68px] px-5 sm:px-10">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight select-none"
          >
            VisaPrep
          </a>
          <button
            onClick={() => {
              setShowAccessModal(true);
              setAccessStep("email");
              setAccessError("");
              setAccessEmail("");
              setAccessOtp("");
            }}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Access My Preparation
          </button>
        </div>
      </header>

      <main className="min-h-screen flex flex-col items-center bg-white pt-16 sm:pt-[68px]">

      {/* ── Hero — upload / analyzing ────────────────────────────────────── */}
      {!analysis && (
        <div className="w-full flex flex-col items-center sm:min-h-[calc(100vh-68px)]">

          {/* Hero content */}
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center pt-10 sm:pt-14 pb-5 px-5 sm:px-10">
            <h1
              style={{ fontSize: "clamp(2.25rem, 5vw, 4.5rem)", lineHeight: "1.06" }}
              className="font-bold text-gray-900 mb-6 tracking-tight max-w-2xl"
            >
              Your interview starts with your application.
              <span className="block text-gray-400 mt-2">So do we.</span>
            </h1>
            <p className="text-gray-500 text-base sm:text-lg max-w-[720px] leading-relaxed mb-5">
              VisaPrep helps you fully understand what your application communicates and prepares you to be able to explain it with clarity and confidence during your interview.
            </p>
            <p className="text-sm sm:text-base font-medium text-green-600 tracking-wide text-center">
              <span className="block sm:inline whitespace-nowrap">Understand your application</span>
              <span className="hidden sm:inline mx-2">·</span>
              <span className="block sm:inline whitespace-nowrap">Prepare with clarity</span>
              <span className="hidden sm:inline mx-2">·</span>
              <span className="block sm:inline whitespace-nowrap">Interview with confidence</span>
            </p>
          </div>

          {/* Upload widget */}
          <div className="relative z-10 w-full max-w-[620px] px-4 sm:px-6 pb-10 mt-7">
            {!analyzing && (
              <div className="border border-gray-200 rounded-3xl p-8 sm:p-10 text-center bg-white shadow-sm">
                {!pendingFile ? (
                  <>
                    <p className="text-base font-semibold text-gray-900 mb-1.5">Upload your completed DS-160 (PDF only)</p>
                    <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                      Receive your personalized Application Insights in minutes.
                    </p>
                    <label className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-8 py-3.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                      </svg>
                      Select DS-160 PDF
                      <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="mb-5 flex items-center justify-center">
                      <label className="inline-flex items-center gap-2 text-sm cursor-pointer group">
                        <span className="text-green-500 shrink-0">✓</span>
                        <span className="font-medium text-gray-800 truncate max-w-[220px] sm:max-w-xs">{pendingFile.name}</span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">(change)</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                    <button
                      onClick={() => handleUpload(pendingFile)}
                      className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-8 py-3.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                      Analyze My DS-160
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </>
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

          {/* Application ID badge */}
          {analysisId && (
            <p className="text-xs text-gray-400 font-mono">
              Application ID: {analysisId}
            </p>
          )}

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
                  ? (analysis.firstName
                    ? `${analysis.firstName}, ${analysis.encouragement.charAt(0).toLowerCase()}${analysis.encouragement.slice(1)}`
                    : analysis.encouragement)
                  : (analysis.firstName
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
              {analysis.topPreparationAreas?.length > 0 && (
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
                        {area.whatThisCommunicates && (
                          <div className="mt-1">
                            <FieldLabel>What this communicates</FieldLabel>
                            <p className="text-sm text-gray-700 leading-relaxed">{area.whatThisCommunicates}</p>
                          </div>
                        )}
                        <div className="mt-1">
                          <FieldLabel>Why this may come up</FieldLabel>
                          <p className="text-sm text-gray-700 leading-relaxed">{area.whyItMayComeUp}</p>
                        </div>
                        <div className="mt-1">
                          <FieldLabel>What to be ready to explain</FieldLabel>
                          <p className="text-sm text-gray-700 leading-relaxed">{area.whatToBeReadyToExplain}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── Premium content (unlocked after payment) ─────────────── */}
              {premiumLoading && (
                <div className="border border-gray-100 rounded-xl p-6 text-center">
                  <p className="text-sm text-gray-400">Loading your full assessment…</p>
                </div>
              )}

              {premiumReport && !premiumLoading && (
                <>
                  {/* Full Sections */}
                  {premiumReport.sections && premiumReport.sections.length > 0 && (
                    <Card>
                      <SectionHeading>Full Application Assessment</SectionHeading>
                      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                        A section-by-section review of your DS-160 application.
                      </p>
                      <div className="space-y-8">
                        {premiumReport.sections.map((section, i) => (
                          <div key={i}>
                            {i > 0 && <div className="border-t border-gray-100 mb-6" />}
                            <div className="flex items-center gap-3 mb-3">
                              <p className="font-semibold text-sm text-gray-900">{section.lesson}</p>
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                {section.interviewWeight} Weight
                              </span>
                            </div>
                            {section.keySignals?.length > 0 && (
                              <div className="mb-3">
                                <FieldLabel>Key signals</FieldLabel>
                                <ul className="space-y-1">
                                  {section.keySignals.map((sig, j) => (
                                    <li key={j} className="text-xs text-gray-600 flex gap-2">
                                      <span className="text-gray-300 shrink-0">—</span>
                                      {sig}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {section.insights?.length > 0 && (
                              <div className="space-y-4">
                                {section.insights.map((insight, j) => (
                                  <div key={j} className="space-y-2">
                                    {j > 0 && <div className="border-t border-gray-50 mt-3" />}
                                    <p className="text-sm text-gray-700 leading-relaxed">{insight.observation}</p>
                                    {insight.whyItMatters && (
                                      <div>
                                        <FieldLabel>Why it matters</FieldLabel>
                                        <p className="text-sm text-gray-700 leading-relaxed">{insight.whyItMatters}</p>
                                      </div>
                                    )}
                                    {insight.preparationGuidance && (
                                      <div>
                                        <FieldLabel>Preparation guidance</FieldLabel>
                                        <p className="text-sm text-gray-700 leading-relaxed">{insight.preparationGuidance}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Cross-section Observations */}
                  {premiumReport.crossSectionObservations && premiumReport.crossSectionObservations.length > 0 && (
                    <Card>
                      <SectionHeading>Cross-Section Observations</SectionHeading>
                      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                        Important connections between different parts of your application.
                      </p>
                      <div className="space-y-6">
                        {premiumReport.crossSectionObservations.map((obs, i) => (
                          <div key={i}>
                            {i > 0 && <div className="border-t border-gray-100 mt-4" />}
                            <p className="font-semibold text-sm text-gray-900 mb-2">{obs.title}</p>
                            <p className="text-sm text-gray-700 leading-relaxed mb-2">{obs.connection}</p>
                            {obs.whyItMatters && (
                              <div className="mt-1">
                                <FieldLabel>Why this matters</FieldLabel>
                                <p className="text-sm text-gray-700 leading-relaxed">{obs.whyItMatters}</p>
                              </div>
                            )}
                            {obs.whatToReview && (
                              <div className="mt-1">
                                <FieldLabel>What to review</FieldLabel>
                                <p className="text-sm text-gray-700 leading-relaxed">{obs.whatToReview}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Ready to Explain */}
                  {premiumReport.readyToExplain && premiumReport.readyToExplain.length > 0 && (
                    <Card>
                      <SectionHeading>Areas to Be Ready to Explain</SectionHeading>
                      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                        Topics from your application that may naturally come up during your interview.
                      </p>
                      <div className="space-y-6">
                        {premiumReport.readyToExplain.map((item, i) => (
                          <div key={i}>
                            {i > 0 && <div className="border-t border-gray-100 mt-4" />}
                            <p className="font-semibold text-sm text-gray-900 mb-2">{item.topic}</p>
                            {item.whyItMayComeUp && (
                              <div className="mb-2">
                                <FieldLabel>Why it may come up</FieldLabel>
                                <p className="text-sm text-gray-700 leading-relaxed">{item.whyItMayComeUp}</p>
                              </div>
                            )}
                            {item.whatToBeReadyToExplain && (
                              <div className="mb-2">
                                <FieldLabel>What to be ready to explain</FieldLabel>
                                <p className="text-sm text-gray-700 leading-relaxed">{item.whatToBeReadyToExplain}</p>
                              </div>
                            )}
                            {item.possibleQuestions?.length > 0 && (
                              <div>
                                <FieldLabel>Possible questions</FieldLabel>
                                <ul className="space-y-1.5">
                                  {item.possibleQuestions.map((q, j) => (
                                    <li key={j} className="text-sm text-gray-600 flex gap-2">
                                      <span className="text-gray-400 shrink-0 mt-0.5">›</span>
                                      {q}
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

                  {/* Premium confirmation notice */}
                  <div className="border border-green-100 rounded-xl p-5 bg-green-50 text-center">
                    <p className="text-sm text-green-700 font-medium mb-1">Full VisaPrep Assessment</p>
                    <p className="text-xs text-green-600 leading-relaxed">
                      Your premium access is linked to this application. A new or materially revised DS-160 requires a separate analysis and purchase.
                    </p>
                    {analysisId && (
                      <p className="text-xs text-green-500 font-mono mt-2">{analysisId}</p>
                    )}
                  </div>
                </>
              )}

              {/* 6 — Premium Preparation CTA (only when premium not yet loaded) */}
              {!premiumReport && !premiumLoading && (
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
              )}
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
                {/* Sticky top bar */}
                <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0">
                  <div className="flex flex-col gap-1">
                    {testMode && (
                      <span className="self-start inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 mb-1">
                        Test Mode
                      </span>
                    )}
                    <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">
                      Your Personalized Visa Interview Preparation Starts Here
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
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your free Application Insights have already given you valuable insight into what your application communicates.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Now let&rsquo;s build on that foundation and help you prepare to explain it clearly and confidently during your interview.
                    </p>
                  </div>

                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    Here&rsquo;s everything you&rsquo;ll unlock:
                  </p>

                  <ul className="flex flex-col gap-3">
                    {[
                      { label: "Comprehensive Application Assessment", detail: "Understand the strengths, connections, and interview implications across your full application." },
                      { label: "Personalized Interview Preparation", detail: "Know exactly which parts of your application deserve the most attention before your interview." },
                      { label: "Areas You Should Be Ready to Explain", detail: "Understand what a consular officer may naturally want to explore further in your application." },
                      { label: "Personalized Interview Questions", detail: "Questions generated specifically from your own DS-160 — not a generic question bank." },
                      { label: "Personalized Preparation Roadmap", detail: "A clear plan showing what to review and understand before your interview." },
                      { label: "AI Interview Practice", detail: "Practice realistic visa interview conversations based on your own application and receive personalised feedback after every session.", soon: true },
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

                  <div className="border-t border-gray-100" />

                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">₦20,000</p>
                    <p className="text-sm text-gray-400">one-time</p>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Your purchase unlocks the complete preparation package for this application, permanent access to your saved materials, and five personalised interview-practice sessions available for 90 days.
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
                      if (!analysisId) {
                        setPayError("Your analysis session has expired. Please upload your DS-160 again.");
                        return;
                      }
                      setPayError("");
                      setPaySubmitting(true);
                      try {
                        const res = await fetch("/api/payment/initialize", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: trimmed, analysisId }),
                        });
                        const data = await res.json();
                        if (!res.ok || data.error) {
                          setPayError(data.error ?? "Could not start payment. Please try again.");
                          setPaySubmitting(false);
                          return;
                        }
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

      {/* ── Practice Extension Modal ─────────────────────────────────────── */}
      {showExtensionModal && extensionAnalysisId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { if (!extSubmitting) setShowExtensionModal(false); }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-0 sm:mx-4 max-w-sm w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900 pr-4">30-Day Practice Extension</h2>
              {!extSubmitting && (
                <button
                  onClick={() => setShowExtensionModal(false)}
                  className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="px-6 pb-6 flex flex-col gap-4">
              <ul className="flex flex-col gap-2">
                {[
                  "3 additional personalised interview-practice sessions",
                  "30-day access extension from today",
                  "All previously completed sessions and feedback are preserved",
                ].map((item) => (
                  <li key={item} className="flex gap-2 items-start text-sm text-gray-700">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100" />
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">₦5,000</p>
                <p className="text-sm text-gray-400">one-time</p>
              </div>
              <p className="text-xs text-gray-400 font-mono">{extensionAnalysisId}</p>

              {sessionEmail ? (
                <>
                  {/* Show verified session email — not editable, identity from cookie only */}
                  <div className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50">
                    <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
                    <p className="text-sm font-medium text-gray-800">{sessionEmail}</p>
                  </div>
                  {extError && <p className="text-xs text-red-600">{extError}</p>}
                  <button
                    disabled={extSubmitting}
                    onClick={handleExtensionPayment}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {extSubmitting ? "Redirecting to payment…" : "Continue to Payment — ₦5,000"}
                  </button>
                </>
              ) : (
                <>
                  <div className="border border-amber-200 rounded-xl px-4 py-3 bg-amber-50">
                    <p className="text-sm text-amber-800 font-medium mb-1">Sign in required</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      You must be signed in to purchase an extension. Use the button below to sign in first, then try again.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowExtensionModal(false);
                      setShowAccessModal(true);
                      setAccessStep("email");
                      setAccessError("");
                      setAccessOtp("");
                    }}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Access My Preparation to Sign In
                  </button>
                </>
              )}
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Payment is processed securely by Paystack. VisaPrep does not store your card details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Access My Preparation Modal ───────────────────────────────────── */}
      {showAccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { if (!accessSubmitting) setShowAccessModal(false); }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-0 sm:mx-4 max-w-sm w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900 pr-4">
                {accessStep === "email" ? "Access My Preparation" : "Enter your sign-in code"}
              </h2>
              {!accessSubmitting && (
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4">
              {accessStep === "email" ? (
                <>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Enter the email address you used when purchasing your preparation. We&apos;ll send you a sign-in code.
                  </p>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="access-email" className="text-xs font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="access-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={accessEmail}
                      onChange={(e) => { setAccessEmail(e.target.value); setAccessError(""); }}
                      disabled={accessSubmitting}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRequestCode(); }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                    />
                    {accessError && <p className="text-xs text-red-600">{accessError}</p>}
                  </div>
                  <button
                    disabled={accessSubmitting}
                    onClick={handleRequestCode}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {accessSubmitting ? "Sending…" : "Send Sign-In Code"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    We sent a 6-digit code to <span className="font-medium text-gray-800">{accessEmail}</span>. Enter it below. The code expires in 15 minutes.
                  </p>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="access-otp" className="text-xs font-medium text-gray-700">
                      Sign-in code
                    </label>
                    <input
                      id="access-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={accessOtp}
                      onChange={(e) => { setAccessOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setAccessError(""); }}
                      disabled={accessSubmitting}
                      onKeyDown={(e) => { if (e.key === "Enter") handleVerifyCode(); }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center font-mono tracking-widest text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
                    />
                    {accessError && <p className="text-xs text-red-600">{accessError}</p>}
                  </div>
                  <button
                    disabled={accessSubmitting || accessOtp.length !== 6}
                    onClick={handleVerifyCode}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {accessSubmitting ? "Verifying…" : "Verify & Access My Preparations"}
                  </button>
                  <button
                    disabled={accessSubmitting}
                    onClick={() => { setAccessStep("email"); setAccessOtp(""); setAccessError(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                  >
                    Use a different email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
