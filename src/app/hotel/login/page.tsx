"use client"

import { I18nProvider } from "@/components/hotel-staff/i18n"
import { LoginScreen } from "@/components/hotel-staff/screens/login-screen"
import { useRouter } from "next/navigation"

export default function HotelLoginPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <I18nProvider>
        <LoginScreen
          onLogin={() => router.push("/hotel/orders")}
          onBack={() => router.push("/")}
        />
      </I18nProvider>
    </div>
  )
}
