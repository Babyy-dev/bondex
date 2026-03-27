/**
 * MongoDB data layer — replaces the old file-based JSON store.
 * All functions are async. Function signatures are identical to the old db.ts
 * so every API route only needs `await` added to each call.
 */
import { getDb } from "./mongodb";
import type { Order, Hotel, QrTag } from "@/types";

// Helper — strip MongoDB's internal _id before returning data to callers
const NO_ID = { projection: { _id: 0 } } as const;

// ── Orders ───────────────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const db   = await getDb();
  const docs = await db.collection("orders")
    .find({}, NO_ID)
    .sort({ createdAt: -1 })
    .toArray();
  return docs as unknown as Order[];
}

export async function getOrdersByStatus(statuses: string[]): Promise<Order[]> {
  const db   = await getDb();
  const docs = await db.collection("orders")
    .find({ status: { $in: statuses } }, NO_ID)
    .sort({ createdAt: -1 })
    .toArray();
  return docs as unknown as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const db  = await getDb();
  const doc = await db.collection("orders").findOne({ id }, NO_ID);
  return doc as unknown as Order | null;
}

export async function createOrder(order: Order): Promise<Order> {
  const db = await getDb();
  await db.collection("orders").insertOne({ ...order });
  return order;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  const db  = await getDb();
  const doc = await db.collection("orders").findOneAndUpdate(
    { id },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return doc as unknown as Order | null;
}

// ── Hotels ───────────────────────────────────────────────────────────────────

export async function getHotels(): Promise<Hotel[]> {
  const db   = await getDb();
  const docs = await db.collection("hotels").find({}, NO_ID).toArray();
  return docs as unknown as Hotel[];
}

export async function getHotel(id: string): Promise<Hotel | null> {
  const db  = await getDb();
  const doc = await db.collection("hotels").findOne({ id }, NO_ID);
  return doc as unknown as Hotel | null;
}

export async function createHotel(hotel: Hotel): Promise<Hotel> {
  const db = await getDb();
  await db.collection("hotels").insertOne({ ...hotel });
  return hotel;
}

export async function updateHotel(id: string, updates: Partial<Hotel>): Promise<Hotel | null> {
  const db  = await getDb();
  const doc = await db.collection("hotels").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return doc as unknown as Hotel | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateOrderId(): string {
  // Combine timestamp + random suffix to eliminate same-millisecond collision risk
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}${rnd}`;
}

// ── QR Tags ───────────────────────────────────────────────────────────────────

export async function getQrTags(hotelId?: string): Promise<QrTag[]> {
  const db  = await getDb();
  const query = hotelId ? { hotelId } : {};
  const docs = await db.collection("qr_tags").find(query, NO_ID).sort({ createdAt: -1 }).toArray();
  return docs as unknown as QrTag[];
}

export async function getQrTag(id: string): Promise<QrTag | null> {
  const db  = await getDb();
  const doc = await db.collection("qr_tags").findOne({ id }, NO_ID);
  return doc as unknown as QrTag | null;
}

export async function createQrTags(hotelId: string, count: number): Promise<QrTag[]> {
  const db   = await getDb();
  const now  = new Date().toISOString();
  // Find highest existing tag number for this hotel
  const existing = await db.collection("qr_tags")
    .find({ hotelId }, { projection: { id: 1, _id: 0 } })
    .toArray();
  const maxNum = existing.reduce((max, t) => {
    const n = parseInt((t.id as string).replace(/\D/g, ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const tags: QrTag[] = Array.from({ length: count }, (_, i) => ({
    id: `TAG-${String(maxNum + i + 1).padStart(4, "0")}`,
    hotelId,
    status: "unused",
    createdAt: now,
  }));
  await db.collection("qr_tags").insertMany(tags.map((t) => ({ ...t })));
  return tags;
}

export async function updateQrTag(id: string, updates: Partial<QrTag>): Promise<QrTag | null> {
  const db  = await getDb();
  const doc = await db.collection("qr_tags").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return doc as unknown as QrTag | null;
}
