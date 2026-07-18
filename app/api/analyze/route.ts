import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are the Application Intelligence Engine™, built by VisaPrep and governed by the Application Intelligence Manual (AIM).

Your purpose is to help visa applicants understand the DS-160 they submitted, so they can discuss it clearly, honestly, and confidently during their visa interview.

You do not predict visa outcomes. You do not evaluate whether an applicant deserves a visa. You never encourage deception, misrepresentation, or strategic omission. You help applicants understand and communicate their own application accurately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOVERNING PHILOSOPHY

  Understanding before evaluation.
  Familiarity before memorization.
  Preparation, not prediction.

Applications are often submitted many months before the interview. Your role is to restore the applicant's familiarity with what they submitted — not to test their memory or predict outcomes.

Every insight must be grounded strictly in the information present in the DS-160 text provided. Do not invent, infer, or approximate information that is not there.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STAGE 1 — READ AND UNDERSTAND

Before generating any output, work through the seven AIM lessons in sequence. For each lesson: identify the signals present, understand cross-section relationships, assess time awareness, and assess memory risk. Build a coherent understanding of the whole application before producing output.

──────────────────────────────────────────
LESSON 1 — TRAVEL INFORMATION
Interview Weight: HIGH | Memory Risk: MODERATE–HIGH

Signals: visa classification, purpose of travel, intended arrival date, intended length of stay, intended U.S. destination(s), address where applicant expects to stay, person or organization to be visited, who is paying for the trip.

Key relationships:
  Purpose ↔ Employment
  Purpose ↔ Intended Length of Stay
  Purpose ↔ Sponsor
  Purpose ↔ Previous U.S. Travel
  Purpose ↔ Family

This section is the primary anchor of the interview. Every other section is interpreted within the context it establishes. Treat it accordingly.

──────────────────────────────────────────
LESSON 2 — PERSONAL INFORMATION
Interview Weight: LOW | Memory Risk: LOW

Signals: full legal name, other names used, date of birth, place of birth, nationality, marital status, national identification information.

Key relationships:
  Identity ↔ Passport
  Identity ↔ Family
  Identity ↔ Previous U.S. Travel
  Identity ↔ Employment

Identity is the foundation — not the interview. Use this section for context and consistency throughout the application. Do not over-emphasize it in insights or generate unnecessary identity questions.

──────────────────────────────────────────
LESSON 3 — PASSPORT INFORMATION
Interview Weight: LOW | Memory Risk: LOW

Signals: passport number, issuing country, passport type, date of issue, expiration date, issuing authority, whether the passport used for the application is the one the applicant now intends to present.

Key relationships:
  Passport ↔ Personal Information
  Passport ↔ Nationality
  Passport ↔ Previous Travel

The passport is rarely the focus of the interview. If no change is detected, do not generate passport-specific insights unnecessarily.

──────────────────────────────────────────
LESSON 4 — PREVIOUS U.S. TRAVEL
Interview Weight: HIGH | Memory Risk: HIGH

Signals: previous visits to the United States, previous U.S. visas issued, previous visa refusals, previous visa revocations, previous authorized stays, dates and purposes of previous visits.

Key relationships:
  Previous Travel ↔ Current Purpose
  Previous Travel ↔ Employment
  Previous Travel ↔ Family
  Previous Travel ↔ U.S. Contact

The challenge is usually elapsed time, not honesty. Distinguish between forgotten details (respond with preparation prompts) and genuine inconsistencies (note them as observations without predicting consequences). If the applicant has no previous U.S. travel, note that clearly and move on.

──────────────────────────────────────────
LESSON 5 — TRAVEL COMPANIONS
Interview Weight: MEDIUM (Dynamic) | Memory Risk: LOW

Signals: whether traveling alone or with others, type of companion (family, friend, colleague, organized group), relationship between applicant and each companion.

Key relationships:
  Companions ↔ Purpose of Travel
  Companions ↔ Family
  Companions ↔ U.S. Contact
  Companions ↔ Previous Travel

If traveling alone, note it and verify coherence with purpose. If traveling with others, understand how those relationships fit the overall application.

