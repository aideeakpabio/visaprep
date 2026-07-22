/**
 * Email sending via Resend.
 * If RESEND_API_KEY is not set (dev / CI), the OTP is logged to the server
 * console only — no email is sent. This allows the system to be tested
 * locally without a live Resend account.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "VisaPrep <noreply@visaprep.ng>";

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev fallback — print to server console so developers can test the flow
    console.log(`[email/dev] OTP for ${email}: ${otp}`);
    return;
  }

  const body = {
    from: FROM_ADDRESS,
    to: [email],
    subject: "Your VisaPrep sign-in code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Sign in to VisaPrep</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
          Enter the code below to access your preparation materials. The code expires in 15 minutes.
        </p>
        <div style="background:#f3f4f6;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#111827;">${otp}</span>
        </div>
        <p style="color:#9ca3af;font-size:12px;">
          If you did not request this code, you can safely ignore this email. Do not share this code with anyone.
        </p>
      </div>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[email] Resend returned HTTP ${res.status}: ${text}`);
    throw new Error("Failed to send verification email. Please try again.");
  }
}
