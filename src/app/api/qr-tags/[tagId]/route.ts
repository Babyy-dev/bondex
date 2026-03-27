import { NextRequest, NextResponse } from "next/server";
import { getQrTag, updateQrTag } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;
  const tag = await getQrTag(tagId);
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  return NextResponse.json(tag);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;
  const updates = await req.json();
  const tag = await updateQrTag(tagId, updates);
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  return NextResponse.json(tag);
}
