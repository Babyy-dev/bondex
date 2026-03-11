# BondEx — Production Readiness Checklist

> Last updated: 2026-03-11
> Build status: ✅ Passing (28 routes, 0 TypeScript errors)
> Stripe: Test keys set on Vercel ✅
> Ship\&Co: Test keys set on Vercel ✅
> Database: File-based JSON — NOT production-safe ❌

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Done and working |
| ❌ | Not done — blocks production |
| ⏳ | Deferred — do before go-live |
| 💡 | Nice to have — post-launch |

---

## PART 1 — What Is Already Done

### Traveler Booking Flow
- ✅ Step 1 — Size selection (S/M/L/LL), prohibited items, consent checkbox
- ✅ Step 1 — Optional condition photos upload (max 2, camera capture, preview, remove)
- ✅ Step 2 — Address entry (search mode + manual mode, popular destinations)
- ✅ Step 2 — Recipient name field, airport warning for 14:00 flight rule
- ✅ Step 3 — Date picker (14-day window, earliest badge, auto-scheduled time slot)
- ✅ Step 4 — Email + confirm email + phone with validation
- ✅ Step 5 — Stripe payment (accordion layout: wallet buttons at top, always-visible card form)
- ✅ Step 5 — Apple Pay / Google Pay shown via Stripe PaymentElement
- ✅ Step 5 — Price summary with estimated max for size adjustment
- ✅ Step 6 — Real scannable QR code, 3-step instructions, delivery summary, screenshot tip
- ✅ Booking reads `?hotel=HTL-001` from URL → fetches real hotel name from DB
- ✅ Exit confirmation modal on Step 1 back

### Order Status Page (`/status/[orderId]`)
- ✅ Real data from DB, status timeline (CREATED → PAID → CHECKED\_IN → … → DELIVERED)
- ✅ Carrier tracking number with copy button
- ✅ Terminal state handling (AUTO\_CANCELLED, CARRIER\_REFUSED)
- ✅ "Order not found" 404 screen for invalid order IDs
- ✅ Good to know section with contact link

### Hotel Staff Portal
- ✅ Login with Facility ID + password, JWT session (12h), logout
- ✅ Order list filtered to the **logged-in hotel's orders only** (via session hotelId)
- ✅ Hotel name shown dynamically from session (not hardcoded)
- ✅ EN/JA language switcher on order list and filters
- ✅ Search by order ID or guest name
- ✅ Filters: All / Waiting / Checked In / Flagged
- ✅ Order detail page — view-only, reprint label, flag issue (wired to API)
- ✅ Scan page — QR scanner (jsQR, real camera), manual ID entry
- ✅ Scan page — Photo capture (ImageCapture API, desktop fallback)
- ✅ Scan page — Flag button wired to API
- ✅ Check-in → Ship\&Co API call → tracking number + label URL saved to order
- ✅ Ship\&Co non-fatal fallback: mock label if API fails

### Admin Portal
- ✅ Login (admin / admin123 default, overridable via env)
- ✅ Dashboard — real stats: earnings (15%), today's orders, revenue, active hotels count (dynamic)
- ✅ Dashboard — alerts for flagged orders and orders waiting >2 check-ins
- ✅ Dashboard — recent 5 orders table
- ✅ Orders table — search + status filter + **date range filter** (from/to)
- ✅ Order detail — view all fields, evidence photo viewer, label reprint
- ✅ Order detail — size change (triggers off-session Stripe charge via `/api/stripe/charge-difference`)
- ✅ Order detail — timeline log
- ✅ Payments page — shows CREATED (unpaid) orders, Notify CS button
- ✅ Hotels list — search, active/paused status, carrier, cutoff time
- ✅ New hotel form — all fields including contact info, collection method, same-day delivery, max items, storage location, operational notes

### API Routes
- ✅ `POST /api/orders` — create order with `fromHotelId` stored
- ✅ `GET /api/orders` — list with `?hotelId=` (fixed: was broken, now filters by `fromHotelId`)
- ✅ `GET/PATCH /api/orders/[orderId]`
- ✅ `POST /api/stripe/create-payment-intent`
- ✅ `POST /api/stripe/webhook` — handles succeeded, failed, cancelled, refunded, dispute events
- ✅ `POST /api/stripe/charge-difference` — off-session charge for size adjustments
- ✅ `POST /api/shipco/checkin` — real Ship\&Co call with mock fallback
- ✅ `GET /api/labels/mock/[orderId]` — SVG fallback label
- ✅ `GET/POST /api/hotels`
- ✅ `GET /api/hotels/[hotelId]` — single hotel lookup
- ✅ `POST /api/auth/login` / `POST /api/auth/logout`
- ✅ `GET /api/auth/me` — returns session payload (hotelId, hotelName, role)
- ✅ `GET /api/cron/auto-cancel` — auto-cancels expired PAID orders (protected by CRON\_SECRET)

