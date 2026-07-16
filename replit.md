# VisaPrep

VisaPrep helps visa applicants understand their submitted DS-160 application and prepare to communicate clearly, confidently, and honestly during their visa interview. It is an ethical preparation platform — not a visa approval prediction tool.

## Stack

- **Framework:** Next.js 16 (App Router, webpack mode)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **AI:** OpenAI `gpt-4o-mini` via the `openai` npm package
- **PDF extraction:** `pdf-parse` (text-layer PDFs)

## How to Run

The app runs via the **Start application** workflow:

```
npm run dev -- --port 5000
```

Port: **5000** (required for Replit webview)

## Environment Secrets Required

| Secret | Purpose |
|---|---|
| `OPENAI_API_KEY` | Powers the Application Intelligence Engine. Add in Replit Secrets to enable the Magic Moment. |

Without `OPENAI_API_KEY`, the app starts and the upload UI works, but analysis returns a 503 error with a clear message.

## Magic Moment Flow

```
Upload DS-160 PDF
  → lib/pdf.ts (pdf-parse text extraction)
  → app/api/analyze/route.ts (POST handler)
  → OpenAI gpt-4o-mini with AIM-governed system prompt
  → Structured JSON (applicationProfile, topPreparationAreas, sections ×7, interviewQuestions)
  → app/page.tsx (Applicant Snapshot → Top Preparation Areas → Interview Questions → Full Analysis)
```

## Application Intelligence Engine

Governed by the **Application Intelligence Manual (AIM)** at `attached_assets/VisaPrep™_Application_Intelligence_Manual_(AIM)_1784228263182.pdf`.

The AIM defines 7 lessons (DS-160 sections), each with an Interview Weight™ and Memory Risk™. The system prompt in `app/api/analyze/route.ts` encodes these rules faithfully. Do not modify the engine framework without owner approval.

Key rules:
- Every insight must be grounded in the extracted DS-160 text — no invention
- Time-based insights only if submission date is explicitly in the PDF
- Missing sections: state clearly, never infer absence as satisfactory
- Never predict outcomes, never use evaluative language ("red flag", "strong ties", etc.)

## Project Structure

```
app/
  page.tsx              — Magic Moment UI (upload + 4-panel results layout)
  layout.tsx            — Root layout with Geist fonts + VisaPrep metadata
  api/
    analyze/
      route.ts          — POST: PDF extract → OpenAI → structured insights
lib/
  pdf.ts                — PDF text extraction wrapper (pdf-parse)
attached_assets/
  VisaPrep™_Application_Intelligence_Manual_(AIM)_*.pdf  — AIM source of truth
  VisaPrep_MVP_Build_Instructions_v1.0_*.docx            — MVP build brief
```

## User Preferences

- The AIM is the governing source of truth for the engine. Do not reinterpret or simplify it without asking first.
- Preserve the existing upload flow and PDF extraction unless replacement is explicitly requested.
- Do not add authentication, payments, dashboards, analytics, mock interviews, or any features outside the Magic Moment without explicit instruction.
- Continue with OpenAI / gpt-4o-mini for this sprint to minimize rework.
- Frontend layout: Applicant Snapshot → Top Preparation Areas → Most Likely Interview Questions → View Full Analysis (collapsible).
