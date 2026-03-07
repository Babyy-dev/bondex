# BondEx — Production Readiness Checklist

This document tracks everything that needs to be done before BondEx is ready for real production use.
Items are grouped by priority. Complete Critical items before going live.

---

## STATUS LEGEND
- [ ] Not started
- [~] In progress
- [x] Done

---

## CRITICAL — Must Fix Before Going Live

### 1. Fix Admin Role Check in Middleware
**File:** `src/middleware.ts` line 22
**Problem:** The admin route protection only checks that a session exists. A hotel staff JWT token can access all `/admin/*` pages because there is no `role === "admin"` check.
**Fix:**
```typescript
// Current (broken):
if (!session) return NextResponse.redirect(new URL("/hotel/login", req.url));

// Fixed:
if (!session || session.role !== "admin") {
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
```
**Effort:** 15 minutes

---

### 2. Move Hotel Credentials Out of Source Code
**File:** `src/lib/auth.ts` lines 40–44
**Problem:** Hotel passwords are stored in plaintext inside the source code. Anyone with repo access can see all passwords. Passwords cannot be changed without a code deploy.
**Fix:**
- Add a `password_hash` column to the `Hotel` table in the database
- Hash passwords with `bcrypt` on hotel creation
- Replace `HOTEL_CREDS` lookup with a database query + `bcrypt.compare()`

**Packages needed:**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**New validateHotelCreds (example):**
```typescript
import bcrypt from "bcryptjs";
import { getHotel } from "@/lib/db";

export async function validateHotelCreds(id: string, password: string) {
  const hotel = await getHotel(id);
  if (!hotel || !hotel.passwordHash) return null;
  const valid = await bcrypt.compare(password, hotel.passwordHash);
  if (!valid) return null;
  return { hotelId: hotel.id, hotelName: hotel.name };
}
```
**Effort:** 2–3 hours (including DB migration)

---

### 3. Switch to PostgreSQL Database
**File:** `src/lib/db.ts`
**Problem:** The current file-based JSON database does not work on Vercel or any serverless platform. Each function invocation gets a fresh filesystem — data written in one request is invisible to the next.
**Fix:** Follow `DATABASE_SETUP.md` — install Prisma, define schema, replace `db.ts` with Prisma client.

**Steps:**
- [ ] Install `prisma` and `@prisma/client`
- [ ] Run `npx prisma init`
- [ ] Copy schema from `DATABASE_SETUP.md` into `prisma/schema.prisma`
- [ ] Set `DATABASE_URL` in `.env.local`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Replace `src/lib/db.ts` with Prisma version from `DATABASE_SETUP.md`
- [ ] Seed hotels with `npx prisma db seed`
- [ ] Delete `.data/db.json` and verify app still works

**Recommended DB provider:** Neon (free, serverless-compatible, works with Vercel)
**Effort:** 4–6 hours

---

### 4. Add `secure: true` to Session Cookie
**File:** `src/app/api/auth/login/route.ts` lines 13 and 24
**Problem:** The session cookie is set without `secure: true`. In production over HTTPS, browsers may still send it over HTTP if a redirect happens.
**Fix:**
```typescript
// Current:
res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12 });

// Fixed:
res.cookies.set(COOKIE, token, {
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 12,
  secure: process.env.NODE_ENV === "production",
});
```
**Effort:** 5 minutes

---

### 5. Add Rate Limiting to Login Endpoint
**File:** `src/app/api/auth/login/route.ts`
**Problem:** No brute-force protection. An attacker can try unlimited passwords against any hotel ID.
**Fix:** Use `@upstash/ratelimit` with Redis (free tier available), or a simple in-memory counter for single-server deployments.

**Option A — Upstash (works on Vercel serverless):**
```bash
npm install @upstash/ratelimit @upstash/redis
```
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 m"), // 10 attempts per 10 minutes
});

