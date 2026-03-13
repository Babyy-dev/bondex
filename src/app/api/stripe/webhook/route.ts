import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { updateOrder, getOrder } from "@/lib/db";
import { sendDelivered, sendPaymentFailed } from "@/lib/email";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Webhook verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await updateOrder(orderId, { status: "PAID", paymentIntentId: pi.id });
        console.log(`Order ${orderId} marked as PAID`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        console.warn(`Payment failed for order ${orderId} – CS to handle`);
        const order = await getOrder(orderId);
        if (order) {
          sendPaymentFailed(order).catch((err) =>
            console.error(`Payment failed email error for ${orderId}:`, err)
          );
        }
      }
      break;
    }

    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        const order = await getOrder(orderId);
        // Only cancel if payment never completed
        if (order && order.status === "CREATED") {
          await updateOrder(orderId, { status: "AUTO_CANCELLED" });
          console.log(`Order ${orderId} AUTO_CANCELLED – payment intent canceled`);
        }
      }
      break;
    }

    case "payment_intent.requires_action": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        console.warn(`Order ${orderId} requires customer action (3DS) – paymentIntentId: ${pi.id}`);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = (charge.metadata as Record<string, string>)?.orderId
        ?? (charge.payment_intent as Stripe.PaymentIntent | null)?.metadata?.orderId;
      if (orderId) {
        await updateOrder(orderId, { flagged: true });
        console.log(`Order ${orderId} flagged – charge refunded (chargeId: ${charge.id})`);
      }
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = dispute.charge as Stripe.Charge | null;
      const orderId = (charge as Stripe.Charge & { metadata?: Record<string, string> })?.metadata?.orderId;
      if (orderId) {
        await updateOrder(orderId, { flagged: true });
        console.warn(`Order ${orderId} flagged – chargeback opened (disputeId: ${dispute.id})`);
      }
      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = dispute.charge as Stripe.Charge | null;
      const orderId = (charge as Stripe.Charge & { metadata?: Record<string, string> })?.metadata?.orderId;
      if (orderId) {
        console.log(
          `Order ${orderId} dispute closed – status: ${dispute.status} (disputeId: ${dispute.id})`
        );
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
