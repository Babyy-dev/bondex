/**
 * File-based JSON database — persists to .data/db.json
 * No external service needed. Replace with Prisma + PostgreSQL for production scale.
 */
import fs   from "fs";
import path from "path";
import type { Order, Hotel } from "@/types";

const DATA_DIR  = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface DbShape { orders: Order[]; hotels: Hotel[] }

const SEED: DbShape = {
  orders: [
    {
      id: "ORD-DEMO1", status: "PAID", size: "M",
      fromHotel: "Sakura Hotel Shinjuku",
      toAddress: { facilityName: "Narita Airport Terminal 2", postalCode: "282-0004", prefecture: "Chiba", city: "Narita", street: "1-1 Furugome", recipientName: "John Smith" },
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      guestName: "John Smith", guestEmail: "john@example.com", guestPhone: "+1-555-0100",
      basePrice: 2000, totalPrice: 2000, destinationType: "airport",
      qrCode: "ORD-DEMO1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: "ORD-DEMO2", status: "CHECKED_IN", size: "L",
      fromHotel: "Sakura Hotel Shinjuku",
      toAddress: { facilityName: "Kyoto Grand Hotel", postalCode: "600-8216", prefecture: "Kyoto", city: "Kyoto", street: "Kawaramachi", recipientName: "Emma Johnson" },
      deliveryDate: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      guestName: "Emma Johnson", guestEmail: "emma@example.com", guestPhone: "+44-20-7946-0958",
      basePrice: 2800, totalPrice: 2800, trackingNumber: "1234-5678-9012", carrier: "Yamato Transport",
      destinationType: "hotel", labelUrl: "/api/labels/mock/ORD-DEMO2",
      qrCode: "ORD-DEMO2", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
  hotels: [
    {
      id: "HTL-001", name: "Sakura Hotel", branchName: "Shinjuku",
      address: "1-2-3 Kabukicho, Shinjuku, Tokyo", status: "active",
      dailyOrderCount: 12, carrier: "yamato", cutoffTime: "17:00",
      printerType: "bluetooth_thermal", labelSize: "62mm",
    },
    {
      id: "HTL-002", name: "Maple Inn", branchName: "Asakusa",
      address: "2-5-8 Asakusa, Taito, Tokyo", status: "active",
      dailyOrderCount: 7, carrier: "sagawa", cutoffTime: "16:00",
      printerType: "bluetooth_thermal", labelSize: "62mm",
    },
  ],
};

function read(): DbShape {
  try {
    if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) { write(SEED); return structuredClone(SEED); }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return structuredClone(SEED);
  }
}

function write(data: DbShape) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("DB write error:", e);
  }
}

// ── Orders ──────────────────────────────────────────────────────────────────

export function getOrders(): Order[] { return read().orders; }

export function getOrder(id: string): Order | undefined {
  return read().orders.find((o) => o.id === id);
}

export function createOrder(order: Order): Order {
  const db = read();
  db.orders.push(order);
  write(db);
  return order;
}

export function updateOrder(id: string, updates: Partial<Order>): Order | undefined {
  const db  = read();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  db.orders[idx] = { ...db.orders[idx], ...updates, updatedAt: new Date().toISOString() };
  write(db);
  return db.orders[idx];
}

// ── Hotels ───────────────────────────────────────────────────────────────────

export function getHotels(): Hotel[] { return read().hotels; }

export function getHotel(id: string): Hotel | undefined {
  return read().hotels.find((h) => h.id === id);
}

export function createHotel(hotel: Hotel): Hotel {
  const db = read();
  db.hotels.push(hotel);
  write(db);
  return hotel;
}

export function updateHotel(id: string, updates: Partial<Hotel>): Hotel | undefined {
  const db  = read();
  const idx = db.hotels.findIndex((h) => h.id === id);
  if (idx === -1) return undefined;
  db.hotels[idx] = { ...db.hotels[idx], ...updates };
  write(db);
  return db.hotels[idx];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}