// At top of POST handler:
const { success } = await ratelimit.limit(req.ip ?? "anonymous");
if (!success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
```

**Env vars needed:**
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```
**Effort:** 1–2 hours

---

### 6. Add Input Validation with Zod
**Problem:** All API routes accept any JSON body without validation. Malformed data can cause runtime errors or corrupt the database.
**Files to update:**
- `src/app/api/orders/route.ts` (POST)
- `src/app/api/orders/[orderId]/route.ts` (PATCH)
- `src/app/api/auth/login/route.ts` (POST)
- `src/app/api/shipco/checkin/route.ts` (POST)

**Fix:**
```bash
npm install zod
```

**Example for orders POST:**
```typescript
import { z } from "zod";

const CreateOrderSchema = z.object({
  size:            z.enum(["S", "M", "L", "XL"]),
  fromHotel:       z.string().min(1),
  deliveryDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestName:       z.string().min(1),
  guestEmail:      z.string().email(),
  guestPhone:      z.string().min(7),
  basePrice:       z.number().positive(),
  destinationType: z.enum(["hotel", "airport", "address"]),
  toAddress:       z.object({
    postalCode:    z.string().min(5),
    prefecture:    z.string().min(1),
    city:          z.string().min(1),
    street:        z.string().min(1),
    recipientName: z.string().min(1),
    facilityName:  z.string().optional(),
    building:      z.string().optional(),
  }),
});

// In POST handler:
const parsed = CreateOrderSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
}
```
**Effort:** 3–4 hours

---

## IMPORTANT — Fix Soon After Launch

### 7. Wire Real Photo Upload (S3 / Cloudflare R2)
**File:** `src/app/hotel/scan/page.tsx`
**Problem:** The hotel scan page captures a photo using `ImageCapture` but the photo is never uploaded anywhere. The `photoUrls` saved to the order are placeholder strings, not real image URLs.
**Fix:** Upload the captured blob to S3 or Cloudflare R2 using a presigned URL.

**Steps:**
- [ ] Create S3 bucket or R2 bucket
- [ ] Create API route `POST /api/upload/presign` that returns a presigned PUT URL
- [ ] In `hotel/scan/page.tsx`, after photo capture: PUT blob to presigned URL, save the resulting public URL to the order
- [ ] Add `photoUrls` display in `hotel/orders/[orderId]/page.tsx`

**Packages:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Env vars needed:**
```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=bondex-photos
```

**Cloudflare R2 is recommended** — same S3-compatible API, no egress fees, generous free tier.
**Effort:** 3–4 hours

---

### 8. Read Hotel Name from JWT Session (not hardcoded)
**File:** `src/app/hotel/orders/page.tsx` line 60
**Problem:** The hotel name shown in the header is hardcoded as `"Sakura Hotel Shinjuku"` regardless of which hotel staff is logged in.
**Fix:** Read `hotelName` from the JWT session on the server and pass it as a prop, or call a `/api/auth/me` endpoint from the client.

**Quick fix — add `/api/auth/me` route:**
```typescript
// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(session);
}
```

Then in `hotel/orders/page.tsx`:
```typescript
const [hotelName, setHotelName] = useState("Hotel");
useEffect(() => {
  fetch("/api/auth/me").then(r => r.json()).then(s => setHotelName(s.hotelName));
}, []);
```
**Effort:** 1 hour

---

### 9. Add Pagination to Admin Orders Page
**File:** `src/app/admin/orders/page.tsx`
**Problem:** All orders are loaded in a single API call. With 500+ orders this will be slow and expensive.
**Fix:** Add `?page=1&limit=20` query params to `GET /api/orders` and implement cursor-based or offset pagination.

**API change:**
```typescript
// src/app/api/orders/route.ts
const page  = Number(searchParams.get("page")  ?? 1);
const limit = Number(searchParams.get("limit") ?? 20);
const all   = getOrders();
const paginated = all.slice((page - 1) * limit, page * limit);
return NextResponse.json({ orders: paginated, total: all.length, page, limit });
```
**Effort:** 2–3 hours

---

### 10. Add React Error Boundaries
**Problem:** An uncaught JavaScript error on any page shows a blank white screen with no feedback.
**Fix:** Wrap each portal (traveler, hotel, admin) in an error boundary component.

**Create `src/components/ErrorBoundary.tsx`:**
```typescript
"use client";
import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center text-center px-4">
          <div>
            <p className="text-2xl font-black text-[#1A120B] mb-2">Something went wrong</p>
            <p className="text-sm text-[#A89080] mb-4">Please refresh the page.</p>
            <button onClick={() => this.setState({ hasError: false })}
              className="px-6 py-2 bg-[#1A120B] text-white rounded-xl text-sm">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```
**Effort:** 1–2 hours

---

## NICE TO HAVE — Post-Launch Improvements

### 11. Admin Hotel Edit Page
**Missing page:** `/admin/hotels/[id]`
**What it needs:** Form to edit hotel name, address, carrier, cutoff time, status (active/paused).
The "Hotels" nav link in the admin sidebar goes to `/admin/hotels` (list) but there is no detail/edit page.
**Effort:** 2–3 hours

---

### 12. Google Places Autocomplete for Address Step
**File:** `src/components/traveler/steps/Step2Address.tsx`
**Problem:** Address entry is manual text fields. Guests can type anything — invalid postal codes, wrong prefecture, etc.
**Fix:** Integrate Google Places Autocomplete API. `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` is already in `.env.local`.

**Package:**
```bash
npm install @vis.gl/react-google-maps
```
**Effort:** 3–4 hours

---

### 13. Full Japanese / English i18n
**Problem:** The hotel portal has an EN/JA language toggle but most strings are still hardcoded in English. The traveler booking flow is English only.
**Fix:** Extract all strings into a translation file using `next-intl`.

```bash
npm install next-intl
```
**Effort:** 1–2 days

---

### 14. SMS Notifications
**Problem:** Email-only notifications. Guests in Japan may not check email promptly.
**Fix:** Add Twilio or AWS SNS for SMS at key events (booking confirmed, checked in, delivered).

**Env vars needed:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+15551234567
```
**Effort:** 2–3 hours

---

### 15. Audit Log for Admin Actions
**Problem:** No record of who changed an order status, who flagged an order, or who edited hotel settings.
**Fix:** Add an `AuditLog` table in Prisma and write a log entry on every admin PATCH action.

**Schema addition:**
```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  orderId   String?
  hotelId   String?
  action    String
  detail    String?
  userId    String
  createdAt DateTime @default(now())
}
```
**Effort:** 3–4 hours

---

### 16. Vercel Deployment Configuration
**File to create:** `vercel.json`
**What's needed:**

```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && next build",
  "env": {
    "DATABASE_URL": "@database-url",
    "SESSION_SECRET": "@session-secret",
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "STRIPE_WEBHOOK_SECRET": "@stripe-webhook-secret",
    "SHIPCO_API_KEY": "@shipco-api-key",
    "SMTP_HOST": "@smtp-host",
    "SMTP_USER": "@smtp-user",
    "SMTP_PASS": "@smtp-pass"
  }
}
```

**Deployment checklist:**
- [ ] Push code to GitHub
- [ ] Connect repo to Vercel
- [ ] Add all env vars in Vercel dashboard
- [ ] Set `NEXT_PUBLIC_APP_URL` to the Vercel production URL
- [ ] Update Stripe webhook endpoint URL to production URL
- [ ] Verify Ship&Co webhook if applicable
- [ ] Test full booking flow end-to-end on production

**Effort:** 2–3 hours

---

## EFFORT SUMMARY

| Priority | Item | Effort |
|---|---|---|
| Critical | 1. Fix admin role check | 15 min |
| Critical | 2. Move hotel creds to DB | 2–3 hrs |
| Critical | 3. Switch to PostgreSQL | 4–6 hrs |
| Critical | 4. Add `secure` flag to cookie | 5 min |
| Critical | 5. Rate limit login endpoint | 1–2 hrs |
| Critical | 6. Zod input validation | 3–4 hrs |
| Important | 7. Real photo upload (S3/R2) | 3–4 hrs |
| Important | 8. Hotel name from session | 1 hr |
| Important | 9. Pagination for orders | 2–3 hrs |
| Important | 10. React error boundaries | 1–2 hrs |
| Nice to have | 11. Admin hotel edit page | 2–3 hrs |
| Nice to have | 12. Google Places autocomplete | 3–4 hrs |
| Nice to have | 13. Full i18n (EN/JA) | 1–2 days |
| Nice to have | 14. SMS notifications | 2–3 hrs |
| Nice to have | 15. Audit log | 3–4 hrs |
| Nice to have | 16. Vercel deployment config | 2–3 hrs |

**Critical items total:** ~12 hours
**All items total:** ~3–4 days of work
