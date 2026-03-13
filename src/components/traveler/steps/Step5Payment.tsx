"use client";
import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock, Hotel, CalendarDays, Package, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSizeInfo } from "@/lib/pricing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BookingState } from "@/types";
import toast from "react-hot-toast";

const DEST_ICON: Record<string, string> = {
  airport: "✈️", hotel: "🏨", station: "🚉", depot: "📦", other: "📍",
};

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ?? false;

// ── Stripe checkout form ──────────────────────────────────────────────────────

interface FormProps {
  orderId: string;
  price: number;
  onSuccess: (orderId: string) => void;
}

function StripeCheckoutForm({ orderId, price, onSuccess }: FormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading,        setLoading]        = useState(false);
  const [elementsReady,  setElementsReady]  = useState(false);
  const [expressVisible, setExpressVisible] = useState(false);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);

  // Verifies payment server-side before marking order paid
  const verifyAndComplete = useCallback(async (paymentIntentId: string) => {
    const res = await fetch("/api/stripe/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, orderId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Payment verification failed");
    }
    toast.success("Payment confirmed!");
    onSuccess(orderId);
  }, [orderId, onSuccess]);

  // ── Express checkout (Apple Pay / Google Pay) ──────────────────────────
  const handleExpressConfirm = useCallback(async () => {
    if (!stripe || !elements) return;
    setErrorMsg(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/book?order_id=${orderId}` },
        redirect: "if_required",
      });
      if (result.error) {
        toast.error(result.error.message ?? "Wallet payment failed");
        return;
      }
      if (result.paymentIntent) {
        await verifyAndComplete(result.paymentIntent.id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }, [stripe, elements, verifyAndComplete]);

  // ── Card submit ────────────────────────────────────────────────────────
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/book?order_id=${orderId}` },
        redirect: "if_required",
      });
      if (result.error) {
        // Show user-facing errors inline; log unexpected ones
        setErrorMsg(result.error.message ?? "Payment failed. Please try again.");
        return;
      }
      if (result.paymentIntent) {
        await verifyAndComplete(result.paymentIntent.id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Test mode hint */}
      {isTestMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-amber-800">Test mode — no real charge</p>
          <p className="text-xs text-amber-700">
            Use card <span className="font-mono font-bold">4242 4242 4242 4242</span>
            {" "}· any future MM/YY · any 3-digit CVC
          </p>
        </div>
      )}

      {/* Express checkout — Apple Pay / Google Pay */}
      <ExpressCheckoutElement
        onConfirm={handleExpressConfirm}
        onReady={({ availablePaymentMethods }) => {
          if (availablePaymentMethods) setExpressVisible(true);
        }}
        options={{
          buttonType: { applePay: "buy", googlePay: "buy" },
          layout: { maxColumns: 1, maxRows: 2, overflow: "auto" },
        }}
      />

      {/* "or" separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#EDE8DF]" />
        <span className="text-xs text-[#A89080] font-medium">
          {expressVisible ? "or pay with card" : "Pay with card"}
        </span>
        <div className="flex-1 h-px bg-[#EDE8DF]" />
      </div>

      {/* Card form */}
      <form onSubmit={handleCardSubmit} className="flex flex-col gap-4">
        <div className="bg-white border border-[#EDE8DF] rounded-3xl p-5">
          <p className="text-sm font-semibold text-[#44342A] mb-4">Credit / Debit Card</p>

          {/* Spinner while Stripe Elements mounts */}
          {!elementsReady && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className={elementsReady ? "" : "invisible h-0 overflow-hidden"}>
            <PaymentElement
              onReady={() => setElementsReady(true)}
              options={{ layout: "tabs" }}
            />
          </div>
        </div>

        {/* Inline card error */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <Button
          type="submit"
          disabled={!stripe || !elementsReady || loading}
          loading={loading}
          size="lg"
          className="w-full"
        >
          Pay {formatCurrency(price)}
        </Button>
      </form>
    </div>
  );
}



// ── Outer component ───────────────────────────────────────────────────────────

interface Props { booking: BookingState; onSuccess: (orderId: string) => void; }

export function Step5Payment({ booking, onSuccess }: Props) {
  const sizeInfo = getSizeInfo(booking.size ?? "M");
  const [orderId,      setOrderId]      = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError,    setInitError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            size: booking.size,
            fromHotel: booking.fromHotel,
            fromHotelId: booking.fromHotelId,
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

  const addr     = booking.toAddress;
  const destIcon = DEST_ICON[booking.destinationType ?? "other"];
  const destName = addr?.facilityName
    || [addr?.street, addr?.city, addr?.prefecture].filter(Boolean).join(", ")
    || "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Review &amp; Pay</h1>
        <p className="text-sm text-[#A89080]">Confirm your booking details before payment</p>
      </div>

      {/* Booking summary */}
      <div className="bg-white border border-[#EDE8DF] rounded-3xl overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide">Booking summary</p>
        </div>

        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Hotel size={15} className="text-[#7A6252]" />
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Pickup</p>
            <p className="text-sm font-semibold text-[#1A120B]">{booking.fromHotel}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5 text-base">
            {destIcon}
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Deliver to</p>
            <p className="text-sm font-semibold text-[#1A120B]">{destName}</p>
            {addr?.postalCode && (
              <p className="text-xs text-[#A89080] mt-0.5">
                〒{addr.postalCode} {addr.prefecture} {addr.city}{addr.street ? ` ${addr.street}` : ""}{addr.building ? ` ${addr.building}` : ""}
              </p>
            )}
            {addr?.recipientName && (
              <p className="text-xs text-[#7A6252] mt-0.5">Recipient: {addr.recipientName}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5">
            <CalendarDays size={15} className="text-[#7A6252]" />
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Delivery date</p>
            <p className="text-sm font-semibold text-[#1A120B]">
              {booking.deliveryDate ? formatDate(booking.deliveryDate) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Package size={15} className="text-[#7A6252]" />
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Luggage</p>
            <p className="text-sm font-semibold text-[#1A120B]">Size {booking.size} – {sizeInfo.label}</p>
            <p className="text-xs text-[#A89080]">{sizeInfo.description}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail size={15} className="text-[#7A6252]" />
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Confirmation sent to</p>
            <p className="text-sm font-semibold text-[#1A120B]">{booking.guestEmail ?? "—"}</p>
            {booking.guestPhone && <p className="text-xs text-[#A89080] mt-0.5">{booking.guestPhone}</p>}
          </div>
        </div>
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
          If the carrier measures a different size, the price adjusts automatically. No action needed from you.
        </p>
      </div>

      {/* Init error */}
      {initError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700">
          {initError}
        </div>
      )}

      {/* Loading while order/intent is being created */}
      {!orderId && !initError && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Stripe payment form */}
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
          <StripeCheckoutForm orderId={orderId} price={sizeInfo.price} onSuccess={onSuccess} />
        </Elements>
      )}

      {orderId && !stripePromise && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Payment unavailable</p>
          <p className="text-xs text-red-700 mt-1">Stripe is not configured. Please contact support.</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 text-xs text-[#A89080]">
        <Lock size={12} />
        <span>Secured by Stripe. Your card details are never stored.</span>
      </div>
    </div>
  );
}
