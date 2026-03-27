import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { env } from "@/lib/env";
import nodemailer from "nodemailer";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SENDS_PER_HOUR = 5;

function generateOTP(): string {
  // Cryptographically random 6-digit code
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, "0");
}

function getTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection("otps");

    // Ensure TTL index exists (idempotent)
    await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });

    // Rate limit: max 5 sends per email in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await coll.countDocuments({
      email,
      createdAt: { $gte: oneHourAgo },
    });
    if (recentCount >= MAX_SENDS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting a new code." },
        { status: 429 }
      );
    }

    // Invalidate any existing unused codes for this email
    await coll.updateMany(
      { email, used: false },
      { $set: { used: true } }
    );

    // Generate and store new OTP
    const code = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    await coll.insertOne({
      email,
      code,
      createdAt: now,
      expiresAt,
      used: false,
    });

    // Send email
    const transport = getTransport();
    if (transport) {
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: "BondEx – Your verification code",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
            <h1 style="font-size:22px;color:#1A120B;margin-bottom:4px;">Verification code</h1>
            <p style="color:#8B7355;margin-bottom:24px;">Enter this code to confirm your booking on BondEx.</p>
            <div style="background:#1A120B;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
              <p style="margin:0;letter-spacing:0.4em;font-size:36px;font-weight:700;color:#ffffff;font-family:monospace;">${code}</p>
            </div>
            <p style="color:#8B7355;font-size:13px;">This code expires in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
            <p style="font-size:11px;color:#B0A090;text-align:center;margin-top:24px;">BondEx – Japan Luggage Delivery</p>
          </div>
        `,
      });
    } else {
      // No SMTP — log to console for local dev
      console.log(`[OTP] ${email} → code: ${code} (expires ${expiresAt.toISOString()})`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
