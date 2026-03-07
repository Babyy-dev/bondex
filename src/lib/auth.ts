import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const SECRET = new TextEncoder().encode(env.SESSION_SECRET);
const COOKIE = "bondex_session";

export interface SessionPayload {
  hotelId:  string;
  hotelName: string;
  role:     "hotel" | "admin";
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Hotel credentials (in production store hashed in DB)
// Passwords can be overridden via env vars: HOTEL_HTL001_PASS, HOTEL_HTL002_PASS
const HOTEL_CREDS: Record<string, { password: string; name: string }> = {
  "HTL-001": { password: process.env.HOTEL_HTL001_PASS ?? "demo123", name: "Sakura Hotel Shinjuku" },
  "HTL-002": { password: process.env.HOTEL_HTL002_PASS ?? "demo123", name: "Maple Inn Asakusa" },
};

// Admin credentials from env vars — falls back to demo values in development only
const ADMIN_CREDS = {
  username: process.env.ADMIN_USERNAME ?? "admin",
  password: process.env.ADMIN_PASSWORD ?? "admin123",
};

export function validateHotelCreds(id: string, password: string) {
  const cred = HOTEL_CREDS[id];
  if (!cred || cred.password !== password) return null;
  return { hotelId: id, hotelName: cred.name };
}

export function validateAdminCreds(username: string, password: string) {
  return username === ADMIN_CREDS.username && password === ADMIN_CREDS.password;
}

export { COOKIE };
