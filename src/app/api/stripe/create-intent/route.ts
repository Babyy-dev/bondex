import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSizeInfo } from "@/lib/pricing";
import type { LuggageSize } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { size, orderId } = await req.json();

    const sizeInfo = getSizeInfo(size as LuggageSize);
    // Stripe requires amount in smallest currency unit.
    // JPY is zero-decimal so ¥2500 = 2500 (no multiply by 100).
    const amount = sizeInfo.price;

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      metadata: { orderId, size },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("Create payment intent error:", err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
