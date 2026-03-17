"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminHotelsNewPage() {
  const router = useRouter()
  return <AdminDashboard initialScreen="hotel-register" onBack={() => router.push("/admin/hotels")} />
}