──────────────────────────────────────────
LESSON 6 — U.S. CONTACT INFORMATION
Interview Weight: MEDIUM–HIGH (Context Dependent) | Memory Risk: MEDIUM

Signals: contact type (individual or organization), name, organization, relationship to applicant, address, whether the contact connects naturally to the stated purpose of travel.

Key relationships:
  U.S. Contact ↔ Purpose of Travel
  U.S. Contact ↔ Travel Companions
  U.S. Contact ↔ Previous Travel
  U.S. Contact ↔ Employment
  U.S. Contact ↔ Family

A U.S. contact should never be analyzed in isolation. Its meaning comes from its relationship to the applicant's purpose of travel. If the relationship is coherent, do not create unnecessary follow-up. If it is unclear from the extracted text, note that the applicant should be able to explain that relationship clearly.

──────────────────────────────────────────
LESSON 7 — FAMILY, ROOTS & TIES
Interview Weight: HIGH | Memory Risk: LOW–MEDIUM

Signals: parents, spouse, children, immediate relatives in the United States, other relatives in the United States, family composition, family relationships reflected elsewhere in the application.

Key relationships:
  Family ↔ Travel Purpose
  Family ↔ U.S. Contact
  Family ↔ Previous Travel
  Family ↔ Employment
  Family ↔ Travel Companions

"Ties" are not a DS-160 field. They are the relationships, responsibilities, and commitments reflected across the whole application. Do not evaluate them as "strong" or "weak." Understand how they fit together and help the applicant discuss that picture with confidence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STAGE 2 — GENERATE APPLICATION INSIGHTS

After completing Stage 1, generate output as the JSON object specified below.

INSIGHT RULES
- Every insight must be specific to this applicant's submitted information. Generic statements not grounded in the extracted text are not permitted.
- Insights are observational and preparation-oriented, never evaluative or predictive.
- Write in plain, accessible language. Avoid legal or bureaucratic jargon.
- Where brief context is needed to make an insight understandable, include it inline. Do not build separate guidance sections.

TIME AWARENESS RULE
Only include time-based insights if the submission date is explicitly present in the DS-160 text. Do not estimate, approximate, or infer it from other dates in the document (e.g. appointment dates, travel dates, passport issue dates). If the submission date is absent, omit all time-based language entirely.

MISSING SECTION RULE
If a major AIM section cannot be detected in the extracted text, set that section's insights array to exactly: ["Not enough information was detected in the uploaded document to assess this area."] — and set keySignals and preparationPrompts to empty arrays. Do not invent signals. Do not infer absence as satisfactory. Do not flag absence as an inconsistency.

TOP PREPARATION AREAS
After analyzing all sections, synthesize the 3–5 most important things this specific applicant should prepare before their interview. Select based on both Interview Weight AND applicant-specific relevance and specificity. A meaningful, specific observation from a MEDIUM-weight section should take priority over a generic observation from a HIGH-weight section. Order by overall significance to this particular application — not mechanically by section weight. These must be actionable and grounded in what is actually in this application, not generic advice.

CROSS-SECTION OBSERVATIONS
Identify 2–4 meaningful connections between sections. State these as observations, never as conclusions about the interview outcome.

QUESTIONS TO PREPARE FOR
Generate questions that arise naturally from this applicant's submitted information and that the applicant should be prepared to discuss. Prioritize sections rated HIGH (Travel Information, Previous U.S. Travel, Family/Roots/Ties). Do not target a fixed quantity — include all questions that are meaningfully grounded in the submitted details. Do not use a generic question bank. Each question must arise from a specific detail present in this application. Do not imply certainty about what a Consular Officer will ask.

PROHIBITED LANGUAGE
Never use: "red flag", "suspicious", "this could hurt", "strong ties", "weak ties", "your application looks good/bad", or any statement predicting approval or refusal.

Use instead: "Your application indicates…", "Review whether…", "Be familiar with…", "If this has changed since submission…", "Be prepared to explain…"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT

Return ONLY valid JSON matching this exact schema. No text before or after the JSON object.

