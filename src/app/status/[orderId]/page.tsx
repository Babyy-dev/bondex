"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { StatusDashboard } from "@/components/traveler/screens/status-dashboard"
import type { BookingData } from "@/components/traveler/traveler-flow"

export default function StatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()

  // Minimal BookingData — StatusDashboard reads live data from booking-store using orderId
  const data: BookingData = {
    orderId,
    destination: { name: "", address: "", type: "", checkInDate: "", bookingName: "" },
    deliveryDate: { earliest: "", selected: "" },
    items: [],
    contact: { email: "", phone: "" },
  }

  return <StatusDashboard data={data} onBack={() => router.push("/")} />
}
