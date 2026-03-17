import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSizeInfo } from "@/lib/pricing";
import type { LuggageSize } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { size, sizes, orderId, guestEmail } = await req.json();

    // Support multi-item orders via `sizes` array; fall back to single `size`
    const sizeList: LuggageSize[] = Array.isArray(sizes) && sizes.length > 0
      ? sizes
      : [size as LuggageSize];

    const amount = sizeList.reduce((sum, s) => sum + getSizeInfo(s).price, 0);
    const description = sizeList.length === 1
      ? `BondEx luggage delivery – ${getSizeInfo(sizeList[0]).label} (${orderId})`
      : `BondEx luggage delivery – ${sizeList.length} items (${orderId})`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      automatic_payment_methods: { enabled: true },
      metadata: { orderId, sizes: sizeList.join(",") },
      receipt_email: guestEmail,
      description,
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
