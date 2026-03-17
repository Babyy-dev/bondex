"use client"

import { HotelStaffFlow } from "@/components/hotel-staff/hotel-staff-flow"
import { useRouter } from "next/navigation"

export default function HotelOrdersPage() {
  const router = useRouter()
  return (
    <HotelStaffFlow
      onBack={() => router.push("/")}
      initialStep="order-list"
    />
  )
}
