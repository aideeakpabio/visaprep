---
name: AIM Engine Implementation
description: Governing decisions for the Application Intelligence Engine system prompt, output schema, and approved design choices for the VisaPrep Magic Moment.
---

# Application Intelligence Engine — Approved Design

## Source of truth
The Application Intelligence Manual (AIM) at `attached_assets/VisaPrep™_Application_Intelligence_Manual_(AIM)_1784228263182.pdf` governs all engine behavior. Do not reinterpret or simplify its framework without owner approval.

## Approved Interview Weight™ assignments
| Lesson | Interview Weight | Memory Risk |
|---|---|---|
| 1 — Travel Information | HIGH | Moderate–High |
| 2 — Personal Information | LOW | Low |
| 3 — Passport Information | LOW | Low |
| 4 — Previous U.S. Travel | HIGH | HIGH |
| 5 — Travel Companions | MEDIUM (Dynamic) | Low |
| 6 — U.S. Contact Information | MEDIUM–HIGH (Context Dependent) | Medium |
| 7 — Family, Roots & Ties | HIGH | Low–Medium |

## Approved decisions (owner-confirmed)
- **Submission date**: extract from PDF only if explicitly present; never infer from other dates; omit time-based insights if absent.
- **Missing sections**: output "Not enough information was detected in the uploaded document to assess this area." — never invent or infer.
- **Premium Guidance**: deferred to paid tier; include only brief inline context where needed.
- **Follow-up logic**: converted to preparation prompts in one-shot flow; no conversational interview UI yet.
- **Application Profile**: emphasize the application (visa type, purpose, employment, travel plans), not the person.
- **Interview Questions**: most likely questions for this specific application; no fixed quantity.

## Output schema (approved)
```json
{
  "applicationProfile": "string",
  "submissionDate": "string | null",
  "topPreparationAreas": ["string"],
  "sections": [
    {
      "lesson": "string",
      "interviewWeight": "string",
      "memoryRisk": "string",
      "keySignals": ["string"],
      "insights": ["string"],
      "preparationPrompts": ["string"]
    }
  ],
  "crossSectionObservations": ["string"],
  "interviewQuestions": ["string"]
}
```
Sections always appear in AIM lesson order 1→7; all seven always present.

## Frontend layout (approved)
1. Applicant Snapshot (applicationProfile)
2. Top Preparation Areas (topPreparationAreas)
3. Most Likely Interview Questions (interviewQuestions)
4. "View Full Analysis" collapsible → cross-section observations + all 7 lesson cards

## Key files
- `app/api/analyze/route.ts` — system prompt + OpenAI call + response passthrough
- `app/page.tsx` — full Magic Moment UI
- `lib/pdf.ts` — PDF extraction (pdf-parse; preserve unless replacing)

**Why:** Owner requires the AIM as governing document; any changes to the engine framework need explicit approval before implementation.
