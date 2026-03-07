# SMTP Email Setup — BondEx

BondEx uses Nodemailer to send transactional emails. If SMTP is not configured, all emails are printed to the console instead — the app works fully without it.

---

## How It Works

```
src/lib/email.ts  ←  all email logic lives here
```

Three emails are sent automatically:

| Trigger | Function | Recipient |
|---|---|---|
| Guest completes booking | `sendBookingConfirmed` | Guest email |
| Hotel staff scans QR + takes photo | `sendCheckinComplete` | Guest email |
| Admin marks order Delivered | `sendDelivered` | Guest email |

If `SMTP_HOST` or `SMTP_USER` is missing from `.env.local`, the email body is logged to the server console instead of being sent. No crash, no error — graceful degradation.

---

## Required Environment Variables

Add these to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM=BondEx <noreply@bondex.jp>
```

---

## Option 1 — Gmail (Free, Easiest for Testing)

### Step 1 — Enable 2-Step Verification
1. Go to your Google Account → **Security**
2. Turn on **2-Step Verification** (required for App Passwords)

### Step 2 — Create an App Password
1. Go to **Google Account → Security → App passwords**
   - Direct link: https://myaccount.google.com/apppasswords
2. Click **Select app** → choose **Mail**
3. Click **Select device** → choose **Other** → type `BondEx`
4. Click **Generate**
5. Copy the 16-character password shown (e.g. `abcd efgh ijkl mnop`)

### Step 3 — Set Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=BondEx <you@gmail.com>
```

> Remove spaces from the App Password — use it as one continuous string.

---

## Option 2 — Resend (Recommended for Production)

Resend gives 3,000 free emails/month and has first-class SMTP support.

### Step 1 — Create Account
Sign up at https://resend.com

### Step 2 — Get SMTP Credentials
1. Go to **Settings → SMTP**
2. Note the credentials:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: your Resend API key

### Step 3 — Verify Your Domain (for production)
1. Go to **Domains → Add Domain**
2. Add the DNS records shown (TXT + MX records)
3. Wait for verification (usually 5–30 minutes)

### Step 4 — Set Environment Variables

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx
SMTP_FROM=BondEx <noreply@yourdomain.com>
```

---

## Option 3 — Brevo / Sendinblue (Free tier: 300 emails/day)

1. Sign up at https://app.brevo.com
2. Go to **SMTP & API → SMTP**
3. Copy the credentials shown

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=BondEx <noreply@yourdomain.com>
```

---

## Option 4 — Mailgun

1. Sign up at https://mailgun.com
2. Add and verify your domain
3. Go to **Sending → Domain Settings → SMTP credentials**

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=BondEx <noreply@yourdomain.com>
```

---

## Testing Your Setup

### Method 1 — Run the App and Book a Demo Order
1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/book`
3. Complete all 6 booking steps
4. Check your inbox — the confirmation email should arrive

### Method 2 — Watch the Console (No SMTP)
If SMTP is not configured, you will see the email body printed like this:

```
[EMAIL] To: guest@example.com
Subject: BondEx – Booking Confirmed
Booking Confirmed  Order #ORD-ABC123 ...
```

### Method 3 — Test with Mailtrap (Local Dev Only)
Mailtrap catches all emails without sending them to real inboxes:

1. Sign up at https://mailtrap.io
2. Go to **Email Testing → Inboxes → SMTP Settings**
3. Copy the credentials

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
SMTP_FROM=BondEx <noreply@bondex.jp>
```

---

## Email Templates

All templates live in `src/lib/email.ts`. They use inline CSS for broad email client compatibility.

### Booking Confirmed (`sendBookingConfirmed`)
Sent when: order is created and payment is completed.
Contains: order ID, pickup hotel, destination, delivery date, QR code link.

### Luggage Checked In (`sendCheckinComplete`)
Sent when: hotel staff scans the QR code and captures the photo.
Contains: tracking number (if available), carrier name.

### Delivered (`sendDelivered`)
Sent when: admin or webhook marks the order as DELIVERED.
Contains: destination name.

---

## Customizing the From Address

The `SMTP_FROM` variable sets the display name and address seen by the guest:

```env
# Format:  Display Name <email@domain.com>
SMTP_FROM=BondEx Japan <noreply@bondex.jp>
```

For Gmail, the from address must match `SMTP_USER`.
For Resend/Brevo/Mailgun, use any address under your verified domain.

---

## Port Reference

| Port | Protocol | When to Use |
|---|---|---|
| `587` | STARTTLS | Default — works everywhere |
| `465` | SSL/TLS | Some older providers |
| `25` | Plain | Server-to-server only, blocked by most ISPs |

The code automatically uses SSL when `SMTP_PORT=465`, and STARTTLS otherwise.

---

## Troubleshooting

| Error | Likely Cause | Fix |
|---|---|---|
| `ECONNREFUSED` | Wrong host or port | Double-check `SMTP_HOST` and `SMTP_PORT` |
| `Invalid login` / `535` | Wrong credentials | For Gmail: use App Password, not account password |
| `550 Sender not allowed` | From address mismatch | Use the same address as `SMTP_USER` (Gmail) or a verified domain address |
| `Certificate error` | Self-signed cert | Only an issue on local test SMTP servers; ignored in production |
| Emails go to spam | No SPF/DKIM records | Add SPF + DKIM DNS records for your domain |

---

## SPF / DKIM for Production (Prevent Spam Folder)

Add these DNS records to your domain (exact values depend on your provider):

**SPF** (TXT record on `@`):
```
v=spf1 include:_spf.resend.com ~all
```

**DKIM** — generated by your provider (Resend, Brevo, Mailgun all give you the value after domain verification).

Most providers walk you through this in their dashboard under "Domain Verification."
