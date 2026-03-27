import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrder } from "@/lib/db";

// 7 days in milliseconds
const PHOTO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await getOrders();
    const now = Date.now();
    let cleaned = 0;

    for (const order of orders) {
      if (order.status !== "DELIVERED") continue;
      if (!order.photoUrls || order.photoUrls.length === 0) continue;

      // Use updatedAt as proxy for delivery time if no specific deliveredAt field
      const deliveredAt = new Date(order.updatedAt).getTime();
      if (now - deliveredAt < PHOTO_RETENTION_MS) continue;

      await updateOrder(order.id, { photoUrls: [] });
      cleaned++;
    }

    return NextResponse.json({ ok: true, cleaned, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Photo cleanup error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
