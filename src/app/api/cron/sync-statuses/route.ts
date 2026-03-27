import { NextRequest, NextResponse } from "next/server";
import { getOrdersByStatus, updateOrder } from "@/lib/db";
import { getShipment } from "@/lib/shipco";
import { sendHandedToCarrier, sendDelivered } from "@/lib/email";

// Ship&Co status → BondEx status mapping
const SHIPCO_TO_STATUS: Record<string, string> = {
  // Carrier has physically collected the package
  in_transit:  "IN_TRANSIT",
  picked_up:   "IN_TRANSIT",
  // Final delivery
  delivered:   "DELIVERED",
  // Carrier refused or returned
  exception:   "CARRIER_REFUSED",
  returned:    "CARRIER_REFUSED",
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only poll orders that are actively in carrier hands
  const orders = await getOrdersByStatus(["CHECKED_IN", "IN_TRANSIT"]);

  if (!Array.isArray(orders)) {
    console.error("[sync-statuses] getOrdersByStatus returned non-array");
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  const results: { orderId: string; from: string; to: string }[] = [];
  const errors:  { orderId: string; error: string }[] = [];

  for (const order of orders) {
    if (!order.shipcoShipmentId) continue;

    try {
      const shipment = await getShipment(order.shipcoShipmentId);
      const newStatus = SHIPCO_TO_STATUS[shipment.status?.toLowerCase() ?? ""];

      // No recognised transition — skip
      if (!newStatus || newStatus === order.status) continue;

      const updated = await updateOrder(order.id, {
        status: newStatus as Order["status"],
        ...(newStatus === "DELIVERED" ? { deliveredAt: new Date().toISOString() } : {}),
      });

      results.push({ orderId: order.id, from: order.status, to: newStatus });

      if (!updated) continue;

      // Fire emails non-fatally
      if (newStatus === "IN_TRANSIT") {
        sendHandedToCarrier(updated).catch((err) =>
          console.error(`[sync-statuses] handedToCarrier email failed for ${order.id}:`, err)
        );
      } else if (newStatus === "DELIVERED") {
        sendDelivered(updated).catch((err) =>
          console.error(`[sync-statuses] delivered email failed for ${order.id}:`, err)
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync-statuses] error for ${order.id}:`, msg);
      errors.push({ orderId: order.id, error: msg });
    }
  }

  return NextResponse.json({
    checked: orders.length,
    updated: results.length,
    results,
    errors,
  });
}

// Satisfy TypeScript — import Order type for the cast above
import type { Order } from "@/types";