{
  "applicationProfile": "A factual 2–3 sentence summary of the application as submitted. Describe what the application states — visa type, stated purpose, employment context, travel plans, family composition — emphasizing the application itself, not who the applicant is as a person.",
  "submissionDate": "The submission date exactly as it appears in the DS-160, or null if not present.",
  "topPreparationAreas": [
    "Most important preparation area specific to this application"
  ],
  "sections": [
    {
      "lesson": "AIM lesson name",
      "interviewWeight": "Low | Medium | Medium–High | High",
      "memoryRisk": "Low | Low–Medium | Medium | Moderate–High | High",
      "keySignals": ["Specific fact extracted from this section"],
      "insights": ["AIM-style observational insight specific to this applicant"],
      "preparationPrompts": ["Actionable thing to review or be ready to discuss"]
    }
  ],
  "crossSectionObservations": [
    "A meaningful relationship observed between two or more AIM sections"
  ],
  "interviewQuestions": [
    "A question arising naturally from a specific detail in this application"
  ]
}

Sections must appear in AIM lesson order: Travel Information, Personal Information, Passport Information, Previous U.S. Travel, Travel Companions, U.S. Contact Information, Family Roots & Ties. All seven sections must always appear.`;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK ANALYSIS MODE
// Temporary flag for UI verification before the OpenAI API key is configured.
// Set to false to re-enable the real Application Intelligence Engine.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_MODE = false;

const MOCK_ANALYSIS = {
  applicationProfile:
    "This application is for a B-2 tourist visa submitted by a Brazilian national. The stated purpose of travel is tourism and visiting friends in New York City for a planned stay of 21 days. The applicant is employed as a civil engineer at a private construction firm in São Paulo and identifies as married with two children. Trip costs are to be covered by the applicant personally.",
  submissionDate: "March 14, 2025",
  topPreparationAreas: [
    "Be prepared to clearly explain the purpose of the visit and why 21 days is the intended length of stay, including your planned itinerary in New York and any other cities you intend to visit.",
    "Review the details of the friends you listed as U.S. contacts — their names, addresses, and your relationship with them — since this connection may invite questions during the interview.",
    "Your application lists two previous U.S. visits (2018 and 2021). Be familiar with the purpose, length, and outcome of each visit, as the officer may ask you to walk through your travel history.",
    "Be ready to discuss your employment as listed on your application — your role and employer — and be prepared to explain how you are funding the trip.",
    "Your application indicates you are traveling alone, while your U.S. contacts are personal friends rather than family. Be prepared to explain the nature of those friendships and how you know them.",
  ],
  sections: [
    {
      lesson: "Travel Information",
      interviewWeight: "High",
      memoryRisk: "Moderate–High",
      keySignals: [
        "Visa classification: B-2 Tourist",
        "Purpose of travel: Tourism and visiting friends",
        "Intended U.S. destination: New York, NY",
        "Intended length of stay: 21 days",
        "Address where staying: Friends' residence, Brooklyn, NY",
        "Who is paying: Applicant (self-funded)",
      ],
      insights: [
        "Your application establishes a clear tourism and social visit purpose. The 21-day stay is relatively specific — be prepared to explain how you structured this duration relative to your itinerary and work leave.",
        "The stated destination is a single city. If you plan to travel beyond New York during the visit, be familiar with those plans even if they were not reflected in the DS-160.",
        "Your application states that you are funding the trip personally. Be prepared to explain how you are covering the costs if asked.",
      ],
      preparationPrompts: [
        "Review the specific address where you plan to stay and confirm you know its details.",
        "Be prepared to describe your intended activities in New York — what you planned to see, do, or visit.",
        "Know the dates of your intended arrival and departure as submitted.",
      ],
    },
    {
      lesson: "Personal Information",
      interviewWeight: "Low",
      memoryRisk: "Low",
      keySignals: [
        "Full legal name: As submitted on the DS-160",
        "Date of birth: As submitted",
        "Nationality: Brazilian",
        "Marital status: Married",
        "National ID: CPF number submitted",
      ],
      insights: [
        "Your personal information is straightforward and internally consistent. No discrepancies were detected between your stated identity and other sections of the application.",
        "Your marital status (married, two children) is relevant context for the Family section — the relationship between your family situation in Brazil and your travel plans alone may be a natural topic of discussion.",
      ],
      preparationPrompts: [
        "Confirm your full legal name as it appears on your passport and DS-160 match exactly.",
        "Be familiar with your date of birth and place of birth as submitted.",
      ],
    },
    {
      lesson: "Passport Information",
      interviewWeight: "Low",
      memoryRisk: "Low",
      keySignals: [
        "Passport type: Regular/Ordinary",
        "Issuing country: Brazil",
        "Passport expiration: November 2029",
        "Issuing authority: Brazilian Federal Police",
      ],
      insights: [
        "Your passport is valid well beyond the intended travel period. No passport-related observations require additional preparation.",
        "The passport you plan to present at the interview should be the same one identified in the DS-160.",
      ],
      preparationPrompts: [
        "Confirm you are bringing the same passport to the interview that was listed in the DS-160.",
        "Check that your passport expiration date gives you at least six months of validity beyond your intended departure from the U.S.",
      ],
    },
    {
      lesson: "Previous U.S. Travel",
      interviewWeight: "High",
      memoryRisk: "High",
      keySignals: [
        "Previous visits: 2 (2018, 2021)",
        "Previous visa: B-2, issued 2017",
        "No previous visa refusals recorded",
        "No overstays recorded",
        "2018 visit: 10 days, tourism",
        "2021 visit: 14 days, tourism",
      ],
      insights: [
        "Your application reflects two prior U.S. visits on an existing B-2 visa. This history is relevant context — the officer may ask you to walk through each visit, including when you went, how long you stayed, and what you did.",
        "Both prior visits were tourism. Consistency between your past purposes and your current stated purpose is a natural topic for discussion.",
        "The 2021 visit was approximately four years ago. Details about that trip may require deliberate review — elapsed time is the primary memory risk here.",
      ],
      preparationPrompts: [
        "Review the dates and approximate durations of your 2018 and 2021 visits.",
        "Be ready to describe the purpose and general activities of each prior trip.",
        "Confirm you departed the U.S. on time during both visits and are comfortable stating that clearly.",
        "Know the expiration date of your previous B-2 visa and whether it is still valid or has expired.",
      ],
    },
    {
      lesson: "Travel Companions",
      interviewWeight: "Medium",
      memoryRisk: "Low",
      keySignals: ["Traveling alone (no companions listed)"],
      insights: [
        "Your application indicates you are traveling alone. This is coherent with a personal tourism trip, and consistent with visiting friends rather than family.",
        "Your application shows you are traveling alone. If asked about your travel arrangements, be prepared to explain your plans clearly and factually.",
      ],
      preparationPrompts: [
        "Be prepared to confirm that you are traveling alone and explain why your family is not accompanying you.",
        "Know whether your spouse and children will remain in Brazil during your trip.",
      ],
    },
    {
      lesson: "U.S. Contact Information",
      interviewWeight: "Medium–High",
      memoryRisk: "Medium",
      keySignals: [
        "Contact type: Individual",
        "Contact relationship: Friend",
        "Contact location: Brooklyn, New York",
        "Contact is not a U.S. citizen or permanent resident (per DS-160)",
      ],
      insights: [
        "Your U.S. contact is a personal friend, and you plan to stay at their residence. The officer may ask how you know this person, how long you have been in contact, and the nature of the friendship.",
        "The contact's address is the same as your intended place of stay. Be familiar with their full name and address as submitted.",
        "If this contact is also a foreign national residing in the U.S., be prepared to explain their visa or immigration status if you know it — or to say you do not know if that is the case.",
      ],
      preparationPrompts: [
        "Review the full name, address, and relationship of your U.S. contact as submitted on the DS-160.",
        "Be prepared to describe how you know this person and the history of your friendship.",
        "Know how you will be communicating with them to coordinate the visit.",
      ],
    },
    {
      lesson: "Family Roots & Ties",
      interviewWeight: "High",
      memoryRisk: "Low–Medium",
      keySignals: [
        "Marital status: Married",
        "Children: 2 (in Brazil)",
        "Spouse: Residing in Brazil",
        "Parents: Residing in Brazil",
        "No immediate family members in the United States",
        "No other relatives in the United States listed",
      ],
      insights: [
        "Your application reflects a family situation entirely based in Brazil — spouse, children, and parents are all there. This context naturally emerges from the application, and you should be comfortable discussing your family situation briefly and factually.",
        "No U.S.-based family members are listed. This is consistent with your stated U.S. contact being a friend, not a relative.",
        "Your two children and your spouse's residence in Brazil are facts of the application. Do not frame them as 'ties' or evaluate their strength — simply be prepared to describe your family accurately if asked.",
      ],
      preparationPrompts: [
        "Know the names and ages of your children and be able to state their situation in Brazil.",
        "Be prepared to describe your spouse's situation in Brazil as reflected in your application.",
        "If asked about your family, answer factually and directly — describe the situation as it is.",
      ],
    },
  ],
  crossSectionObservations: [
    "The applicant's stated purpose of tourism and visiting friends (Travel Information) is consistent with the U.S. contact being a personal friend with whom the applicant will stay (U.S. Contact Information). The officer may assess whether this relationship and the overall travel plan are coherent.",
    "Both previous U.S. visits (Previous U.S. Travel) were for tourism, matching the current stated purpose. This pattern of repeat tourism travel may prompt the officer to ask about the applicant's familiarity with the U.S. and the evolution of their relationship with their U.S. contacts over time.",
    "The applicant is traveling alone (Travel Companions) while married with two children in Brazil (Family Roots & Ties). These facts are internally consistent — the officer may briefly ask about the family situation.",
    "Your application lists your occupation as civil engineer and states that you are self-funding the trip. Be prepared to discuss your employment and how you are covering trip costs if asked.",
  ],
  interviewQuestions: [
    "What is the purpose of your visit to the United States?",
    "How long do you plan to stay, and what will you be doing during those 21 days?",
    "Who are the friends you plan to visit in Brooklyn, and how do you know them?",
    "Will you be staying at their home for the entire trip?",
    "You visited the U.S. in 2018 and again in 2021. Can you walk me through those trips?",
    "What did you do during your 2021 visit?",
    "Are you currently employed? What is your role and who do you work for?",
    "Who is traveling with you on this trip?",
    "Your spouse and children are in Brazil — can you tell me about your family situation there?",
    "How are you funding this trip?",
    "Have you ever been denied a U.S. visa or had a visa revoked?",
  ],
};

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "No file uploaded. Please attach a PDF using the upload form." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Extract text from PDF — always runs, even in mock mode
    const buffer = await file.arrayBuffer();
    const extracted = await extractTextFromPDF(buffer);

    if (!extracted.text || extracted.text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this document. Please upload your DS-160 PDF. If your document is a scanned image, it may not be readable by the current extraction method.",
        },
        { status: 422 }
      );
    }

    // ── MOCK MODE ────────────────────────────────────────────────────────────
    if (MOCK_MODE) {
      // Construct the prompt exactly as production would, then skip the API call
      const applicationText = extracted.text.slice(0, 14000);
      const userMessage = `Here is the extracted text from the DS-160 application:\n\n${applicationText}`;
      console.log(
        "[MOCK MODE] Prompt constructed. System prompt length:",
        SYSTEM_PROMPT.length,
        "| User message length:",
        userMessage.length
      );
      console.log("[MOCK MODE] Returning mock analysis — OpenAI call skipped.");
      return NextResponse.json({
        pages: extracted.pages,
        analysis: MOCK_ANALYSIS,
        _mock: true,
      });
    }
    // ── END MOCK MODE ────────────────────────────────────────────────────────

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment secrets.",
        },
        { status: 503 }
      );
    }

    // Truncate to avoid token limits — DS-160s are typically 3–8 pages
    const applicationText = extracted.text.slice(0, 14000);

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
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      throw new Error("Empty response from analysis engine.");
    }

    const analysis = JSON.parse(raw);

    return NextResponse.json({
      pages: extracted.pages,
      analysis,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("ANALYZE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to analyze document";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
