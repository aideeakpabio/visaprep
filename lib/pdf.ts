// @ts-expect-error pdf-parse does not provide types for this internal entry point
import pdf from "pdf-parse/lib/pdf-parse.js";

export async function extractTextFromPDF(buffer: ArrayBuffer) {
  const data = await pdf(Buffer.from(buffer));

  return {
    pages: data.numpages,
    text: data.text,
  };
}