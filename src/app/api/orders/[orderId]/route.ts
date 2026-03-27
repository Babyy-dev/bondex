import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { sendHandedToCarrier, sendDelivered, sendExceptionAlert } from "@/lib/email";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const updates = await req.json();
    const prevOrder = await getOrder(orderId);
    const order = await updateOrder(orderId, updates);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Trigger emails on status transitions
    if (updates.status && prevOrder && updates.status !== prevOrder.status) {
      if (updates.status === "HANDED_TO_CARRIER" || updates.status === "IN_TRANSIT") {
        sendHandedToCarrier(order).catch(console.error);
      }
      if (updates.status === "DELIVERED") {
        sendDelivered(order).catch(console.error);
      }
    }
    // Flag alert to CS
    if (updates.flagged === true && !prevOrder?.flagged) {
      sendExceptionAlert(order).catch(console.error);
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error("Update order error:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
