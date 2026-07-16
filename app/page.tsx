"use client";

import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Section {
  lesson: string;
  interviewWeight: string;
  memoryRisk: string;
  keySignals: string[];
  insights: string[];
  preparationPrompts: string[];
}

interface Analysis {
  applicationProfile: string;
  submissionDate: string | null;
  topPreparationAreas: string[];
  sections: Section[];
  crossSectionObservations: string[];
  interviewQuestions: string[];
}

// ── Statue of Liberty silhouette ─────────────────────────────────────────────

function LibertySilhouette() {
  return (
    <svg
      viewBox="0 0 200 432"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Torch flame */}
      <ellipse cx="155" cy="10" rx="7" ry="10" />
      {/* Torch handle */}
      <rect x="151" y="18" width="8" height="44" rx="3" />
      {/* Right arm raising torch */}
      <path d="M 106 150 L 116 130 L 132 102 L 148 78 L 151 62 L 159 62 L 156 80 L 140 106 L 124 136 L 112 156 Z" />
      {/* Crown band */}
      <rect x="60" y="102" width="60" height="13" rx="2" />
      {/* Crown — 7 radiating spikes */}
      <polygon points="63,102 66,73 69,102" />
      <polygon points="71,102 74,67 77,102" />
      <polygon points="80,102 83,62 86,102" />
      <polygon points="88,102 91,59 94,102" />
      <polygon points="97,102 100,63 103,102" />
      <polygon points="105,102 108,69 111,102" />
      <polygon points="113,102 116,75 119,102" />
      {/* Head */}
      <circle cx="90" cy="128" r="15" />
      {/* Neck */}
      <rect x="84" y="143" width="12" height="13" />
      {/* Shoulders */}
      <path d="M 60 156 Q 75 150 90 148 Q 105 150 120 156 L 116 170 L 64 170 Z" />
      {/* Left arm holding tablet */}
      <path d="M 64 156 L 54 163 L 46 188 L 40 218 L 52 222 L 58 194 L 66 170 Z" />
      {/* Tablet */}
      <rect x="32" y="212" width="24" height="32" rx="3" />
      {/* Upper robe */}
      <path d="M 64 170 L 116 170 L 121 212 L 59 212 Z" />
      {/* Main robe body */}
      <path d="M 59 212 L 121 212 L 132 322 L 48 322 Z" />
      {/* Robe hem — flares at base */}
      <path d="M 44 322 L 136 322 L 144 362 L 36 362 Z" />
      {/* Pedestal upper step */}
      <rect x="34" y="362" width="112" height="28" />
      {/* Pedestal lower step */}
      <rect x="20" y="390" width="140" height="22" />
      {/* Base */}
      <rect x="6" y="412" width="168" height="18" rx="2" />
    </svg>
  );
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1 shrink-0 text-gray-400">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LessonCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const missing =
    section.insights.length === 1 &&
    section.insights[0].startsWith("Not enough information");

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
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                What was detected
              </p>
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Application Insights
            </p>
            <BulletList items={section.insights} />
          </div>
          {section.preparationPrompts.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Prepare to discuss
              </p>
              <BulletList items={section.preparationPrompts} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [showFull, setShowFull] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;

    setFileName(file.name);
    setAnalyzing(true);
    setAnalysis(null);
    setError("");
    setShowFull(false);

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
    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing your document.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-white">

      {/* ── Hero area — header + upload ──────────────────────────────────── */}
      {!analysis && (
        <div className="relative overflow-hidden w-full flex flex-col items-center">

          {/* Background: flag stripes at low opacity */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(178,34,52,0.055) 0px, rgba(178,34,52,0.055) 26px, transparent 26px, transparent 52px)",
            }}
          />

          {/* Background: stars canton dot grid, top-left */}
          <div
            className="absolute top-0 left-0 w-48 h-32 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(15,40,100,0.08) 1.5px, transparent 1.5px)",
              backgroundSize: "18px 15px",
            }}
          />

          {/* Background: Statue of Liberty silhouette, right side */}
          <div
            className="absolute right-0 bottom-0 pointer-events-none select-none"
            style={{
              height: "92%",
              color: "rgb(15,40,100)",
              opacity: 0.06,
            }}
          >
            <LibertySilhouette />
          </div>

          {/* Content sits above background elements */}
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center pt-14 pb-12 px-8">
            <h1 className="text-5xl font-bold mb-4">VisaPrep</h1>
            <p className="text-xl mb-3">
              Prepare with clarity. Interview with confidence.
            </p>
            <p className="text-gray-600 max-w-xl">
              Your visa application tells your story. VisaPrep helps you
              understand it, so you can explain it clearly and confidently.
            </p>
          </div>

          {/* Upload card */}
          <div className="relative z-10 w-full max-w-md px-8 pb-14">
            <label className="border-2 border-dashed rounded-xl p-8 cursor-pointer text-center w-full hover:border-gray-400 transition-colors block bg-white/80">
              <span className="block mb-3 text-gray-700">
                Upload your DS-160 application
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
              <span className="bg-black text-white px-6 py-3 rounded-lg text-sm font-medium">
                Choose File
              </span>
            </label>

            {/* File received */}
            {fileName && (
              <p className="mt-4 text-sm text-gray-600 text-center">
                ✅ Received:{" "}
                <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Analyzing state ──────────────────────────────────────────────── */}
      {analyzing && (
        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">Analyzing your application…</p>
          <p className="text-xs mt-1 text-gray-400">
            This usually takes 10–20 seconds.
          </p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mt-6 border border-red-200 rounded-xl p-5 max-w-xl w-full bg-red-50 mx-8">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {analysis && (
        <div className="w-full max-w-2xl mt-8 space-y-5 px-8">

          {/* Upload another */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Analyzed:{" "}
              <span className="font-medium text-gray-700">{fileName}</span>
            </p>
            <label className="text-sm text-gray-500 underline cursor-pointer hover:text-gray-700">
              Upload another
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </label>
          </div>

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

          {/* 2 — Top Preparation Areas */}
          {analysis.topPreparationAreas.length > 0 && (
            <Card>
              <SectionHeading>Top Preparation Areas</SectionHeading>
              <ol className="list-none space-y-3">
                {analysis.topPreparationAreas.map((area, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="shrink-0 font-semibold text-gray-400 w-4">
                      {i + 1}.
                    </span>
                    <span>{area}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* 3 — Questions to Prepare For */}
          {analysis.interviewQuestions.length > 0 && (
            <Card>
              <SectionHeading>Questions to Prepare For</SectionHeading>
              <p className="text-xs text-gray-400 mb-3">
                Based on your submitted application. Prepare to discuss these
                areas clearly and honestly.
              </p>
              <ol className="list-none space-y-3">
                {analysis.interviewQuestions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="shrink-0 font-semibold text-gray-400 w-4">
                      {i + 1}.
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
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
                  <div className="border rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                      Cross-Section Observations
                    </p>
                    <BulletList items={analysis.crossSectionObservations} />
                  </div>
                )}
                {analysis.sections.map((section, i) => (
                  <LessonCard key={i} section={section} />
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center pb-8">
            VisaPrep is a preparation tool. It does not provide legal advice,
            predict visa outcomes, or guarantee any result.
          </p>
        </div>
      )}
    </main>
  );
}
