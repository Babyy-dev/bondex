import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { createShipment } from "@/lib/shipco";
import { sendCheckinComplete } from "@/lib/email";

// Called when hotel staff scans QR + takes photo
export async function POST(req: NextRequest) {
  try {
    const { orderId, photoUrls } = await req.json();

    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: `Cannot check in order with status ${order.status}` },
        { status: 400 }
      );
    }

    // Create Ship&Co shipment and get label
    const fromAddress = {
      full_name: "BondEx Staff",
      company: order.fromHotel,
      address1: "1-2-3 Kabukicho",
      city: "Shinjuku",
      state: "Tokyo",
      zip: "160-0021",
      country: "JP",
      phone: "0312345678",
    };

    const toAddress = {
      full_name: order.toAddress.recipientName,
      company: order.toAddress.facilityName,
      address1: order.toAddress.street,
      address2: order.toAddress.building,
      city: order.toAddress.city,
      state: order.toAddress.prefecture,
      zip: order.toAddress.postalCode,
      country: "JP",
      phone: order.guestPhone,
    };

    let shipmentResult;
    let labelUrl: string | undefined;
    let trackingNumber: string | undefined;
    let carrier: string | undefined;

    try {
      shipmentResult = await createShipment({
        fromAddress,
        toAddress,
        size: order.size,
        deliveryDate: order.deliveryDate,
        orderId: order.id,
        guestName: order.guestName,
        checkInDate: new Date().toISOString().split("T")[0],
      });
      labelUrl = shipmentResult.label_url;
      trackingNumber = shipmentResult.tracking_number;
      carrier = shipmentResult.carrier ?? "Yamato Transport";
    } catch (shipcoErr) {
      console.error("Ship&Co error (non-fatal for demo):", shipcoErr);
      // In demo mode – generate a mock label
      labelUrl = `/api/labels/mock/${orderId}`;
      trackingNumber = `DEMO-${Date.now()}`;
      carrier = "Yamato Transport";
    }

    const updated = await updateOrder(orderId, {
      status: "CHECKED_IN",
      checkedInAt: new Date().toISOString(),
      photoUrls: [...(order.photoUrls ?? []), ...(photoUrls ?? [])],
      labelUrl,
      trackingNumber,
      carrier,
      shipcoShipmentId: shipmentResult?.id,
    });

    // Send check-in email (non-fatal)
    if (updated) {
      sendCheckinComplete(updated).catch((err) =>
        console.error("Check-in email failed:", err)
      );
    }

    return NextResponse.json({ order: updated, labelUrl, trackingNumber });
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
