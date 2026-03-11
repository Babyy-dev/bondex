"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSizeInfo } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import type { BookingState } from "@/types";
import toast from "react-hot-toast";

// Stripe is loaded once outside render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── Inner form (inside <Elements>) ─────────────────────────────────────────

interface FormProps {
  orderId: string;
  price: number;
  onSuccess: (orderId: string) => void;
}

function CheckoutForm({ orderId, price, onSuccess }: FormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // We handle redirect ourselves — use if_required so no page reload
          return_url: `${window.location.origin}/book`,
        },
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);

      // Payment succeeded — mark order PAID via API
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });

      toast.success("Payment confirmed!");
      onSuccess(orderId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="bg-white border border-[#EDE8DF] rounded-3xl p-5">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: { billingDetails: { address: { country: "JP" } } },
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || loading} loading={loading} size="lg" className="w-full">
        Pay {formatCurrency(price)}
      </Button>
    </form>
  );
}

// ── Fallback demo form (no Stripe key configured) ──────────────────────────

interface DemoFormProps {
  orderId: string;
  price: number;
  onSuccess: (orderId: string) => void;
}

function DemoPayForm({ orderId, price, onSuccess }: DemoFormProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      toast.success("Demo payment confirmed!");
      onSuccess(orderId);
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] " +
    "placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700">
        Demo mode — Stripe key not configured. Click any Pay button to simulate payment.
      </div>
      <div className="bg-white border border-[#EDE8DF] rounded-3xl p-5 flex flex-col gap-4">
        <p className="text-sm font-semibold text-[#44342A]">Credit / Debit Card</p>
        <input type="text" placeholder="1234 5678 9012 3456" className={inputCls} readOnly />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="MM/YY" className={inputCls} readOnly />
          <input type="text" placeholder="123" className={inputCls} readOnly />
        </div>
        <Button onClick={handlePay} loading={loading} size="lg" className="w-full">
          Pay {formatCurrency(price)}
        </Button>
      </div>
    </div>
  );
}

// ── Outer component ────────────────────────────────────────────────────────

interface Props { booking: BookingState; onSuccess: (orderId: string) => void; }

export function Step5Payment({ booking, onSuccess }: Props) {
  const sizeInfo  = getSizeInfo(booking.size ?? "M");
  const [orderId, setOrderId]           = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError]       = useState<string | null>(null);

  useEffect(() => {
    // Create the order + payment intent when this step mounts
    let cancelled = false;

    async function init() {
      try {
        // 1. Create order in CREATED state
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            size: booking.size,
            fromHotel: booking.fromHotel,
            toAddress: booking.toAddress,
            deliveryDate: booking.deliveryDate,
            guestName: booking.toAddress?.recipientName ?? "Guest",
            guestEmail: booking.guestEmail,
            guestPhone: booking.guestPhone,
            basePrice: sizeInfo.price,
            destinationType: booking.destinationType ?? "hotel",
            conditionPhotos: booking.conditionPhotos,
            agreedToTerms: booking.agreedToTerms,
          }),
        });
        if (!orderRes.ok) throw new Error("Failed to create order");
        const order = await orderRes.json();
        if (cancelled) return;
        setOrderId(order.id);

        // 2. Create Stripe PaymentIntent (only if Stripe is configured)
        if (stripePromise) {
          const intentRes = await fetch("/api/stripe/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ size: booking.size, orderId: order.id, guestEmail: booking.guestEmail }),
          });
          if (!intentRes.ok) throw new Error("Failed to create payment intent");
          const { clientSecret: secret } = await intentRes.json();
          if (cancelled) return;
          setClientSecret(secret);
        }
      } catch (err: unknown) {
        if (!cancelled) setInitError(err instanceof Error ? err.message : "Initialization error");
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Payment</h1>
        <p className="text-sm text-[#A89080]">Secure payment via Stripe</p>
      </div>

      {/* Price summary */}
      <div className="bg-[#F8F3EC] border border-[#EDE8DF] rounded-3xl p-5 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#7A6252]">Size {booking.size} – {sizeInfo.label}</span>
          <span className="font-medium text-[#1A120B]">{formatCurrency(sizeInfo.price)}</span>
        </div>
        <div className="border-t border-[#EDE8DF] pt-3 flex justify-between">
          <span className="font-bold text-[#1A120B]">Pay now</span>
          <span className="text-xl font-black text-[#1A120B]">{formatCurrency(sizeInfo.price)}</span>
        </div>
        <p className="text-xs text-[#A89080]">Estimated max (oversized): {formatCurrency(sizeInfo.maxPrice)}</p>
        <p className="text-xs text-[#7A6252] bg-white border border-[#EDE8DF] rounded-xl px-3 py-2">
          If the carrier measures a different size, the price adjusts automatically. No action needed.
        </p>
      </div>

      {/* Payment form */}
      {initError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700">
          {initError}
        </div>
      )}

      {!orderId && !initError && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {orderId && stripePromise && clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#1A120B",
                colorBackground: "#FFFFFF",
                colorText: "#1A120B",
                colorDanger: "#dc2626",
                fontFamily: "system-ui, sans-serif",
                borderRadius: "16px",
              },
            },
          }}
        >
          <CheckoutForm orderId={orderId} price={sizeInfo.price} onSuccess={onSuccess} />
        </Elements>
      )}

      {orderId && !stripePromise && (
        <DemoPayForm orderId={orderId} price={sizeInfo.price} onSuccess={onSuccess} />
      )}

      <div className="flex items-center justify-center gap-1.5 text-xs text-[#A89080]">
        <Lock size={12} />
        <span>Secured by Stripe. Your card details are never stored.</span>
      </div>
    </div>
  );
}
