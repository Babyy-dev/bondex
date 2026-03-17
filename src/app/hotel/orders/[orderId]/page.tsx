"use client"

import { use } from "react"
import { HotelStaffFlow } from "@/components/hotel-staff/hotel-staff-flow"
import { useRouter } from "next/navigation"

export default function HotelOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  return (
    <HotelStaffFlow
      initialStep="order-detail"
      initialOrderId={orderId}
      onBack={() => router.push("/hotel/orders")}
    />
  )
}
