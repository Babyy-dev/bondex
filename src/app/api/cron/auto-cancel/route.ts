import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrder } from "@/lib/db";
import { sendAutoCancelled } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Protect with a cron secret to prevent public access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getOrders();
  const nowUtc = Date.now();
  const cancelled: string[] = [];

  for (const order of orders) {
    if (order.status !== "PAID") continue;

    // Deadline: deliveryDate at 22:00 JST.
    // Japan (JST = UTC+9) has NO daylight saving time, so the offset is always fixed:
    // 22:00 JST = 13:00 UTC — this calculation is always correct for Japan.
    const parts = order.deliveryDate?.split("-").map(Number);
    if (!parts || parts.length !== 3 || parts.some(isNaN)) {
      console.warn(`[auto-cancel] Skipping ${order.id}: invalid deliveryDate "${order.deliveryDate}"`);
      continue;
    }
    const [y, m, d] = parts;
    const deadlineUtc = Date.UTC(y, m - 1, d, 13, 0, 0); // 22:00 JST = 13:00 UTC
    if (nowUtc > deadlineUtc) {
      const updated = await updateOrder(order.id, { status: "AUTO_CANCELLED" });
      cancelled.push(order.id);
      // Notify guest (non-fatal)
      if (updated) {
        sendAutoCancelled(updated).catch((err) =>
          console.error(`Auto-cancel email failed for ${order.id}:`, err)
        );
      }
    }
  }

  return NextResponse.json({ cancelled, count: cancelled.length });
}
