# VisaPrep

VisaPrep helps visa applicants understand the DS-160 application they submitted and prepare to communicate clearly, confidently, and honestly during their interview.

## Stack

- **Framework:** Next.js 16 (App Router, webpack mode)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **AI:** OpenAI (`gpt-4o-mini`) via the `openai` npm package
- **PDF extraction:** `pdf-parse`

## How to Run

The app runs on port 5000 via the **Start application** workflow:

```
npm run dev -- --port 5000
```

## Environment Secrets Required

| Secret | Purpose |
|---|---|
| `OPENAI_API_KEY` | Powers the DS-160 analysis. Add this in Replit Secrets to enable the Magic Moment. |

Without `OPENAI_API_KEY`, the app will start and the upload UI will work, but analysis will return a 503 error.

## Magic Moment Flow

1. User uploads their DS-160 PDF
2. `/api/analyze` extracts text via `lib/pdf.ts` (uses `pdf-parse`)
3. Extracted text is sent to OpenAI with a structured prompt
4. OpenAI returns JSON with: `summary`, `keyFacts`, `potentialQuestions`, `thingsToKnow`
5. `app/page.tsx` renders the Application Insights

## Project Structure

```
app/
  page.tsx          — Upload UI + Insights display
  layout.tsx        — Root layout with Geist fonts
  api/
    analyze/
      route.ts      — POST handler: PDF extract → OpenAI → insights
lib/
  pdf.ts            — PDF text extraction wrapper
```

## User Preferences

- Preserve the existing upload flow, PDF extraction, and Application Insights interface
- Do not add authentication, payments, dashboards, analytics, or unrelated features
- Keep the product focused on the Magic Moment only
