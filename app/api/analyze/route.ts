import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an expert visa consultant helping applicants understand and prepare for their US visa interview based on their submitted DS-160 application.

You will receive the extracted text from a DS-160 visa application form. Your job is to analyze the application and return a JSON object with Application Insights that help the applicant understand their own application and prepare to explain it clearly and honestly during their interview.

Return ONLY valid JSON with this exact structure:
{
  "summary": "A 2-3 sentence plain-language summary of the application — who the applicant is, what they do, and the purpose of their trip.",
  "keyFacts": [
    "Important fact about the application the applicant should be ready to confirm and discuss"
  ],
  "potentialQuestions": [
    "A likely interview question based on specific details in this application"
  ],
  "thingsToKnow": [
    "Something notable or worth understanding clearly about their own application"
  ]
}

Rules:
- Base every insight strictly on what is in the application. Do not invent or assume details.
- keyFacts: 4-6 specific facts directly drawn from the application (travel dates, employer, purpose, etc.)
- potentialQuestions: 4-6 realistic questions an officer might ask based on this specific application
- thingsToKnow: 3-5 helpful observations about the application (connections between fields, anything that might warrant a clear explanation)
- All insights must help the applicant understand and communicate their own application honestly
- Write in plain, accessible language — not legal jargon
- Do not guarantee visa approval or predict outcomes`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const buffer = await file.arrayBuffer();
    const extracted = await extractTextFromPDF(buffer);

    if (!extracted.text || extracted.text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract readable text from this document. Please upload your DS-160 PDF." },
        { status: 422 }
      );
    }

    // Truncate to avoid token limits — DS-160s are typically 3-8 pages
    const applicationText = extracted.text.slice(0, 12000);

    // Analyze with OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the extracted text from the DS-160 application:\n\n${applicationText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      throw new Error("Empty response from AI");
    }

    const insights = JSON.parse(raw);

    return NextResponse.json({
      pages: extracted.pages,
      insights,
    });

  } catch (error) {
    console.error("ANALYZE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to analyze document";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
