import { NextRequest, NextResponse } from "next/server";
import { createSession, validateHotelCreds, validateAdminCreds, COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { facilityId, password, username, role } = await req.json();

  if (role === "admin") {
    if (!validateAdminCreds(username, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = await createSession({ hotelId: "admin", hotelName: "Admin", role: "admin" });
    const res   = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12 });
    return res;
  }

  const cred = validateHotelCreds(facilityId, password);
  if (!cred) {
    return NextResponse.json({ error: "Invalid facility ID or password" }, { status: 401 });
  }

  const token = await createSession({ hotelId: cred.hotelId, hotelName: cred.hotelName, role: "hotel" });
  const res   = NextResponse.json({ ok: true, hotelName: cred.hotelName });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12 });
  return res;
}
