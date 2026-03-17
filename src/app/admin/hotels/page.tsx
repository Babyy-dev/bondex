"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useRouter } from "next/navigation"

export default function AdminHotelsPage() {
  const router = useRouter()
  return <AdminDashboard initialScreen="hotels" onBack={() => router.push("/admin/dashboard")} />
}
