import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, orderId } = await req.json();

    if (!paymentIntentId || !orderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${pi.status}` },
        { status: 400 }
      );
    }

    // Ensure this payment intent belongs to this order
    if (pi.metadata?.orderId !== orderId) {
      return NextResponse.json({ error: "Payment intent does not match order" }, { status: 400 });
    }

    await updateOrder(orderId, { status: "PAID", paymentIntentId: pi.id });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Verify payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
