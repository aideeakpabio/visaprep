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

// SVG components removed — replaced with real photos (public/flag.jpg, public/statue.jpg)

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [showFull, setShowFull] = useState(false);

  async function handleUpload(file: File) {
    setFileName(file.name);
    setPendingFile(null);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setFileName(f.name);
    setError("");
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-white">

      {/* ── Hero — upload / analyzing ────────────────────────────────────── */}
      {!analysis && (
        <div className="relative overflow-hidden w-full flex flex-col items-center min-h-screen">

          {/* US flag — real photo, top-left, 7% opacity */}
          <div
            className="absolute top-0 left-0 pointer-events-none select-none"
            style={{ width: "32%", maxWidth: 280, opacity: 0.07 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flag.jpg"
              alt=""
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Statue of Liberty — real photo, right background, 8% opacity */}
          <div
            className="absolute right-0 bottom-0 pointer-events-none select-none"
            style={{ height: "72%", opacity: 0.08 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/statue.jpg"
              alt=""
              style={{ height: "100%", width: "auto", display: "block", objectFit: "contain", objectPosition: "bottom right" }}
            />
          </div>

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
              Upload your completed DS-160 and receive your personalized
              Application Insights in minutes.
            </p>
          </div>

          {/* Upload widget */}
          <div className="relative z-10 w-full max-w-md px-8 pb-16">
            {!analyzing && (
              <>
                {/* Drop zone */}
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
              </>
            )}

            {analyzing && (
              <div className="border border-gray-100 rounded-2xl p-8 text-center bg-white shadow-sm">
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Analyzing your application…
                </p>
                <p className="text-xs text-gray-400">
                  This usually takes 10–20 seconds.
                </p>
              </div>
            )}

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
                  if (f) handleUpload(f);
                }}
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

          <p className="text-xs text-gray-400 text-center pb-8">
            VisaPrep is a preparation tool. It does not provide legal advice,
            predict visa outcomes, or guarantee any result.
          </p>
        </div>
      )}
    </main>
  );
}
