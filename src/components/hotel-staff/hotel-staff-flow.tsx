"use client"

import { useState } from "react"
import { LoginScreen } from "./screens/login-screen"
import { OrderListScreen } from "./screens/order-list-screen"
import { CheckInScreen } from "./screens/check-in-screen"
import { AcceptSuccessScreen } from "./screens/accept-success-screen"
import { ExceptionScreen } from "./screens/exception-screen"
import { OrderDetailScreen } from "./screens/order-detail-screen"
import { I18nProvider } from "./i18n"

type Screen = "login" | "order-list" | "check-in" | "accept-success" | "exception" | "order-detail"

interface HotelStaffFlowProps {
  onBack: () => void
  initialStep?: string | null
  initialOrderId?: string | null
}

// State machine: CREATED -> PAID -> RECEIVED_BY_HOTEL -> IN_TRANSIT -> DELIVERED
// States are immutable and system-determined. No human can change them.
export type OrderStatus = "waiting" | "ready" | "flagged"

// No rejection reasons - system handles asynchronously
export interface Order {
  id: string
  guestName: string
  itemCount: number
  size: string
  checkInDate: string
  status: OrderStatus
  qrCode: string
  travelerPhotos?: string[] // max 2, reference only
  hotelPhotos?: string[] // continuous stream, official record
  flagged?: boolean // system handles asynchronously
  tracking?: {
    carrier: string
    trackingNumber: string
    deliveryStatus: "waiting" | "in-transit" | "at-depot" | "delivered"
  }
}

export function HotelStaffFlow({ onBack, initialStep, initialOrderId }: HotelStaffFlowProps) {
  return (
    <I18nProvider>
      <HotelStaffFlowInner onBack={onBack} initialStep={initialStep} initialOrderId={initialOrderId} />
    </I18nProvider>
  )
}

function HotelStaffFlowInner({ onBack, initialStep, initialOrderId }: HotelStaffFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (initialStep && ["login", "order-list", "check-in", "accept-success", "exception", "order-detail"].includes(initialStep)) {
      return initialStep as Screen
    }
    return "login"
  })
  const [isLoggedIn, setIsLoggedIn] = useState(!!(initialStep && initialStep !== "login"))
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(() =>
    initialOrderId ? { id: initialOrderId, guestName: "", itemCount: 1, size: "M", checkInDate: "Today", status: "waiting", qrCode: initialOrderId } : null
  )

  const handleLogin = () => {
    setIsLoggedIn(true)
    setCurrentScreen("order-list")
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentScreen("login")
  }

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setCurrentScreen("order-detail")
  }

  const handleScanOrder = (order: Order) => {
    setSelectedOrder(order)
    setCurrentScreen("check-in")
  }

  // Photo capture auto-finalizes "Received by Hotel"
  // Liability shifts at photo timestamp
  const handlePhotoCaptured = () => {
    setCurrentScreen("accept-success")
  }

  // Flag issue: no reason input, system handles asynchronously
  const handleFlagIssue = () => {
    if (selectedOrder) {
      setSelectedOrder({ ...selectedOrder, status: "flagged", flagged: true })
    }
    setCurrentScreen("exception")
  }

  const handleBackToList = () => {
    setSelectedOrder(null)
    setCurrentScreen("order-list")
  }

  const handleBack = () => {
    if (!isLoggedIn || currentScreen === "login") {
      onBack()
    } else if (currentScreen === "order-list") {
      handleLogout()
    } else {
      handleBackToList()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {currentScreen === "login" && (
        <LoginScreen onLogin={handleLogin} onBack={handleBack} />
      )}
      {currentScreen === "order-list" && (
        <OrderListScreen 
          onSelectOrder={handleSelectOrder}
          onScanOrder={handleScanOrder}
          onLogout={handleLogout}
          onBack={handleBack}
        />
      )}
      {currentScreen === "order-detail" && selectedOrder && (
        <OrderDetailScreen
          order={selectedOrder}
          onBack={handleBackToList}
        />
      )}
      {currentScreen === "check-in" && selectedOrder && (
        <CheckInScreen
          order={selectedOrder}
          onPhotoCaptured={handlePhotoCaptured}
          onFlagIssue={handleFlagIssue}
          onBack={handleBackToList}
        />
      )}
      {currentScreen === "accept-success" && selectedOrder && (
        <AcceptSuccessScreen
          order={selectedOrder}
          onDone={handleBackToList}
        />
      )}
      {currentScreen === "exception" && (
        <ExceptionScreen
          type="qr-damaged"
          onBack={handleBackToList}
        />
      )}
    </div>
  )
}
