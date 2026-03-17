"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminPaymentsPage() {
  const router = useRouter()
  return <AdminDashboard initialScreen="payment-failure" onBack={() => router.push("/admin/dashboard")} />
}
