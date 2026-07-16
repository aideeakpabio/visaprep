import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf";

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

    const buffer = await file.arrayBuffer();

    const result = await extractTextFromPDF(buffer);

    return NextResponse.json({
      pages: result.pages,
      characters: result.text.length,
      preview: result.text.substring(0, 500),
    });

  } catch (error) {
    console.error("ANALYZE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze document",
      },
      { status: 500 }
    );
  }
}