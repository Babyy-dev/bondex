/**
 * POST /api/seed
 * Seeds demo data (hotels + orders) into MongoDB.
 * Protected by Authorization: Bearer <SEED_SECRET>
 * Only inserts records that don't already exist — safe to call multiple times.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { Hotel } from "@/types";

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

    return NextResponse.json({
      ok: true,
      hotelsInserted,
      message: `Seeded ${hotelsInserted} hotels.`,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
