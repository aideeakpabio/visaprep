import { queryOne } from "./db";

interface ApplicationRow {
  analysis_id: string;
  email: string | null;
  premium_unlocked: boolean;
  payment_status: string;
  practice_session_limit: number;
  practice_sessions_used: number;
  practice_expires_at: string | null;
  practice_access_started_at: string | null;
}

/** Normalise email for comparison — lowercase, trimmed. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True if the verified email owns this application AND it is paid. */
export async function canAccessPremium(
  analysisId: string,
  verifiedEmail: string
): Promise<{ allowed: boolean; reason?: string }> {
  const row = await queryOne<ApplicationRow>(
    "SELECT * FROM applications WHERE analysis_id = $1",
    [analysisId]
  );

  if (!row) return { allowed: false, reason: "Application not found." };

  if (!row.email) return { allowed: false, reason: "No email linked to this application." };

  if (normalizeEmail(row.email) !== normalizeEmail(verifiedEmail)) {
    return { allowed: false, reason: "Email does not match this application." };
  }

  if (!row.premium_unlocked || row.payment_status !== "paid") {
    return { allowed: false, reason: "Premium access has not been purchased for this application." };
  }

  return { allowed: true };
}

/** True if canAccessPremium AND practice period is active AND sessions remain. */
export async function canStartPractice(
  analysisId: string,
  verifiedEmail: string
): Promise<{ allowed: boolean; reason?: string; expired?: boolean; exhausted?: boolean }> {
  const premiumCheck = await canAccessPremium(analysisId, verifiedEmail);
  if (!premiumCheck.allowed) return premiumCheck;

  const row = await queryOne<ApplicationRow>(
    "SELECT * FROM applications WHERE analysis_id = $1",
    [analysisId]
  );

  if (!row) return { allowed: false, reason: "Application not found." };

  const now = new Date();

  if (row.practice_expires_at && new Date(row.practice_expires_at) < now) {
    return { allowed: false, reason: "Your practice period has ended.", expired: true };
  }

  if (row.practice_sessions_used >= row.practice_session_limit) {
    return { allowed: false, reason: "You have used all your practice sessions.", exhausted: true };
  }

  return { allowed: true };
}
