"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TravelerFlow } from "@/components/traveler/traveler-flow"

function BookContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [initialStep, setInitialStep] = useState<string | null>("destination")

  useEffect(() => {
    const paymentIntent = searchParams.get("payment_intent")
    const redirectStatus = searchParams.get("redirect_status")
    const orderId = searchParams.get("order_id")
    const step = searchParams.get("step")

    if (paymentIntent && redirectStatus) {
      // Stripe 3DS redirect return
      if (redirectStatus === "succeeded") {
        setInitialStep("completion")
        if (orderId) {
          // Store orderId in sessionStorage so CompletionScreen can access it
          sessionStorage.setItem("stripe_redirect_order_id", orderId)
        }
      } else {
        // Payment failed or requires action — go back to payment step
        setInitialStep("payment")
      }
    } else if (step) {
      setInitialStep(step)
    }
  }, [searchParams])

  return (
    <TravelerFlow
      onBack={() => router.push("/")}
      initialStep={initialStep}
    />
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <BookContent />
    </Suspense>
  )
}
