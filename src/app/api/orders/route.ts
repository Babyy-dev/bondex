import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getOrders, generateOrderId } from "@/lib/db";
import { sendBookingConfirmed } from "@/lib/email";
import type { Order } from "@/types";

const CreateOrderSchema = z.object({
  size: z.enum(["S", "M", "L", "LL"]),
  fromHotel: z.string().optional(),
  fromHotelId: z.string().optional(),
  toAddress: z.object({
    recipientName: z.string().min(1),
    facilityName: z.string().optional(),
    street: z.string().min(1),
    building: z.string().optional(),
    city: z.string().min(1),
    prefecture: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().optional(),
  }),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "deliveryDate must be YYYY-MM-DD"),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().default(""),
  basePrice: z.number().int().positive(),
  destinationType: z.enum(["hotel", "airport", "depot", "station", "other"]).default("hotel"),
  conditionPhotos: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const hotelId = searchParams.get("hotelId");

  let orders = await getOrders();
  if (status)  orders = orders.filter((o) => o.status === status);
  if (hotelId) orders = orders.filter((o) => o.fromHotelId === hotelId);
  const paymentFailed = searchParams.get("paymentFailed");
  if (paymentFailed === "true") orders = orders.filter((o) => o.paymentFailed === true);

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = CreateOrderSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const body = parsed.data;

    const order: Order = {
      id: generateOrderId(),
      status: "CREATED",
      size: body.size,
      fromHotel: body.fromHotel ?? "Sakura Hotel Shinjuku",
      fromHotelId: body.fromHotelId,
      toAddress: body.toAddress,
      deliveryDate: body.deliveryDate,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      basePrice: body.basePrice,
      totalPrice: body.basePrice,
      photoUrls: body.conditionPhotos ?? [],
      destinationType: body.destinationType ?? "hotel",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      qrCode: "",
    };

    order.qrCode = order.id;
    await createOrder(order);

    // Send confirmation email (non-fatal)
    sendBookingConfirmed(order).catch((err) =>
      console.error("Booking confirmation email failed:", err)
    );

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
