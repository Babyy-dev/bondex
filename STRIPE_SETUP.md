# Stripe Setup Guide — BondEx

## Step 1 — Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) → click **Start now**
2. Enter your email, full name, country (**Japan**), and password
3. Verify your email address
4. You are now in **Test Mode** — no real money moves until you explicitly go live

---

## Step 2 — Get Your API Keys

**Path:** Stripe Dashboard → **Developers** (top-right corner) → **API keys**

| Key | Starts with | Env variable |
|-----|------------|--------------|
| Publishable key | `pk_test_...` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key | `sk_test_...` | `STRIPE_SECRET_KEY` |

> The **secret key** must NEVER be exposed in the browser or committed to Git.

Copy both keys into your `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_51ABC...your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...your_key_here
```

---

## Step 3 — Set Up Webhooks

Webhooks are how Stripe tells your app "the payment succeeded."
Without this, orders will never be marked as PAID.

### For Local Development

**Install Stripe CLI:**

```bash
# Windows — download from:
# https://github.com/stripe/stripe-cli/releases/latest
# Extract and add to PATH, then:

stripe login
# A browser opens — click Allow access
```

**Start webhook forwarding (run in a separate terminal):**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

You will see:

```
> Ready! Your webhook signing secret is whsec_abc123xyz...
```

Copy that value into `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...
```

Keep this terminal running while developing. Every payment event will be forwarded to your local app.

### For Production (Vercel)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Set URL to: `https://your-app.vercel.app/api/stripe/webhook`
3. Click **Select events** → choose these two:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Click **Add endpoint**
5. Click **Reveal** under **Signing secret** → copy the `whsec_...` value
6. Add it to Vercel: Dashboard → your project → **Settings** → **Environment Variables** → `STRIPE_WEBHOOK_SECRET`

---

## Step 4 — Test Cards (No Real Money)

Use these card numbers in the payment form during testing:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0069` | Card expired |

- **Expiry:** Any future date — e.g. `12/29`
- **CVC:** Any 3 digits — e.g. `123`
- **ZIP:** Any 5 digits — e.g. `10001`

---

## Step 5 — Enable Payment Methods (Optional)

By default Stripe enables cards. To add Apple Pay / Google Pay:

1. Stripe Dashboard → **Settings** → **Payment methods**
2. Toggle on: **Apple Pay**, **Google Pay**
3. These appear automatically in the `<PaymentElement>` on Safari/Chrome

---

## Step 6 — Going Live (Real Money)

Before switching to live mode:

- [ ] Complete Stripe account verification:
  - Stripe Dashboard → **Activate your account**
  - Add business details, address, bank account (Japanese bank)
  - Upload ID if required
- [ ] Replace test keys with live keys in Vercel env vars:
  - `sk_live_...` → `STRIPE_SECRET_KEY`
  - `pk_live_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Create a **separate Production webhook** endpoint (same steps as Step 3)
- [ ] Test one real ¥100 payment before going public
- [ ] Enable **Radar fraud rules** in Stripe Dashboard → Security

---

## Step 7 — Currency Note

BondEx uses **JPY (Japanese Yen)**.

JPY is a zero-decimal currency — Stripe amounts are in whole yen, not sen.

```ts
// Correct — ¥2000
amount: 2000

// Wrong — this would be 0.02 JPY
amount: 200000
```

This is already correctly handled in `/api/stripe/create-payment-intent/route.ts`.

---

## Full .env.local Reference

```env
# ── Required ──────────────────────────────────────────────────────────────────

# Stripe
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ship&Co
SHIPCO_API_KEY=your_shipco_api_key
SHIPCO_API_BASE_URL=https://app.shipandco.com/api/v1

# Session signing (any random 32+ char string)
SESSION_SECRET=minimum_32_characters_random_string_here

# ── Optional (app works without these, features degrade gracefully) ───────────

# Email (Nodemailer — use Gmail, SendGrid SMTP, or Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password     # Gmail: use App Password not account password
SMTP_FROM=BondEx <noreply@bondex.jp>

# Google Places — for real address/hotel search
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Quick Reference — Key Locations in Code

| File | What it does |
|------|-------------|
| `src/lib/stripe.ts` | Stripe server instance |
| `src/app/api/stripe/create-payment-intent/route.ts` | Creates PaymentIntent |
| `src/app/api/stripe/webhook/route.ts` | Handles Stripe events |
| `src/components/traveler/steps/Step5Payment.tsx` | Stripe Elements UI |
