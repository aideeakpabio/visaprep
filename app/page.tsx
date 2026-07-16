"use client";

import { useState } from "react";

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  async function handleUpload(file: File | undefined) {
  if (!file) return;

  setFileName(file.name);
  setAnalyzing(true);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      setInsights([
        "We could not analyze this document.",
      ]);
      return;
    }

    setInsights([
      `Document analyzed successfully.`,
      `Pages detected: ${data.pages}`,
      `Characters extracted: ${data.characters}`,
      `Preview: ${data.preview.substring(0, 200)}...`,
    ]);

  } catch (error) {
    console.error(error);

    setInsights([
      "Something went wrong while analyzing your document.",
    ]);

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
          onChange={(e) =>
            handleUpload(e.target.files?.[0])
          }
        />

        <span className="bg-black text-white px-6 py-3 rounded">
          Choose File
        </span>
      </label>

      {fileName && (
        <div className="mt-6 text-center">
          <p>✅ Application received:</p>

          <p className="font-semibold">
            {fileName}
          </p>

          {insights.length > 0 && (
            <div className="mt-6 border rounded-xl p-6 max-w-md shadow-sm text-left">
              <h2 className="font-bold text-xl mb-3">
                ✅ Analysis Complete
              </h2>

              <p className="mb-4">
                Your Application Insights are ready.
              </p>

              <h3 className="font-bold mb-3">
                Key Insights
              </h3>

              <ul className="list-disc pl-5 space-y-2">
                {insights.map((item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}