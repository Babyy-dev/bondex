"use client"

import { HotelStaffFlow } from "@/components/hotel-staff/hotel-staff-flow"
import { useRouter } from "next/navigation"

export default function HotelExceptionPage() {
  const router = useRouter()
  return (
    <HotelStaffFlow
      initialStep="exception"
      onBack={() => router.push("/hotel/orders")}
    />
  )
}
