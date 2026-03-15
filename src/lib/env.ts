/**
 * Centralized server-side environment variable validation.
 * This file is imported by lib/stripe.ts, lib/auth.ts, lib/shipco.ts, lib/email.ts.
 * Any missing critical variable throws at module load time — caught during `next build`
 * or on first server start, not buried in a runtime error mid-request.
 *
 * IMPORTANT: This file must NEVER be imported by any "use client" component.
 * It runs server-side only.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[BondEx] Missing required environment variable: ${name}\n` +
      `Add it to .env.local — see .env.example for reference.`
    );
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// ── Critical — app will not start without these ───────────────────────────

export const env = {
  // Database
  MONGODB_URI: requireEnv("MONGODB_URI"),

  // Auth
  SESSION_SECRET: requireEnv("SESSION_SECRET"),

  // Stripe (required for payments)
  STRIPE_SECRET_KEY:     requireEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optionalEnv("STRIPE_WEBHOOK_SECRET"), // optional — only needed for webhook verification

  // Ship&Co (optional — falls back to mock label if missing)
  SHIPCO_API_KEY:      optionalEnv("SHIPCO_API_KEY"),
  SHIPCO_API_BASE_URL: optionalEnv("SHIPCO_API_BASE_URL", "https://app.shipandco.com/api/v1"),
  PROXY_SECRET:        optionalEnv("PROXY_SECRET"),

  // SMTP (optional — emails logged to console if missing)
  SMTP_HOST: optionalEnv("SMTP_HOST"),
  SMTP_PORT: optionalEnv("SMTP_PORT", "587"),
  SMTP_USER: optionalEnv("SMTP_USER"),
  SMTP_PASS: optionalEnv("SMTP_PASS"),
  SMTP_FROM: optionalEnv("SMTP_FROM", "BondEx <noreply@bondex.jp>"),

  // App URL
  APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
} as const;
