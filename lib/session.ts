import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "vp_session";
const SESSION_DURATION_DAYS = 7;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  email: string;
  verifiedAt: string;
}

export async function createSessionCookie(email: string): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({ email, verifiedAt: new Date().toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(secret);
  return token;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.email !== "string" || typeof payload.verifiedAt !== "string") {
      return null;
    }
    return { email: payload.email, verifiedAt: payload.verifiedAt };
  } catch {
    return null;
  }
}

/** Read and verify the vp_session cookie from the current request. */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_DURATION_DAYS };
