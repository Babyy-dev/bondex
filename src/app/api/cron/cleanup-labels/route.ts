import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrder } from "@/lib/db";

// 30 days in milliseconds
const LABEL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await getOrders();
    const now = Date.now();
    let cleaned = 0;

    for (const order of orders) {
      if (!order.labelUrl && !order.shipcoShipmentId) continue;
      if (!order.checkedInAt) continue;
      const checkedInTime = new Date(order.checkedInAt).getTime();
      if (now - checkedInTime < LABEL_RETENTION_MS) continue;
      const result = await updateOrder(order.id, { labelUrl: undefined, shipcoShipmentId: undefined });
      if (result) cleaned++;
      else console.warn(`[cleanup-labels] updateOrder returned null for ${order.id}`);
    }

    return NextResponse.json({ ok: true, cleaned, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Label cleanup error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
