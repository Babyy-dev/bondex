import { NextRequest, NextResponse } from "next/server";
import { createOrder, getOrders, generateOrderId } from "@/lib/db";
import { sendBookingConfirmed } from "@/lib/email";
import type { Order } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const hotelId = searchParams.get("hotelId");

  let orders = await getOrders();
  if (status)  orders = orders.filter((o) => o.status === status);
  if (hotelId) orders = orders.filter((o) => o.fromHotelId === hotelId);

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
