import { NextRequest, NextResponse } from "next/server";
import { getHotel, updateHotel } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = await params;
  const hotel = await getHotel(hotelId);
  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  return NextResponse.json(hotel);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ hotelId: string }> }) {
  try {
    const { hotelId } = await params;
    const updates = await req.json();
    if (updates.carrier && !["yamato", "sagawa"].includes(updates.carrier)) {
      return NextResponse.json({ error: "carrier must be 'yamato' or 'sagawa'" }, { status: 422 });
    }
    const hotel = await updateHotel(hotelId, updates);
    if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    return NextResponse.json(hotel);
  } catch (err) {
    console.error("Update hotel error:", err);
    return NextResponse.json({ error: "Failed to update hotel" }, { status: 500 });
  }
}
