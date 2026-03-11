import { NextRequest, NextResponse } from "next/server";
import { getHotel } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = await params;
  const hotel = await getHotel(hotelId);
  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  return NextResponse.json(hotel);
}
