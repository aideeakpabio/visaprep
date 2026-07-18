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
- **Missing sections**: set keySignals to [] and insights to [{ observation: "Not enough information…", whyItMatters: "", preparationGuidance: "" }].
- **Document validation**: model assesses isLikelyDS160 before generating analysis; invalid docs return empty arrays and a user-facing message without fake analysis.
- **Session key**: `visaprep_analysis_v2` — bumped from v1 to force old-schema cached results to be ignored rather than crash the page.
- **Application Profile**: emphasize the application (visa type, purpose, employment, travel plans), not the person.

## Output schema (current — v2)
```json
{
  "documentAssessment": { "isLikelyDS160": true, "message": null },
  "applicationProfile": "string",
  "submissionDate": "string | null",
  "topPreparationAreas": [
    { "title": "string", "observation": "string", "whyItMayComeUp": "string", "whatToBeReadyToExplain": "string" }
  ],
  "sections": [
    {
      "lesson": "string",
      "interviewWeight": "string",
      "memoryRisk": "string",
      "keySignals": ["string"],
      "insights": [{ "observation": "string", "whyItMatters": "string", "preparationGuidance": "string" }]
    }
  ],
  "crossSectionObservations": [
    { "title": "string", "connection": "string", "whyItMatters": "string", "whatToReview": "string" }
  ],
  "readyToExplain": [
    { "topic": "string", "whyItMayComeUp": "string", "whatToBeReadyToExplain": "string", "possibleQuestions": ["string"] }
  ]
}
```
Sections always appear in AIM lesson order 1→7; all seven always present. `interviewQuestions` (flat array) replaced by `readyToExplain` (structured objects). `preparationPrompts` removed from sections; folded into per-insight `preparationGuidance`.

## Frontend layout (current — v2)
1. Applicant Snapshot (applicationProfile + submissionDate)
2. Top Preparation Areas — structured blocks: title, observation, "Why this may come up", "What you should be ready to explain"
3. What You Should Be Ready to Explain — topic, whyItMayComeUp, whatToBeReadyToExplain, "Questions you may hear"
4. "View Full Analysis" collapsible → cross-section observations (title/connection/whyItMatters/whatToReview) + all 7 lesson cards (observation/whyItMatters/preparationGuidance per insight)
5. Invalid doc state: amber card "We Need Your DS-160" with Upload another button; no analysis sections shown.

## Key files
- `app/api/analyze/route.ts` — system prompt + OpenAI call + response passthrough
- `app/page.tsx` — full Magic Moment UI
- `lib/pdf.ts` — PDF extraction (pdf-parse; preserve unless replacing)

**Why:** Owner requires the AIM as governing document; any changes to the engine framework need explicit approval before implementation.
