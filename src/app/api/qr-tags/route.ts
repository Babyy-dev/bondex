import { NextRequest, NextResponse } from "next/server";
import { getQrTags, createQrTags } from "@/lib/db";

export async function GET(req: NextRequest) {
  const hotelId = new URL(req.url).searchParams.get("hotelId") ?? undefined;
  const tags = await getQrTags(hotelId);
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  try {
    const { hotelId, count = 10 } = await req.json();
    if (!hotelId) return NextResponse.json({ error: "hotelId required" }, { status: 400 });
    const tags = await createQrTags(hotelId, Math.min(count, 100));
    return NextResponse.json(tags, { status: 201 });
  } catch (err) {
    console.error("Create QR tags error:", err);
    return NextResponse.json({ error: "Failed to create tags" }, { status: 500 });
  }
}
