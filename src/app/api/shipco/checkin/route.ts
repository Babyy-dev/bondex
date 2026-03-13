import { NextRequest, NextResponse } from "next/server";
import { getOrder, getHotel, updateOrder } from "@/lib/db";
import { createShipment } from "@/lib/shipco";
import { sendCheckinComplete } from "@/lib/email";

// Called when hotel staff scans QR + takes photo
export async function POST(req: NextRequest) {
  try {
    const { orderId, photoUrls } = await req.json();

    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.status !== "PAID") {
      const statusMsg: Record<string, string> = {
        CREATED:          "Payment not yet received for this order",
        CHECKED_IN:       "This order has already been checked in",
        HANDED_TO_CARRIER:"This order has already been handed to the carrier",
        IN_TRANSIT:       "This order is already in transit",
        DELIVERED:        "This order has already been delivered",
        AUTO_CANCELLED:   "This order was automatically cancelled",
        CARRIER_REFUSED:  "This order was refused by the carrier",
      };
      return NextResponse.json(
        { error: statusMsg[order.status] ?? `Cannot check in order with status ${order.status}` },
        { status: 400 }
      );
    }

    // Fetch hotel to get real pickup address
    const hotel = order.fromHotelId ? await getHotel(order.fromHotelId) : null;

    const fromAddress = {
      full_name: "BondEx Staff",
      company:   hotel ? [hotel.name, hotel.branchName].filter(Boolean).join(" ") : order.fromHotel,
      address1:  hotel?.addressLine1 ?? hotel?.address ?? "1-2-3 Kabukicho",
      city:      hotel?.city       ?? "Shinjuku",
      state:     hotel?.prefecture ?? "Tokyo",
      zip:       hotel?.postalCode ?? "160-0021",
      country:   "JP",
      phone:     hotel?.contactPhone ?? "0312345678",
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
