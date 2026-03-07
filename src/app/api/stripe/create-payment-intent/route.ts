import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSizeInfo } from "@/lib/pricing";
import type { LuggageSize } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { size, orderId, guestEmail } = await req.json();

    const sizeInfo = getSizeInfo(size as LuggageSize);
    const amount = sizeInfo.price; // JPY – already smallest unit

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      automatic_payment_methods: { enabled: true },
      metadata: { orderId, size },
      receipt_email: guestEmail,
      description: `BondEx luggage delivery – ${sizeInfo.label} (${orderId})`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
    });
  } catch (err: unknown) {
    console.error("Create payment intent error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
