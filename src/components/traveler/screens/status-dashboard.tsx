"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, CheckCircle, Clock, Truck, Package, MapPin, Building2, Copy, Check, Info, AlertTriangle, Bell, X } from "lucide-react"
import type { BookingData } from "../traveler-flow"
import { getBookingById, markMessageRead, type BookingMessage } from "@/lib/booking-store"
import type { Order, OrderStatus } from "@/types"

interface StatusDashboardProps {
  data: BookingData
  onBack: () => void
}

type StatusKey = "scheduled" | "received" | "in-transit" | "delivered"

interface StatusStep {
  key: StatusKey
  label: string
  description: string
  icon: React.ReactNode
}

function mapApiStatusToKey(status: OrderStatus): StatusKey {
  const map: Record<OrderStatus, StatusKey> = {
    CREATED: "scheduled",
    PAID: "scheduled",
    CHECKED_IN: "received",
    HANDED_TO_CARRIER: "in-transit",
    IN_TRANSIT: "in-transit",
    DELIVERED: "delivered",
    AUTO_CANCELLED: "scheduled",
    CARRIER_REFUSED: "scheduled",
  }
  return map[status] || "scheduled"
}

export function StatusDashboard({ data, onBack }: StatusDashboardProps) {
  const [copiedTracking, setCopiedTracking] = useState(false)
  const [messages, setMessages] = useState<BookingMessage[]>([])
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set())
  const [apiOrder, setApiOrder] = useState<Order | null>(null)

  const orderId = data.orderId || "BX-DEMO123"

  // Fetch real order from API
  const fetchOrder = useCallback(() => {
    if (!orderId || orderId === "BX-DEMO123") return
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((order: Order | null) => {
        if (order) setApiOrder(order)
      })
      .catch(() => {})
  }, [orderId])

  // Load live status and messages from booking store (fallback)
  const loadLiveData = useCallback(() => {
    const live = getBookingById(orderId)
    if (live?.messages) {
      setMessages([...live.messages])
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    loadLiveData()
    // Poll every 10 seconds
    const interval = setInterval(fetchOrder, 10000)
    const h = () => loadLiveData()
    window.addEventListener("bondex-booking-updated", h)
    return () => {
      clearInterval(interval)
      window.removeEventListener("bondex-booking-updated", h)
    }
  }, [fetchOrder, loadLiveData])

  // Determine current status: real API first, fallback to sessionStorage
  let currentStatus: StatusKey
  if (apiOrder) {
    currentStatus = mapApiStatusToKey(apiOrder.status)
  } else {
    const liveBooking = getBookingById(orderId)
    const mapLocalStatus = (s?: string): StatusKey => {
      if (!s) return "scheduled"
      const map: Record<string, StatusKey> = {
        confirmed: "scheduled",
        waiting: "scheduled",
        checked_in: "received",
        picked_up: "in-transit",
        in_transit: "in-transit",
        delivered: "delivered",
      }
      return map[s] || "scheduled"
    }
    currentStatus = liveBooking ? mapLocalStatus(liveBooking.status) : "scheduled"
  }

  const handleMarkRead = (msgId: string) => {
    markMessageRead(orderId, msgId)
    setDismissedMessages((prev) => new Set(prev).add(msgId))
  }

  const visibleMessages = messages.filter((m) => !dismissedMessages.has(m.id))
  // Use real tracking number from API if available
  const trackingNumber = apiOrder?.trackingNumber || "—"
  const carrierName = apiOrder?.carrier || "Yamato Transport"
  const deliveryDest = data.destination.name || "Narita Airport Terminal 1"
  const deliveryDate = data.deliveryDate.selected || "Feb 8, 2026"

  const trackingAvailableStatuses: StatusKey[] = ["in-transit", "delivered"]
  const showTracking = trackingAvailableStatuses.includes(currentStatus) && trackingNumber !== "—"

  const steps: StatusStep[] = [
    {
      key: "scheduled",
      label: "Scheduled",
      description: "Your delivery has been registered",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      key: "received",
      label: "Received by hotel",
      description: "Hotel has recorded your luggage",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: "in-transit",
      label: "In transit",
      description: "Your luggage is on the way",
      icon: <Truck className="w-4 h-4" />,
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Your luggage has arrived",
      icon: <MapPin className="w-4 h-4" />,
    },
  ]

  const currentIndex = steps.findIndex(s => s.key === currentStatus)

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber)
    setCopiedTracking(true)
    setTimeout(() => setCopiedTracking(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border bg-card">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Delivery status</h1>
          <p className="text-xs text-muted-foreground font-mono">{orderId}</p>
        </div>
      </header>

      {/* Content - entirely view-only, no action buttons */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Current status - system-determined, prominent */}
        <div className="p-4 rounded-xl bg-foreground text-background">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center shrink-0">
              {steps[currentIndex].icon}
            </div>
            <div>
              <p className="font-bold text-base">{steps[currentIndex].label}</p>
              <p className="text-sm text-background/70">{steps[currentIndex].description}</p>
            </div>
          </div>
          <p className="text-xs text-background/50 mt-3">Last updated: Just now</p>
        </div>

        {/* Notifications from Admin/CS */}
        {visibleMessages.length > 0 && (
          <div className="space-y-3">
            {visibleMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border relative ${
                  msg.type === "action_required"
                    ? "border-destructive/40 bg-destructive/5"
                    : msg.type === "warning"
                      ? "border-yellow-500/40 bg-yellow-500/5"
                      : "border-border bg-card"
                }`}
              >
                <button
                  onClick={() => handleMarkRead(msg.id)}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.type === "action_required" ? "bg-destructive/10" :
                    msg.type === "warning" ? "bg-yellow-500/10" :
                    "bg-muted"
                  }`}>
                    {msg.type === "action_required" ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : msg.type === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{msg.title}</p>
                      {!msg.readAt && (
                        <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{msg.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline - read-only state visualization */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="space-y-0">
            {steps.map((step, index) => {
              const isComplete = index < currentIndex
              const isCurrent = index === currentIndex

              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isCurrent 
                        ? "bg-foreground text-background" 
                        : isComplete 
                          ? "bg-foreground/80 text-background" 
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {step.icon}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-px h-8 ${isComplete ? "bg-foreground/40" : "bg-border"}`} />
                    )}
                  </div>
                  <div className={`pb-6 ${index === steps.length - 1 ? "pb-0" : ""}`}>
                    <p className={`text-sm leading-7 ${
                      isCurrent 
                        ? "font-bold text-foreground" 
                        : isComplete 
                          ? "font-medium text-foreground" 
                          : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tracking number - read-only, copy only */}
        {showTracking && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Carrier tracking</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{carrierName}</p>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">{trackingNumber}</p>
              </div>
              <button
                onClick={handleCopyTracking}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Copy tracking number"
              >
                {copiedTracking ? (
                  <Check className="w-4 h-4 text-foreground" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Destination - read-only */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Delivering to</p>
          <p className="text-sm font-semibold text-foreground">{deliveryDest}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{deliveryDate}</p>
        </div>

        {/* Items - read-only */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Items</p>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-foreground">
              {data.items.length > 0 ? `${data.items.length} item${data.items.length > 1 ? "s" : ""} (${data.items[0]?.size || "M"})` : "1 item (M)"}
            </p>
          </div>
        </div>

        {/* Reassurance - calm, declarative */}
        <div className="rounded-xl bg-muted/40 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>If delivery is delayed, it may be held at a carrier office near your destination.</p>
            <p>{"You'll"} receive an email notification when your luggage is delivered.</p>
            <p>Contact BondEx support if you need assistance.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
