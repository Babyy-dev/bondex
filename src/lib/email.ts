/**
 * Email notifications via Nodemailer.
 * If SMTP credentials are not set, emails are logged to console (graceful degradation).
 */
import nodemailer from "nodemailer";
import type { Order } from "@/types";
import { env } from "@/lib/env";

function getTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    return null; // No SMTP configured — will log instead
  }
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

async function send(to: string, subject: string, html: string) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[EMAIL] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, "")}\n`);
    return;
  }
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function sendBookingConfirmed(order: Order) {
  const appUrl = env.APP_URL;
  await send(
    order.guestEmail,
    "BondEx – Booking Confirmed",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
      <h1 style="font-size:24px;color:#1A120B;margin-bottom:4px;">Booking Confirmed ✅</h1>
      <p style="color:#8B7355;margin-bottom:24px;">Order #${order.id}</p>

      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #EDE8DF;margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#B0A090;text-transform:uppercase;letter-spacing:.05em;">From</p>
        <p style="margin:0;font-weight:600;color:#1A120B;">${order.fromHotel}</p>
      </div>

      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #EDE8DF;margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#B0A090;text-transform:uppercase;letter-spacing:.05em;">Deliver to</p>
        <p style="margin:0;font-weight:600;color:#1A120B;">${order.toAddress.facilityName ?? order.toAddress.city}</p>
        <p style="margin:4px 0 0;color:#8B7355;">${order.deliveryDate} · Size ${order.size}</p>
      </div>

      <div style="background:#1A120B;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#C8A96E;text-transform:uppercase;letter-spacing:.05em;">Check in by</p>
        <p style="margin:0;font-weight:700;font-size:18px;color:#fff;">${order.deliveryDate} 17:00</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Late check-in may delay delivery</p>
      </div>

      <a href="${appUrl}/status/${order.id}"
        style="display:block;text-align:center;background:#1A120B;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-bottom:20px;">
        View Delivery Status →
      </a>

      <p style="font-size:11px;color:#B0A090;text-align:center;">
        BondEx – Japan Luggage Delivery · <a href="mailto:support@bondex.jp" style="color:#C8A96E;">support@bondex.jp</a>
      </p>
    </div>
    `
  );
}

export async function sendCheckinComplete(order: Order) {
  await send(
    order.guestEmail,
    "BondEx – Luggage Checked In",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
      <h1 style="font-size:24px;color:#1A120B;">Luggage Checked In 🏨</h1>
      <p style="color:#8B7355;">Your luggage has been accepted and a shipping label has been printed.</p>
      ${order.trackingNumber ? `
      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #EDE8DF;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#B0A090;">TRACKING NUMBER</p>
        <p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;color:#1A120B;">${order.trackingNumber}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#8B7355;">${order.carrier}</p>
      </div>
      ` : ""}
      <p style="font-size:11px;color:#B0A090;text-align:center;margin-top:24px;">BondEx – Japan Luggage Delivery</p>
    </div>
    `
  );
}

export async function sendDelivered(order: Order) {
  await send(
    order.guestEmail,
    "BondEx – Luggage Delivered",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
      <h1 style="font-size:24px;color:#1A120B;">Delivered 🎉</h1>
      <p style="color:#8B7355;">Your luggage has been delivered to <strong>${order.toAddress.facilityName ?? order.toAddress.city}</strong>.</p>
      <p style="font-size:11px;color:#B0A090;text-align:center;margin-top:24px;">BondEx – Japan Luggage Delivery</p>
    </div>
    `
  );
}

export async function sendAutoCancelled(order: Order) {
  const appUrl = env.APP_URL;
  await send(
    order.guestEmail,
    "BondEx – Booking Cancelled",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
      <h1 style="font-size:24px;color:#1A120B;margin-bottom:4px;">Booking Cancelled</h1>
      <p style="color:#8B7355;margin-bottom:24px;">Order #${order.id}</p>

      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#92400E;">Your luggage was not checked in before the deadline.</p>
        <p style="margin:8px 0 0;color:#78350F;font-size:14px;">
          The check-in deadline was ${order.deliveryDate} at 17:00. Since your luggage was not received by the hotel before this time, your booking has been automatically cancelled.
        </p>
      </div>

      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #EDE8DF;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#B0A090;text-transform:uppercase;letter-spacing:.05em;">Refund</p>
        <p style="margin:0;color:#1A120B;">A full refund will be issued to your original payment method within 5–10 business days.</p>
      </div>

      <p style="color:#8B7355;font-size:14px;">
        Need help or want to rebook? Contact us at
        <a href="mailto:support@bondex.jp" style="color:#C8A96E;">support@bondex.jp</a>
      </p>

      <p style="font-size:11px;color:#B0A090;text-align:center;margin-top:24px;">BondEx – Japan Luggage Delivery</p>
    </div>
    `
  );
}

export async function sendPaymentFailed(order: Order) {
  const appUrl = env.APP_URL;
  await send(
    order.guestEmail,
    "BondEx – Payment Issue",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#FEFCF8;padding:32px;border-radius:16px;">
      <h1 style="font-size:24px;color:#1A120B;margin-bottom:4px;">Payment Issue</h1>
      <p style="color:#8B7355;margin-bottom:24px;">Order #${order.id}</p>

      <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#991B1B;">We were unable to process your payment.</p>
        <p style="margin:8px 0 0;color:#7F1D1D;font-size:14px;">
          Your booking is on hold. Please retry your payment or use a different card.
        </p>
      </div>

      <a href="${appUrl}/book"
        style="display:block;text-align:center;background:#1A120B;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-bottom:20px;">
        Retry Booking →
      </a>

      <p style="color:#8B7355;font-size:14px;">
        If the issue persists, contact us at
        <a href="mailto:support@bondex.jp" style="color:#C8A96E;">support@bondex.jp</a>
      </p>

      <p style="font-size:11px;color:#B0A090;text-align:center;margin-top:24px;">BondEx – Japan Luggage Delivery</p>
    </div>
    `
  );
}
