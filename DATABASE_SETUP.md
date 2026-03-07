# Database Setup — BondEx

BondEx ships with a **file-based JSON database** that requires zero configuration — it works out of the box. When you are ready to scale, this guide shows how to swap it for PostgreSQL using Prisma.

---

## Current Setup — File-Based JSON (Default)

### How It Works

All data is stored in a single JSON file at `.data/db.json` in the project root.

```
bondex/
  .data/
    db.json          ←  all orders and hotels stored here
  src/
    lib/
      db.ts          ←  all database functions
```

The file is created automatically on first run using seed data (2 demo orders, 2 demo hotels). If the file is deleted or corrupted, seed data is restored automatically.

### Data Structure

```json
{
  "orders": [
    {
      "id": "ORD-ABC123",
      "status": "PAID",
      "size": "M",
      "fromHotel": "Sakura Hotel Shinjuku",
      "toAddress": { ... },
      "guestName": "John Smith",
      "guestEmail": "john@example.com",
      "guestPhone": "+1-555-0100",
      "basePrice": 2000,
      "totalPrice": 2000,
      "trackingNumber": null,
      "carrier": null,
      "labelUrl": null,
      "photoUrls": [],
      "qrCode": "ORD-ABC123",
      "createdAt": "2025-03-07T10:00:00.000Z",
      "updatedAt": "2025-03-07T10:00:00.000Z"
    }
  ],
  "hotels": [
    {
      "id": "HTL-001",
      "name": "Sakura Hotel",
      "branchName": "Shinjuku",
      "address": "1-2-3 Kabukicho, Shinjuku, Tokyo",
      "status": "active",
      "carrier": "yamato",
      "cutoffTime": "17:00"
    }
  ]
}
```

### Available Functions

All functions are imported from `@/lib/db`:

```typescript
// Orders
getOrders()                        // → Order[]
getOrder(id: string)               // → Order | undefined
createOrder(order: Order)          // → Order
updateOrder(id, updates)           // → Order | undefined
generateOrderId()                  // → "ORD-L1M2N3O4" (base36 timestamp)

// Hotels
getHotels()                        // → Hotel[]
getHotel(id: string)               // → Hotel | undefined
createHotel(hotel: Hotel)          // → Hotel
updateHotel(id, updates)           // → Hotel | undefined
```

### Limitations of the File Database

| Limitation | Impact |
|---|---|
| Single-process only | Crashes or data loss if two server processes write simultaneously |
| No querying | All filtering is done in JS after reading the full file |
| No transactions | A crash mid-write can corrupt the file |
| Not suitable for serverless | Each function invocation may not share the same filesystem |

**Use the file database for:** Local development, demos, single-server deployments with low traffic.

**Upgrade to PostgreSQL when:** You deploy to Vercel/serverless, need multiple server instances, or expect more than ~100 orders/day.

---

## Resetting the Database

Delete the file and restart the server — seed data is restored automatically:

```bash
rm .data/db.json
npm run dev
```

---

## Backing Up the Database

The file is plain JSON. Copy it anywhere:

```bash
cp .data/db.json backups/db-$(date +%Y%m%d).json
```

---

## Upgrading to PostgreSQL with Prisma

When you are ready for production scale, follow these steps to replace the file database with PostgreSQL.

### Step 1 — Install Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

### Step 2 — Define the Schema

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Order {
  id               String   @id
  status           String
  size             String
  fromHotel        String
  guestName        String
  guestEmail       String
  guestPhone       String
  basePrice        Int
  totalPrice       Int
  deliveryDate     String
  destinationType  String   @default("hotel")
  trackingNumber   String?
  carrier          String?
  labelUrl         String?
  shipcoShipmentId String?
  paymentIntentId  String?
  qrCode           String
  flagged          Boolean  @default(false)
  photoUrls        String[] @default([])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  toAddress        Address  @relation(fields: [addressId], references: [id])
  addressId        Int
}

model Address {
  id           Int     @id @default(autoincrement())
  facilityName String?
  postalCode   String
  prefecture   String
  city         String
  street       String
  building     String?
  recipientName String
  orders       Order[]
}

model Hotel {
  id              String  @id
  name            String
  branchName      String?
  address         String
  status          String  @default("active")
  dailyOrderCount Int     @default(0)
  carrier         String  @default("yamato")
  cutoffTime      String  @default("17:00")
  printerType     String?
  labelSize       String?
}
```

### Step 3 — Set the Database URL

Add to `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bondex
```

**Free PostgreSQL options:**
- **Neon** (serverless Postgres, generous free tier): https://neon.tech
- **Supabase** (free tier, includes dashboard): https://supabase.com
- **Railway** (free trial): https://railway.app
- **Local Docker**: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`

### Step 4 — Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 5 — Replace db.ts

Create a new `src/lib/db.ts` that uses Prisma instead of the file system:

