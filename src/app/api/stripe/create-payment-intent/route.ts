import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSizeInfo, getZone, calculatePriceWithZone } from "@/lib/pricing";
import { getOrder, getHotel } from "@/lib/db";
import type { LuggageSize } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { size, sizes, orderId, guestEmail, fromPostal: reqFromPostal, toPostal: reqToPostal } = await req.json();

    // Support multi-item orders via `sizes` array; fall back to single `size`
    const sizeList: LuggageSize[] = Array.isArray(sizes) && sizes.length > 0
      ? sizes
      : [size as LuggageSize];

    // Look up postal codes from DB when not provided by client
    let fromPostal = reqFromPostal ?? "";
    let toPostal = reqToPostal ?? "";
    if (orderId && (!fromPostal || !toPostal)) {
      const order = await getOrder(orderId).catch(() => null);
      if (order) {
        if (!toPostal) toPostal = order.toAddress?.postalCode ?? "";
        if (!fromPostal && order.fromHotelId) {
          const hotel = await getHotel(order.fromHotelId).catch(() => null);
          if (hotel?.postalCode) fromPostal = hotel.postalCode;
        }
      }
    }

    // Calculate zone if postal codes are available; default to zone 1
    const zone = fromPostal && toPostal ? getZone(fromPostal, toPostal) : 1;

    // Sum prices with zone surcharge applied per item
    const amount = sizeList.reduce((sum, s) => {
      const { base } = calculatePriceWithZone(s, zone);
      return sum + base;
    }, 0);

    const description = sizeList.length === 1
      ? `BondEx luggage delivery – ${getSizeInfo(sizeList[0]).label} (${orderId})`
      : `BondEx luggage delivery – ${sizeList.length} items (${orderId})`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "jpy",
        automatic_payment_methods: { enabled: true },
        metadata: { orderId, sizes: sizeList.join(","), zone: String(zone) },
        receipt_email: guestEmail,
        description,
      },
      // Idempotency key prevents duplicate charges on client-side retries
      orderId ? { idempotencyKey: `pi-${orderId}-${sizeList.join("-")}` } : undefined
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      zone,
    });
  } catch (err: unknown) {
    console.error("Create payment intent error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
