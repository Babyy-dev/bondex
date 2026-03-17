"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CreditCard, Lock, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BookingData } from "../traveler-flow"
import { getSizeInfo } from "@/lib/pricing"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface PaymentScreenProps {
  data: BookingData
  onUpdate: (data: BookingData) => void
  onNext: () => void
  onBack: () => void
}

// Inner form that uses Stripe hooks (must be inside <Elements>)
function StripeCardForm({
  data,
  onNext,
  isProcessing,
  setIsProcessing,
  setPaymentError,
}: {
  data: BookingData
  onNext: () => void
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
  setPaymentError: (v: string | null) => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    setIsProcessing(true)
    setPaymentError(null)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/book?step=completion&order_id=" + (data.orderId || ""),
      },
    })
    if (error) {
      setPaymentError(error.message || "Payment failed. Please try again.")
      setIsProcessing(false)
    }
    // On success, Stripe redirects to return_url — onNext() would only be called in redirect flow
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        onClick={handleSubmit}
        disabled={!stripe || isProcessing}
        className="w-full h-12"
      >
        {isProcessing ? "Processing..." : `Pay`}
      </Button>
    </div>
  )
}

export function PaymentScreen({ data, onUpdate, onNext, onBack }: PaymentScreenProps) {
  const [paymentMethod, setPaymentMethod] = useState<"apple" | "google" | "card" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchingSecret, setFetchingSecret] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [apiAmount, setApiAmount] = useState<number | null>(null)

  const calculatePrice = () =>
    data.items.reduce((sum, item) => sum + getSizeInfo(item.size).price, 0)

  const calculateMaxPrice = () =>
    data.items.reduce((sum, item) => sum + getSizeInfo(item.size).maxPrice, 0)

  const totalPrice = apiAmount ?? calculatePrice()
  const estimatedMax = calculateMaxPrice()

  // Fetch payment intent when component mounts (order should already be created)
  useEffect(() => {
    if (!data.orderId) return
    setFetchingSecret(true)
    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sizes: data.items.map((i) => i.size),
        size: data.items[0]?.size || "M",
        orderId: data.orderId,
        guestEmail: data.contact.email,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.clientSecret) {
          setClientSecret(json.clientSecret)
          if (json.amount) setApiAmount(json.amount)
        } else {
          setPaymentError("Could not initialize payment. Please try again.")
        }
      })
      .catch(() => {
        setPaymentError("Could not initialize payment. Please try again.")
      })
      .finally(() => setFetchingSecret(false))
  }, [data.orderId, data.items, data.contact.email])

  // Wallet pay handlers — fall back to mock for demo (no real wallet integration without Stripe)
  const handleWalletPay = (method: "apple" | "google") => {
    setPaymentMethod(method)
    setIsProcessing(true)
    setTimeout(() => {
      onNext()
    }, 1500)
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          disabled={isProcessing}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Payment</h1>
          <p className="text-sm text-muted-foreground">Step 5 of 6</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-5">

        {/* Pricing breakdown */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="space-y-2">
            {data.items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>Item {index + 1} ({item.size})</span>
                </div>
                <span className="text-muted-foreground">
                  ¥{getSizeInfo(item.size).price.toLocaleString()}
                </span>
              </div>
            ))}

            <div className="pt-3 mt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pay now</span>
                <span className="font-bold text-lg">{"\u00a5"}{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Estimated total (max)</span>
                <span>{"\u00a5"}{estimatedMax.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Auto-charge explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-3">
            <p className="text-sm font-semibold text-foreground leading-snug mb-1">
              Up to {"\u00a5"}{estimatedMax.toLocaleString()} may be charged automatically
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the carrier measures a different size, the difference (up to the estimated max) will be charged to this payment method automatically. No action needed from you. You{"'"}ll receive an email notification with the updated amount.
            </p>
          </div>
        </div>

        {/* Wallet payments - primary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Secure payment</span>
          </div>

          {/* Apple Pay */}
          <button
            onClick={() => handleWalletPay("apple")}
            disabled={isProcessing}
            className="w-full h-12 rounded-lg bg-foreground text-background font-medium text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isProcessing && paymentMethod === "apple" ? (
              "Processing..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Pay
              </>
            )}
          </button>

          {/* Google Pay */}
          <button
            onClick={() => handleWalletPay("google")}
            disabled={isProcessing}
            className="w-full h-12 rounded-lg bg-card border border-border font-medium text-base flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isProcessing && paymentMethod === "google" ? (
              "Processing..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Pay
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Credit card — real Stripe PaymentElement */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CreditCard className="w-4 h-4" />
            <span>Credit card</span>
          </div>

          {paymentError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{paymentError}</p>
            </div>
          )}

          {fetchingSecret && (
            <div className="text-sm text-muted-foreground text-center py-4">Initializing payment...</div>
          )}

          {!fetchingSecret && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCardForm
                data={data}
                onNext={onNext}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                setPaymentError={setPaymentError}
              />
            </Elements>
          )}

          {!fetchingSecret && !clientSecret && !paymentError && !data.orderId && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Order not yet created — complete previous steps first.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
