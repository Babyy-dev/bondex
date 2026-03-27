"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { I18nProvider } from "@/components/hotel-staff/i18n"
import { CheckInScreen } from "@/components/hotel-staff/screens/check-in-screen"
import type { Order } from "@/components/hotel-staff/hotel-staff-flow"
import type { Order as ApiOrder } from "@/types"

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!orderId)

  useEffect(() => {
    if (!orderId) return
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: ApiOrder | null) => {
        if (!data) { setError("Order not found"); return }
        setOrder({
          id: data.id,
          guestName: data.guestName,
          itemCount: 1,
          size: data.size,
          checkInDate: data.deliveryDate,
          status: data.status === "CARRIER_REFUSED" ? "flagged" :
                  data.status === "PAID" || data.status === "CREATED" ? "waiting" : "ready",
          qrCode: data.id,
          travelerPhotos: data.photoUrls,
          flagged: data.flagged,
        })
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false))
  }, [orderId])

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground text-sm">
            Scan a traveler QR code to check in their luggage.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            URL format: /hotel/scan?orderId=ORD-XXXX
          </p>
          <button
            onClick={() => router.push("/hotel/orders")}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
          >
            Go to Order List
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-destructive text-sm">{error || "Order not found"}</p>
          <button
            onClick={() => router.push("/hotel/orders")}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
          >
            Back to Order List
          </button>
        </div>
      </div>
    )
  }

  return (
    <I18nProvider>
      <CheckInScreen
        order={order}
        onPhotoCaptured={() => router.push("/hotel/orders")}
        onFlagIssue={() => router.push("/hotel/orders")}
        onBack={() => router.push("/hotel/orders")}
      />
    </I18nProvider>
  )
}

export default function HotelScanPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }>
        <ScanContent />
      </Suspense>
    </div>
  )
}
