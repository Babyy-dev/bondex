"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CreditCard, Lock, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
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
function StripePaymentForm({
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
    // On success, Stripe redirects to return_url
  }

  return (
    <div className="space-y-4">
      {/* PaymentElement auto-shows Apple Pay / Google Pay at the top when browser supports it */}
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["apple_pay", "google_pay", "card"],
        }}
      />
      <Button
        onClick={handleSubmit}
        disabled={!stripe || isProcessing}
        className="w-full h-12"
      >
        {isProcessing ? "Processing..." : "Pay now"}
      </Button>
    </div>
  )
}

export function PaymentScreen({ data, onUpdate, onNext, onBack }: PaymentScreenProps) {
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

  // Fetch payment intent when component mounts
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
                <span className="font-bold text-lg">¥{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Estimated total (max)</span>
                <span>¥{estimatedMax.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Auto-charge explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the carrier measures a different size, the difference (up to the estimated max) will be charged automatically. No action needed from you.
            </p>
          </div>
        </div>

        {/* Secure payment + Stripe PaymentElement */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Secure payment via Stripe</span>
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
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <StripePaymentForm
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
              Complete previous steps first.
            </p>
          )}
        </div>

        {/* Credit card info line */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Apple Pay, Google Pay, and all major credit cards accepted</span>
        </div>
      </div>
    </div>
  )
}
