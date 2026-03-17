"use client"

import { Suspense } from "react"
import { I18nProvider } from "@/components/hotel-staff/i18n"
import { CheckInScreen } from "@/components/hotel-staff/screens/check-in-screen"
import { useRouter } from "next/navigation"
import type { Order } from "@/components/hotel-staff/hotel-staff-flow"

const DEMO_ORDER: Order = {
  id: "BDX-0001",
  guestName: "Demo Guest",
  itemCount: 1,
  size: "M",
  checkInDate: new Date().toISOString().split("T")[0],
  status: "waiting",
  qrCode: "BDX-0001",
}

function ScanContent() {
  const router = useRouter()
  return (
    <I18nProvider>
      <CheckInScreen
        order={DEMO_ORDER}
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
