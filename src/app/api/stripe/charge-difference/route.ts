import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrder, updateOrder } from "@/lib/db";
import { getSizeInfo } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-02-25.clover" as never,
});

export async function POST(req: NextRequest) {
  try {
    const { orderId, newSize } = await req.json();
    const order = getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const diff = getSizeInfo(newSize).price - getSizeInfo(order.size).price;
    if (diff <= 0) {
      // No charge needed — just update size in DB
      updateOrder(orderId, { size: newSize });
      return NextResponse.json({ charged: false, message: "Size downgraded — no charge per policy" });
    }

    if (!order.paymentIntentId) {
      // No payment intent stored — update DB only (demo/manual order)
      updateOrder(orderId, { size: newSize, totalPrice: order.totalPrice + diff });
      return NextResponse.json({ charged: false, message: "No payment intent on record — DB updated only" });
    }

    // Retrieve the original payment intent to get payment method
    const originalPi = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    const paymentMethod = originalPi.payment_method as string | null;
    const customer      = originalPi.customer as string | null;

    if (!paymentMethod) {
      updateOrder(orderId, { size: newSize, totalPrice: order.totalPrice + diff });
      return NextResponse.json({ charged: false, message: "No payment method on record — DB updated only" });
    }

    // Charge the difference off-session
    const pi = await stripe.paymentIntents.create({
      amount: diff,
      currency: "jpy",
      customer: customer ?? undefined,
      payment_method: paymentMethod,
      confirm: true,
      off_session: true,
      description: `BondEx size adjustment ${order.size}→${newSize} (${orderId})`,
      metadata: { orderId, originalSize: order.size, newSize },
    });

    updateOrder(orderId, {
      size: newSize,
      totalPrice: order.totalPrice + diff,
      paymentIntentId: pi.id,
    });

    return NextResponse.json({ charged: true, amount: diff, paymentIntentId: pi.id });
  } catch (err: unknown) {
    console.error("Charge difference error:", err);
    const message = err instanceof Error ? err.message : "Charge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
