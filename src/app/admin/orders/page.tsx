"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminOrdersPage() {
  const router = useRouter()
  return <AdminDashboard initialScreen="orders" onBack={() => router.push("/admin/dashboard")} />
}
