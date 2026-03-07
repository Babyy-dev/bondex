import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/db";

/**
 * Generates a mock shipping label PDF for demo purposes.
 * In production this returns the actual Ship&Co label PDF URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Return an SVG-based mock label as PDF-like response
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <rect width="400" height="600" fill="white" stroke="#000" stroke-width="2"/>
  <rect x="10" y="10" width="380" height="80" fill="#000"/>
  <text x="200" y="55" text-anchor="middle" fill="white" font-size="28" font-family="monospace" font-weight="bold">BondEx</text>
  <text x="200" y="80" text-anchor="middle" fill="white" font-size="14" font-family="monospace">Luggage Delivery Label</text>

  <text x="20" y="120" font-size="12" font-family="monospace" font-weight="bold">ORDER ID:</text>
  <text x="20" y="140" font-size="16" font-family="monospace">${order.id}</text>

  <text x="20" y="175" font-size="12" font-family="monospace" font-weight="bold">FROM:</text>
  <text x="20" y="195" font-size="13" font-family="monospace">${order.fromHotel}</text>

  <text x="20" y="230" font-size="12" font-family="monospace" font-weight="bold">TO:</text>
  <text x="20" y="250" font-size="13" font-family="monospace">${order.toAddress.facilityName ?? ""}</text>
  <text x="20" y="270" font-size="11" font-family="monospace">${order.toAddress.recipientName}</text>
  <text x="20" y="288" font-size="11" font-family="monospace">${order.toAddress.city}, ${order.toAddress.prefecture} ${order.toAddress.postalCode}</text>

  <text x="20" y="320" font-size="12" font-family="monospace" font-weight="bold">SIZE: ${order.size}</text>
  <text x="20" y="342" font-size="12" font-family="monospace">DELIVERY DATE: ${order.deliveryDate}</text>

  <text x="20" y="380" font-size="12" font-family="monospace" font-weight="bold">TRACKING:</text>
  <text x="20" y="400" font-size="14" font-family="monospace">${order.trackingNumber ?? "Pending"}</text>

  <!-- Barcode placeholder -->
  <rect x="20" y="430" width="360" height="80" fill="#f0f0f0" stroke="#ccc"/>
  <text x="200" y="475" text-anchor="middle" font-size="11" font-family="monospace" fill="#666">[ Barcode: ${order.trackingNumber ?? order.id} ]</text>

  <text x="200" y="565" text-anchor="middle" font-size="10" font-family="monospace" fill="#999">BondEx – Japan Luggage Delivery Service</text>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="label-${orderId}.svg"`,
    },
  });
}