### Infrastructure
- ✅ JWT auth middleware (`proxy.ts`) protecting hotel and admin routes
- ✅ `vercel.json` with daily cron at 23:00 JST (`0 14 * * *`)
- ✅ Secure cookie flag (`secure: true` in production)
- ✅ File-based JSON DB with seed data (HTL-001, HTL-002, ORD-DEMO1, ORD-DEMO2)
- ✅ Email templates (booking confirmed, check-in complete, delivered) — silent fallback if no SMTP

---

## PART 2 — What Is NOT Done (Blockers & Remaining Work)

---

### ❌ BLOCKER 1 — Database (Most Critical)

**Problem:** `src/lib/db.ts` writes to `.data/db.json` on the local filesystem.
On Vercel, the filesystem is **read-only in production**. Every write silently fails or goes to `/tmp` which is wiped between function invocations. All order and hotel data is lost on every new request.

**Impact:** App is completely non-functional for data persistence on Vercel.

**Fix:** Migrate to Prisma + PostgreSQL.

**Recommended provider:** [Neon](https://neon.tech) — free tier, serverless-native, one-click Vercel integration.

**Steps:**
1. Create a Neon project → copy the `DATABASE_URL` connection string
2. Install dependencies:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```
3. Write `prisma/schema.prisma` (see schema below)
4. Add `DATABASE_URL` to Vercel environment variables
5. Replace `src/lib/db.ts` with Prisma version
6. Run `npx prisma migrate deploy` on first deploy
7. Seed demo data via `npx prisma db seed`

**Prisma Schema (`prisma/schema.prisma`):**
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
  fromHotelId      String?
  toAddress        Json
  deliveryDate     String
  guestName        String
  guestEmail       String
  guestPhone       String
  basePrice        Int
  totalPrice       Int
  trackingNumber   String?
  carrier          String?
  qrCode           String?
  destinationType  String
  paymentIntentId  String?
  labelUrl         String?
  shipcoShipmentId String?
  photoUrls        String[]
  flagged          Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Hotel {
  id               String   @id
  name             String
  branchName       String?
  address          String
  status           String   @default("active")
  dailyOrderCount  Int      @default(0)
  carrier          String
  cutoffTime       String
  printerType      String
  labelSize        String
  contactName      String?
  contactPhone     String?
  contactEmail     String?
  collectionMethod String?
  sameDayDelivery  Boolean  @default(false)
  maxDailyItems    Int?
  storageLocation  String?
  operationalNotes String?
  passwordHash     String?
  createdAt        DateTime @default(now())
}
```

**Estimated effort:** 4–6 hours

---

### ❌ BLOCKER 2 — Hotel Passwords in Source Code

**Problem:** `src/lib/auth.ts` lines 40–44 — hotel passwords are plaintext strings inside the source code. Anyone with repo access can see all hotel passwords. Passwords cannot be changed without a code redeploy.

**Fix:** Once Prisma is set up, store `passwordHash` (bcrypt) in the `Hotel` table and validate against it.

```bash
npm install bcryptjs && npm install --save-dev @types/bcryptjs
```

```typescript
// When creating/updating a hotel password:
import bcrypt from "bcryptjs";
const passwordHash = await bcrypt.hash(plainPassword, 12);

// When validating login:
const hotel = await prisma.hotel.findUnique({ where: { id: facilityId } });
const valid = hotel && await bcrypt.compare(password, hotel.passwordHash ?? "");
```

**Estimated effort:** 2–3 hours (after Prisma migration)

---

### ❌ BLOCKER 3 — Missing Environment Variables

The following env vars are **not set in Vercel** but are required:

| Variable | Required | Impact if Missing |
|----------|----------|-------------------|
| `SESSION_SECRET` | **CRITICAL** | App throws on startup — all auth broken |
| `CRON_SECRET` | **CRITICAL** | Auto-cancel endpoint is open to anyone on the internet |
| `STRIPE_WEBHOOK_SECRET` | Important | Webhook events accepted but **not verified** (security risk) |
| `DATABASE_URL` | Needed after Prisma | App has no persistent DB |
| `NEXT_PUBLIC_APP_URL` | Minor | Defaults to `localhost:3000` in some places |

**How to check `SESSION_SECRET`:** Go to Vercel → Project → Settings → Environment Variables. If it's not there, add a random 32-character string, e.g.:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### ❌ BLOCKER 4 — Stripe Webhook Not Configured

**Problem:** The webhook endpoint `POST /api/stripe/webhook` exists and handles all events correctly, but Stripe doesn't know to send events to it unless registered in the Stripe Dashboard.

Without this, when a customer pays, the order is marked PAID by the frontend PATCH call — but if the browser closes before that runs, the order stays `CREATED` forever.

**Fix:**
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. URL: `https://your-vercel-domain.vercel.app/api/stripe/webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`
5. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Vercel

Do this for **both test mode** (now) and **live mode** (when switching keys).

---

### ❌ BLOCKER 5 — Photo Upload Has No Real Storage

**Problem:** Hotel staff take a photo during check-in (`hotel/scan`). The photo is captured as a blob URL (`createObjectURL`) which only lives in the browser's memory. It is never uploaded to any server. The `photoUrls` saved to the order are blob URLs or the string `"demo-photo"` — both useless after the page closes.

**Impact:** Evidence photos (the "single source of truth" per requirements) are never actually stored.

**Fix:** Upload captured photo to cloud storage before calling `/api/shipco/checkin`.

**Recommended:** Cloudflare R2 (S3-compatible, no egress fees, free tier 10GB).

**Steps:**
1. Create an R2 bucket in Cloudflare dashboard
2. Create API route `POST /api/upload/presign` that returns a presigned PUT URL
3. In `hotel/scan/page.tsx`: after photo capture, PUT blob to presigned URL, get back the public URL
4. Pass the real URL in `photoUrls` to the check-in endpoint

**Packages:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Env vars needed:**
```
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=bondex-photos
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Estimated effort:** 3–4 hours

---

### ⏳ BEFORE GO-LIVE — Switch to Live Keys

When you are ready to accept real payments:

**Stripe:**
1. Go to Stripe Dashboard → toggle to **Live mode**
2. Replace `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel with live keys
3. Register a new webhook for live mode and update `STRIPE_WEBHOOK_SECRET`

**Ship\&Co:**
1. Replace `SHIPCO_API_KEY` in Vercel with your production credentials

No code changes needed — the app is already configured to use env vars.

---

### ⏳ BEFORE GO-LIVE — Set Up Email (SMTP)

**Problem:** All transactional emails (booking confirmed, check-in complete, delivered) are silently discarded with a `console.log` because no SMTP is configured.

**Recommended provider:** [Resend](https://resend.com) — 3,000 free emails/month, extremely simple, Next.js-native.

**Env vars to add in Vercel:**
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM=BondEx <noreply@yourdomain.com>
```

You must also verify your sending domain in Resend's dashboard.

**Estimated effort:** 30 minutes

---

### ⏳ BEFORE GO-LIVE — Hotel Login URL on QR Codes

**Problem:** The booking page reads `?hotel=HTL-001` from the URL to set which hotel the booking is coming from. In production, each hotel's lobby QR code must point to the correct URL:

```
https://your-domain.vercel.app/book?hotel=HTL-001   ← Sakura Hotel Shinjuku
https://your-domain.vercel.app/book?hotel=HTL-002   ← Maple Inn Asakusa
```

If a traveler visits `/book` without the `?hotel=` param, `fromHotel` defaults to `"Sakura Hotel Shinjuku"` and `fromHotelId` is blank — orders won't show up in the correct hotel's portal.

**Fix options:**
- A) Generate and print the correct QR code for each hotel (simplest — no code change)
- B) Add a hotel selection screen if `?hotel=` is missing (requires 1–2 hours of code)

---

### ⏳ IMPORTANT — Add Rate Limiting to Login

**Problem:** `/api/auth/login` has no brute-force protection. Anyone can try unlimited passwords against any hotel ID.

**Fix:** Use `@upstash/ratelimit` with Redis (free tier available on Upstash).

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Env vars:**
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Limit: 10 attempts per 10 minutes per IP.
**Estimated effort:** 1–2 hours

---

### ⏳ IMPORTANT — Add Zod Input Validation

**Problem:** All API routes accept any JSON body without validation. Malformed or malicious data can cause runtime crashes or DB corruption.

**Files to update:** `POST /api/orders`, `PATCH /api/orders/[orderId]`, `POST /api/auth/login`, `POST /api/shipco/checkin`

```bash
npm install zod
```

**Estimated effort:** 2–3 hours

---

### ⏳ IMPORTANT — Add Pagination to Orders API

**Problem:** `GET /api/orders` returns ALL orders in one call. With 500+ orders, this will be slow and memory-heavy.

**Fix:** Add `?page=1&limit=20` to the API and update the admin orders page to paginate.

**Estimated effort:** 2–3 hours

---

## PART 3 — Nice to Have (Post-Launch)

| # | Feature | Notes | Effort |
|---|---------|-------|--------|
| 1 | **Google Places API for address search** | Replace 5 hardcoded destinations with real Places Autocomplete | 3–4 hrs |
| 2 | **Admin hotel edit page** (`/admin/hotels/[id]`) | Edit hotel name, address, carrier, cutoff, status | 2–3 hrs |
| 3 | **Status page auto-polling** | Poll every 30s instead of manual refresh | 30 min |
| 4 | **Manual tracking number in admin** | CS can enter a tracking number when Ship\&Co fails | 1 hr |
| 5 | **Hotel orders — today's orders bold** | Highlight today's orders in the list | 30 min |
| 6 | **Hotel orders — status legend** | Collapsible color+icon guide at top of order list | 1 hr |
| 7 | **Hotel exception screen** | Dedicated screen for damaged QR code reallocation | 2–3 hrs |
| 8 | **Handwritten slip mode in admin** | Fail-safe for printer malfunction | 3–4 hrs |
| 9 | **Full EN/JA i18n** | Extract all strings to translation files via `next-intl` | 1–2 days |
| 10 | **SMS notifications** | Twilio/SNS for booking confirmed + delivered | 2–3 hrs |
| 11 | **React error boundaries** | Prevent blank white screens on JS errors | 1–2 hrs |
| 12 | **Audit log** | Record every admin action (size change, flag, status update) | 3–4 hrs |
| 13 | **Hotel staff password change UI** | Self-service password reset for hotel accounts | 2–3 hrs |

---

## PART 4 — Full Environment Variables Reference

| Variable | Where to get it | Required | Currently set |
|----------|----------------|----------|---------------|
| `SESSION_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | **CRITICAL** | ❓ Verify |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys | **CRITICAL** | ✅ (test) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API Keys | **CRITICAL** | ✅ (test) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing secret | Important | ❌ Not set |
| `SHIPCO_API_KEY` | Ship\&Co account settings | Important | ✅ (test) |
| `SHIPCO_API_BASE_URL` | `https://app.shipandco.com/api/v1` | Optional | ✅ (default) |
| `DATABASE_URL` | Neon / Supabase / Vercel Postgres | **CRITICAL** (after Prisma) | ❌ Not set |
| `CRON_SECRET` | Generate any random string | Important | ❌ Not set |
| `SMTP_HOST` | Resend: `smtp.resend.com` | Optional | ❌ Not set |
| `SMTP_PORT` | Resend: `465` | Optional | ❌ Not set |
| `SMTP_USER` | Resend: `resend` | Optional | ❌ Not set |
| `SMTP_PASS` | Your Resend API key | Optional | ❌ Not set |
| `SMTP_FROM` | `BondEx <noreply@yourdomain.com>` | Optional | ❌ Not set |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain URL | Optional | ❌ Not set |
| `HOTEL_HTL001_PASS` | Set any password for HTL-001 | Optional (temp) | ❌ (using default `demo123`) |
| `HOTEL_HTL002_PASS` | Set any password for HTL-002 | Optional (temp) | ❌ (using default `demo123`) |
| `ADMIN_USERNAME` | Your admin username | Optional (temp) | ❌ (using default `admin`) |
| `ADMIN_PASSWORD` | Your admin password | Optional (temp) | ❌ (using default `admin123`) |

---

## PART 5 — Recommended Go-Live Order

```
Step 1 (Now)
  → Set SESSION_SECRET in Vercel
  → Set CRON_SECRET in Vercel
  → Change HOTEL and ADMIN default passwords via env vars
  → Register Stripe webhook, set STRIPE_WEBHOOK_SECRET

Step 2 (Prisma Migration — most effort)
  → Set up Neon PostgreSQL
  → Migrate db.ts to Prisma
  → Move hotel passwords to DB (bcrypt)
  → Deploy and verify data persists

Step 3 (Before accepting users)
  → Set up Cloudflare R2 for photo uploads
  → Set up Resend for transactional emails
  → Generate hotel QR codes with correct ?hotel= URLs
  → Add rate limiting to login endpoint

Step 4 (Go live)
  → Switch Stripe to live keys
  → Switch Ship&Co to live credentials
  → Create live Stripe webhook
  → Run full end-to-end test on production

Step 5 (Post-launch)
  → Add Zod input validation
  → Add pagination to orders API
  → Google Places autocomplete
  → Other nice-to-haves from Part 3
```

---

*BondEx v1 — Internal development document*