```typescript
import { PrismaClient } from "@prisma/client";
import type { Order, Hotel } from "@/types";

// Singleton pattern — required for Next.js dev hot reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    include: { toAddress: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({
    where: { id },
    include: { toAddress: true },
  });
  return row ? mapOrder(row) : undefined;
}

export async function createOrder(order: Order): Promise<Order> {
  const row = await prisma.order.create({
    data: {
      id:              order.id,
      status:          order.status,
      size:            order.size,
      fromHotel:       order.fromHotel,
      guestName:       order.guestName,
      guestEmail:      order.guestEmail,
      guestPhone:      order.guestPhone,
      basePrice:       order.basePrice,
      totalPrice:      order.totalPrice,
      deliveryDate:    order.deliveryDate,
      destinationType: order.destinationType ?? "hotel",
      qrCode:          order.qrCode,
      photoUrls:       order.photoUrls ?? [],
      toAddress: {
        create: {
          facilityName:  order.toAddress.facilityName,
          postalCode:    order.toAddress.postalCode,
          prefecture:    order.toAddress.prefecture,
          city:          order.toAddress.city,
          street:        order.toAddress.street,
          building:      order.toAddress.building,
          recipientName: order.toAddress.recipientName,
        },
      },
    },
    include: { toAddress: true },
  });
  return mapOrder(row);
}

export async function updateOrder(
  id: string,
  updates: Partial<Order>
): Promise<Order | undefined> {
  try {
    const row = await prisma.order.update({
      where: { id },
      data: {
        status:          updates.status,
        totalPrice:      updates.totalPrice,
        trackingNumber:  updates.trackingNumber,
        carrier:         updates.carrier,
        labelUrl:        updates.labelUrl,
        shipcoShipmentId:updates.shipcoShipmentId,
        paymentIntentId: updates.paymentIntentId,
        flagged:         updates.flagged,
        photoUrls:       updates.photoUrls,
      },
      include: { toAddress: true },
    });
    return mapOrder(row);
  } catch {
    return undefined;
  }
}

export async function getHotels(): Promise<Hotel[]> {
  return prisma.hotel.findMany();
}

export async function getHotel(id: string): Promise<Hotel | undefined> {
  return prisma.hotel.findUnique({ where: { id } }) ?? undefined;
}

export async function createHotel(hotel: Hotel): Promise<Hotel> {
  return prisma.hotel.create({ data: hotel });
}

export async function updateHotel(
  id: string,
  updates: Partial<Hotel>
): Promise<Hotel | undefined> {
  try {
    return await prisma.hotel.update({ where: { id }, data: updates });
  } catch {
    return undefined;
  }
}

export function generateOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

// Map Prisma row → app Order type
function mapOrder(row: any): Order {
  return {
    id:               row.id,
    status:           row.status,
    size:             row.size,
    fromHotel:        row.fromHotel,
    toAddress:        row.toAddress,
    deliveryDate:     row.deliveryDate,
    guestName:        row.guestName,
    guestEmail:       row.guestEmail,
    guestPhone:       row.guestPhone,
    basePrice:        row.basePrice,
    totalPrice:       row.totalPrice,
    destinationType:  row.destinationType,
    trackingNumber:   row.trackingNumber ?? undefined,
    carrier:          row.carrier ?? undefined,
    labelUrl:         row.labelUrl ?? undefined,
    shipcoShipmentId: row.shipcoShipmentId ?? undefined,
    paymentIntentId:  row.paymentIntentId ?? undefined,
    flagged:          row.flagged,
    photoUrls:        row.photoUrls,
    qrCode:           row.qrCode,
    createdAt:        row.createdAt.toISOString(),
    updatedAt:        row.updatedAt.toISOString(),
  };
}
```

> The rest of the app — all API routes, pages, and components — does not change. Only `src/lib/db.ts` is replaced.

### Step 6 — Seed Production Data

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.hotel.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "HTL-001", name: "Sakura Hotel", branchName: "Shinjuku",
        address: "1-2-3 Kabukicho, Shinjuku, Tokyo", carrier: "yamato",
      },
      {
        id: "HTL-002", name: "Maple Inn", branchName: "Asakusa",
        address: "2-5-8 Asakusa, Taito, Tokyo", carrier: "sagawa",
      },
    ],
  });
  console.log("Seeded hotels.");
}

main().finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Run:

```bash
npx prisma db seed
```

---

## Hosted PostgreSQL — Quick Comparison

| Provider | Free Tier | Best For |
|---|---|---|
| **Neon** | 0.5 GB storage, auto-suspend | Vercel deployments, serverless |
| **Supabase** | 500 MB, 2 projects | Full-stack with dashboard UI |
| **Railway** | $5 credit/month | Simple deployments |
| **PlanetScale** | MySQL-compatible, generous free | High-traffic apps |
| **Local Docker** | Unlimited | Local development |

### Neon + Vercel (Recommended for Production)

1. Go to https://neon.tech → create a project → copy the connection string
2. Add to Vercel project environment variables:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. In `vercel.json` or Vercel dashboard → add a build command:
   ```
   npx prisma generate && npx prisma migrate deploy && next build
   ```

---

## Viewing Your Data

### File Database — View Raw JSON

```bash
cat .data/db.json | python -m json.tool
```

Or open `.data/db.json` directly in any text editor.

### PostgreSQL — Prisma Studio (Visual UI)

```bash
npx prisma studio
```

Opens a browser UI at `http://localhost:5555` where you can browse and edit all tables.

### PostgreSQL — Direct SQL

```bash
psql $DATABASE_URL
\dt          -- list tables
SELECT * FROM "Order" LIMIT 10;
SELECT * FROM "Hotel";
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `.data/db.json` not created | Permission issue on `.data/` dir | Run `mkdir .data` manually |
| Data lost on restart | File database is not persisted across Vercel/serverless deploys | Use PostgreSQL for production |
| `P2002` Prisma unique constraint | Duplicate order ID | `generateOrderId()` uses timestamp — check system clock |
| `PrismaClientInitializationError` | `DATABASE_URL` missing | Add it to `.env.local` and restart |
| Prisma schema out of sync | Edited schema without running migrate | Run `npx prisma migrate dev` |
