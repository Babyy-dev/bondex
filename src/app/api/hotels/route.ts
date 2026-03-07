import { NextRequest, NextResponse } from "next/server";
import { getHotels, createHotel } from "@/lib/db";
import type { Hotel } from "@/types";

export async function GET() {
  return NextResponse.json(getHotels());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hotel: Hotel = {
      id: `HTL-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      branchName: body.branchName,
      address: body.address,
      status: "active",
      dailyOrderCount: 0,
      carrier: body.carrier ?? "yamato",
      cutoffTime: body.cutoffTime ?? "17:00",
      printerType: body.printerType ?? "bluetooth_thermal",
      labelSize: body.labelSize ?? "62mm",
    };
    createHotel(hotel);
    return NextResponse.json(hotel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create hotel" }, { status: 500 });
  }
}
