"use client";

import { useState } from "react";

interface Insights {
  summary: string;
  keyFacts: string[];
  potentialQuestions: string[];
  thingsToKnow: string[];
}

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(file: File | undefined) {
    if (!file) return;

    setFileName(file.name);
    setAnalyzing(true);
    setInsights(null);
    setError("");

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

      setInsights(data.insights);

    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing your document.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-4">
        VisaPrep
      </h1>

      <p className="text-xl mb-3">
        Prepare with clarity. Interview with confidence.
      </p>

      <p className="text-center text-gray-600 max-w-xl mb-8">
        Your visa application tells your story.
        VisaPrep helps you understand it, so you can explain it clearly and confidently.
      </p>

      <label className="border-2 border-dashed rounded-lg p-8 cursor-pointer">
        <span className="block mb-3">
          Upload your DS-160 application
        </span>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />

        <span className="bg-black text-white px-6 py-3 rounded">
          Choose File
        </span>
      </label>

      {fileName && (
        <div className="mt-6 text-center">
          <p>✅ Application received: <span className="font-semibold">{fileName}</span></p>
        </div>
      )}

      {analyzing && (
        <div className="mt-6 text-center text-gray-600">
          <p>Analyzing your application…</p>
        </div>
      )}

      {error && (
        <div className="mt-6 border border-red-200 rounded-xl p-6 max-w-md bg-red-50 text-left">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {insights && (
        <div className="mt-8 max-w-2xl w-full space-y-6">
          <div className="border rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-xl mb-3">✅ Application Insights</h2>
            <p className="text-gray-700">{insights.summary}</p>
          </div>

          <div className="border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-3">Key Facts</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {insights.keyFacts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-3">Likely Interview Questions</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {insights.potentialQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-3">Things to Know About Your Application</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {insights.thingsToKnow.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
