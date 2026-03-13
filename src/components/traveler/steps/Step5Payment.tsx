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

// ── Stripe checkout form ─────────────────────────────────────────────────────

interface FormProps {
  orderId: string;
  price: number;
  onSuccess: (orderId: string) => void;
}

function StripeCheckoutForm({ orderId, price, onSuccess }: FormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [cardLoading,    setCardLoading]    = useState(false);
  const [expressVisible, setExpressVisible] = useState(false);

  const markPaid = useCallback(async () => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    toast.success("Payment confirmed!");
    onSuccess(orderId);
  }, [orderId, onSuccess]);

  // ── Express checkout (Apple Pay / Google Pay) ──────────────────────────
  const handleExpressConfirm = useCallback(async () => {
    if (!stripe || !elements) return;
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/book` },
      redirect: "if_required",
    });
    if (error) {
      toast.error(error.message ?? "Wallet payment failed");
    } else {
      await markPaid();
    }
  }, [stripe, elements, markPaid]);

  // ── Card submit ────────────────────────────────────────────────────────
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setCardLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/book` },
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);
      await markPaid();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setCardLoading(false);
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
            {" "}· any future MM/YY · any CVC
          </p>
        </div>
      )}

      {/* Express checkout — Apple Pay / Google Pay */}
      <div>
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
      </div>

      {/* "or" separator — always visible */}
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
          <div className="p-1">
            <PaymentElement
              options={{
                layout: { type: "accordion", defaultCollapsed: false, radios: false, spacedAccordionItems: false },
              }}
            />
          </div>
        </div>
        <Button type="submit" disabled={!stripe || cardLoading} loading={cardLoading} size="lg" className="w-full">
          Pay {formatCurrency(price)}
        </Button>
      </form>
    </div>
  );
}

// ── Demo mode form (no Stripe key) ────────────────────────────────────────────

function DemoPayForm({ orderId, price, onSuccess }: FormProps) {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry,     setExpiry]     = useState("12/26");
  const [cvc,        setCvc]        = useState("123");

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

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Demo banner with test card hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col gap-1">
        <p className="text-xs font-semibold text-amber-800">Demo mode — no real charge</p>
        <p className="text-xs text-amber-700">
          Test card pre-filled: <span className="font-mono font-bold">4242 4242 4242 4242</span>
          {" "}· Any future date · Any 3-digit CVC
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Click <strong>Pay</strong> below to simulate a successful payment.</p>
      </div>

      {/* Mock Apple Pay button */}
      <button onClick={handlePay} disabled={loading}
        className="w-full h-12 bg-black text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-[0.98] transition-all">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.4.07 2.38.74 3.19.8.93-.17 1.88-.86 3.13-.93 1.46-.08 2.87.52 3.65 1.62-3.31 2-2.78 6.65.67 7.9-.73 1.57-1.67 3.25-2.64 4.47zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        Buy with Apple Pay
      </button>

      {/* Mock Google Pay button */}
      <button onClick={handlePay} disabled={loading}
        className="w-full h-12 bg-white border-2 border-[#EDE8DF] text-[#1A120B] font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#FAFAFA] active:scale-[0.98] transition-all">
        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.98 12.21c0-.63-.06-1.24-.17-1.82H12v3.44h5.6c-.24 1.3-.97 2.41-2.06 3.14v2.61h3.33c1.94-1.79 3.11-4.42 3.11-7.37z" fill="#4285F4"/>
          <path d="M12 22c2.8 0 5.15-.93 6.87-2.52l-3.33-2.61c-.93.62-2.12.99-3.54.99-2.72 0-5.02-1.84-5.84-4.31H2.72v2.69C4.44 19.54 7.98 22 12 22z" fill="#34A853"/>
          <path d="M6.16 13.55A5.97 5.97 0 0 1 5.85 12c0-.54.09-1.07.31-1.55V7.76H2.72A10.01 10.01 0 0 0 2 12c0 1.62.39 3.15 1.07 4.5l3.09-2.95z" fill="#FBBC05"/>
          <path d="M12 6.14c1.53 0 2.91.53 3.99 1.57l2.98-2.98C17.14 3.03 14.79 2 12 2 7.98 2 4.44 4.46 2.72 7.76l3.44 2.69C6.98 7.98 9.28 6.14 12 6.14z" fill="#EA4335"/>
        </svg>
        Buy with Google Pay
      </button>

      {/* "or" separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#EDE8DF]" />
        <span className="text-xs text-[#A89080] font-medium">or pay with card</span>
        <div className="flex-1 h-px bg-[#EDE8DF]" />
      </div>

      {/* Interactive card form with pre-filled test data */}
      <div className="bg-white border border-[#EDE8DF] rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#44342A]">Credit / Debit Card</p>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Test card</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="4242 4242 4242 4242"
          className={inputCls}
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          maxLength={19}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            className={inputCls}
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            maxLength={5}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="CVC"
            className={inputCls}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
          />
        </div>
        <Button onClick={handlePay} loading={loading} size="lg" className="w-full">
          Pay {formatCurrency(price)}
        </Button>
      </div>
    </div>
  );
}

// ── Outer component ───────────────────────────────────────────────────────────

interface Props { booking: BookingState; onSuccess: (orderId: string) => void; }

export function Step5Payment({ booking, onSuccess }: Props) {
  const sizeInfo  = getSizeInfo(booking.size ?? "M");
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

  const addr = booking.toAddress;
  const destIcon = DEST_ICON[booking.destinationType ?? "other"];
  const destName = addr?.facilityName || [addr?.street, addr?.city, addr?.prefecture].filter(Boolean).join(", ") || "—";

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

        {/* Pickup */}
        <div className="flex items-start gap-3 px-5 py-3 border-t border-[#F8F3EC]">
          <div className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Hotel size={15} className="text-[#7A6252]" />
          </div>
          <div>
            <p className="text-xs text-[#A89080] mb-0.5">Pickup</p>
            <p className="text-sm font-semibold text-[#1A120B]">{booking.fromHotel}</p>
          </div>
        </div>

        {/* Destination */}
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

        {/* Date */}
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

        {/* Luggage */}
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

        {/* Contact */}
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

      {/* Error */}
      {initError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700">
          {initError}
        </div>
      )}

      {/* Loading spinner while creating order/intent */}
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

      {/* Demo mode */}
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
