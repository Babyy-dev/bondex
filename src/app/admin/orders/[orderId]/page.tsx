"use client"

import { use } from "react"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  return (
    <AdminDashboard
      initialScreen="order-detail"
      initialOrderId={orderId}
      onBack={() => router.push("/admin/orders")}
    />
  )
}
