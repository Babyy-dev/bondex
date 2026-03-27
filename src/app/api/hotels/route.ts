import { NextRequest, NextResponse } from "next/server";
import { getHotels, createHotel } from "@/lib/db";
import type { Hotel } from "@/types";

export async function GET() {
  return NextResponse.json(await getHotels());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Hotel name is required" }, { status: 422 });
    }
    if (body.carrier && !["yamato", "sagawa"].includes(body.carrier)) {
      return NextResponse.json({ error: "carrier must be 'yamato' or 'sagawa'" }, { status: 422 });
    }

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
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      collectionMethod: body.collectionMethod,
      sameDayDelivery: body.sameDayDelivery,
      maxDailyItems: body.maxDailyItems,
      storageLocation: body.storageLocation,
      operationalNotes: body.operationalNotes,
    };
    await createHotel(hotel);
    return NextResponse.json(hotel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create hotel" }, { status: 500 });
  }
}
