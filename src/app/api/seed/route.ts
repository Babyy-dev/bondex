/**
 * POST /api/seed
 * Seeds demo data (hotels + orders) into MongoDB.
 * Protected by Authorization: Bearer <SEED_SECRET>
 * Only inserts records that don't already exist — safe to call multiple times.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { Order, Hotel } from "@/types";

const SEED_SECRET = process.env.SEED_SECRET ?? process.env.CRON_SECRET;

const DEMO_HOTELS: Hotel[] = [
  {
    id: "HTL-001",
    name: "Sakura Hotel",
    branchName: "Shinjuku",
    address: "1-2-3 Kabukicho, Shinjuku, Tokyo",
    status: "active",
    dailyOrderCount: 12,
    carrier: "yamato",
    cutoffTime: "17:00",
    printerType: "bluetooth_thermal",
    labelSize: "62mm",
  },
  {
    id: "HTL-002",
    name: "Maple Inn",
    branchName: "Asakusa",
    address: "2-5-8 Asakusa, Taito, Tokyo",
    status: "active",
    dailyOrderCount: 7,
    carrier: "sagawa",
    cutoffTime: "16:00",
    printerType: "bluetooth_thermal",
    labelSize: "62mm",
  },
];

function makeDemoOrders(): Order[] {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dayAfter  = new Date(Date.now() + 172800000).toISOString().split("T")[0];

  return [
    {
      id: "ORD-DEMO1",
      status: "PAID",
      size: "M",
      fromHotel: "Sakura Hotel Shinjuku",
      fromHotelId: "HTL-001",
      toAddress: {
        facilityName: "Narita Airport Terminal 2",
        postalCode: "282-0004",
        prefecture: "Chiba",
        city: "Narita",
        street: "1-1 Furugome",
        recipientName: "John Smith",
      },
      deliveryDate: tomorrow,
      guestName: "John Smith",
      guestEmail: "john@example.com",
      guestPhone: "+1-555-0100",
      basePrice: 2000,
      totalPrice: 2000,
      destinationType: "airport",
      qrCode: "ORD-DEMO1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "ORD-DEMO2",
      status: "CHECKED_IN",
      size: "L",
      fromHotel: "Sakura Hotel Shinjuku",
      fromHotelId: "HTL-001",
      toAddress: {
        facilityName: "Kyoto Grand Hotel",
        postalCode: "600-8216",
        prefecture: "Kyoto",
        city: "Kyoto",
        street: "Kawaramachi",
        recipientName: "Emma Johnson",
      },
      deliveryDate: dayAfter,
      guestName: "Emma Johnson",
      guestEmail: "emma@example.com",
      guestPhone: "+44-20-7946-0958",
      basePrice: 2800,
      totalPrice: 2800,
      trackingNumber: "1234-5678-9012",
      carrier: "Yamato Transport",
      destinationType: "hotel",
      labelUrl: "/api/labels/mock/ORD-DEMO2",
      qrCode: "ORD-DEMO2",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (!SEED_SECRET || auth !== `Bearer ${SEED_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Ensure unique indexes
    await db.collection("orders").createIndex({ id: 1 }, { unique: true });
    await db.collection("hotels").createIndex({ id: 1 }, { unique: true });

    // Seed hotels (skip any that already exist)
    let hotelsInserted = 0;
    for (const hotel of DEMO_HOTELS) {
      const exists = await db.collection("hotels").findOne({ id: hotel.id });
      if (!exists) {
        await db.collection("hotels").insertOne({ ...hotel });
        hotelsInserted++;
      }
    }

    // Seed demo orders (skip any that already exist)
    let ordersInserted = 0;
    for (const order of makeDemoOrders()) {
      const exists = await db.collection("orders").findOne({ id: order.id });
      if (!exists) {
        await db.collection("orders").insertOne({ ...order });
        ordersInserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      hotelsInserted,
      ordersInserted,
      message: `Seeded ${hotelsInserted} hotels and ${ordersInserted} orders.`,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
