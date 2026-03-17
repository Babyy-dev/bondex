import { NextRequest, NextResponse } from "next/server";
import { getOrder, getHotel, updateOrder } from "@/lib/db";
import { createShipment } from "@/lib/shipco";
import { sendCheckinComplete } from "@/lib/email";
import { getSession } from "@/lib/auth";

// Called when hotel staff scans QR + takes photo
export async function POST(req: NextRequest) {
  try {
    const { orderId, photoUrls } = await req.json();
    const session = await getSession();

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

    // Require complete hotel address for label generation
    const address1 = hotel?.addressLine1 ?? hotel?.address;
    const city = hotel?.city;
    const state = hotel?.prefecture;
    const zip = hotel?.postalCode;
    const phone = hotel?.contactPhone;

    if (!address1 || !city || !state || !zip) {
      return NextResponse.json(
        { error: "Hotel address is incomplete. Update hotel profile before check-in." },
        { status: 422 }
      );
    }

    const fromAddress = {
      full_name: "BondEx Staff",
      company: hotel ? [hotel.name, hotel.branchName].filter(Boolean).join(" ") : order.fromHotel,
      address1,
      city,
      state,
      zip,
      country: "JP",
      phone: phone ?? "",
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

    // Map hotel carrier slug to Ship&Co carrier code
    const CARRIER_CODES: Record<string, string> = {
      yamato: "yamato_business",
      sagawa: "sagawa_yu_pack",
    };
    const carrierCode = hotel?.carrier ? CARRIER_CODES[hotel.carrier] : undefined;

    const shipmentResult = await createShipment({
      fromAddress,
      toAddress,
      size: order.size,
      deliveryDate: order.deliveryDate,
      orderId: order.id,
      guestName: order.guestName,
      checkInDate: new Date().toISOString().split("T")[0],
      carrier: carrierCode,
    });

    const labelUrl = shipmentResult.label_url;
    const trackingNumber = shipmentResult.tracking_number;
    const carrier = shipmentResult.carrier ?? "Yamato Transport";

    const updated = await updateOrder(orderId, {
      status: "CHECKED_IN",
      checkedInAt: new Date().toISOString(),
      photoUrls: [...(order.photoUrls ?? []), ...(photoUrls ?? [])],
      labelUrl,
      trackingNumber,
      carrier,
      shipcoShipmentId: shipmentResult.id,
      // Assign hotel if not already set (e.g. booking made without hotel URL param)
      ...(!order.fromHotelId && session?.hotelId ? { fromHotelId: session.hotelId } : {}),
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
