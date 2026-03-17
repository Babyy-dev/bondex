"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminDashboardPage() {
  const router = useRouter()
  return (
    <AdminDashboard
      onBack={() => router.push("/")}
      initialScreen="overview"
    />
  )
}
