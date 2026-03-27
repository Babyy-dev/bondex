import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection("otps");

    const record = await coll.findOne({ email, code, used: false });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Explicitly parse expiresAt — MongoDB may return a Date object or ISO string
    const expiresAt = new Date(record.expiresAt as string | Date);
    if (isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
    }

    // Mark as used immediately (one-time use)
    await coll.updateOne({ _id: record._id }, { $set: { used: true } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
