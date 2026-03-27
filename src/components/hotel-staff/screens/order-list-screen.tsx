"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, QrCode, Package, LogOut, Scan, ChevronDown, ChevronUp, Printer, Clock, Truck, CheckCircle2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Order, OrderStatus } from "../hotel-staff-flow"
import { useI18n } from "../i18n"
import { LanguageSwitcher } from "../language-switcher"
import { getAllBookings, type StoredBooking } from "@/lib/booking-store"
import type { Order as ApiOrder, OrderStatus as ApiOrderStatus } from "@/types"

interface OrderListScreenProps {
  onSelectOrder: (order: Order) => void
  onScanOrder: (order: Order) => void
  onLogout: () => void
  onBack: () => void
}

const mockOrders: Order[] = [
  { id: "BX-A1B2C3", guestName: "Tanaka Yuki", itemCount: 2, size: "M", checkInDate: "Today", status: "flagged", qrCode: "qr1", flagged: true },
  { id: "BX-D4E5F6", guestName: "Smith John", itemCount: 1, size: "L", checkInDate: "Today", status: "waiting", qrCode: "qr2", travelerPhotos: ["/placeholder.svg", "/placeholder.svg"] },
  { id: "BX-G7H8I9", guestName: "Mueller Hans", itemCount: 3, size: "M", checkInDate: "Today", status: "waiting", qrCode: "qr3", travelerPhotos: ["/placeholder.svg"] },
  { id: "BX-J0K1L2", guestName: "Lee Min-Jun", itemCount: 1, size: "S", checkInDate: "Today", status: "ready", qrCode: "qr4", tracking: { carrier: "Yamato Transport", trackingNumber: "1234-5678-9012", deliveryStatus: "waiting" } },
  { id: "BX-M3N4O5", guestName: "Garcia Maria", itemCount: 2, size: "M", checkInDate: "Tomorrow", status: "waiting", qrCode: "qr5" },
  { id: "BX-P6Q7R8", guestName: "Suzuki Hana", itemCount: 1, size: "LL", checkInDate: "Feb 10", status: "ready", qrCode: "qr6", tracking: { carrier: "Sagawa Express", trackingNumber: "9876-5432-1098", deliveryStatus: "in-transit" } },
  { id: "BX-S9T0U1", guestName: "Williams James", itemCount: 2, size: "L", checkInDate: "Today", status: "ready", qrCode: "qr7", tracking: { carrier: "Yamato Transport", trackingNumber: "5555-6666-7777", deliveryStatus: "delivered" } },
]

/** Convert StoredBooking to Hotel Staff Order */
function toHotelOrder(b: StoredBooking): Order {
  return {
    id: b.orderId,
    guestName: b.destination.recipientName || b.destination.bookingName,
    itemCount: b.items.length || 1,
    size: b.items[0]?.size || "M",
    checkInDate: "Today",
    status: "waiting" as OrderStatus,
    qrCode: b.orderId,
    travelerPhotos: b.items.flatMap((i) => i.photos).slice(0, 3),
  }
}

/** Map real API OrderStatus to hotel-staff OrderStatus */
function mapApiStatus(s: ApiOrderStatus): OrderStatus {
  if (s === "PAID") return "waiting"
  if (s === "CHECKED_IN" || s === "HANDED_TO_CARRIER" || s === "IN_TRANSIT" || s === "DELIVERED") return "ready"
  if (s === "CARRIER_REFUSED") return "flagged"
  return "waiting"
}

/** Convert real API Order to Hotel Staff Order */
function fromApiOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    guestName: o.guestName,
    itemCount: 1,
    size: o.size,
    checkInDate: "Today",
    status: mapApiStatus(o.status),
    qrCode: o.id,
    travelerPhotos: o.photoUrls,
    flagged: o.flagged,
    tracking: o.trackingNumber ? {
      carrier: o.carrier || "Yamato Transport",
      trackingNumber: o.trackingNumber,
      deliveryStatus: o.status === "DELIVERED" ? "delivered" : o.status === "IN_TRANSIT" ? "in-transit" : "waiting",
    } : undefined,
  }
}

type StatusFilter = "all" | OrderStatus

const STATUS_CONFIG: Record<OrderStatus, {
  icon: typeof Clock
  bgClass: string
  pillClass: string
}> = {
  flagged: {
    icon: AlertTriangle,
    bgClass: "bg-foreground text-background",
    pillClass: "bg-foreground text-background",
  },
  waiting: {
    icon: Clock,
    bgClass: "bg-muted text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
  ready: {
    icon: Truck,
    bgClass: "bg-muted text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
}

export function OrderListScreen({ onSelectOrder, onScanOrder, onLogout }: OrderListScreenProps) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [reissueOrderId, setReissueOrderId] = useState<string | null>(null)
  const [reissueSuccess, setReissueSuccess] = useState<string | null>(null)
  const [liveOrders, setLiveOrders] = useState<Order[]>([])
  const [apiOrders, setApiOrders] = useState<Order[]>([])

  // Read hotel session info
  const hotelSession = (() => {
    if (typeof window === "undefined") return { hotelCode: "", hotelName: "" }
    try { return JSON.parse(sessionStorage.getItem("bondex_hotel_session") || "{}") } catch { return {} }
  })()
  const hotelCode: string = hotelSession.hotelCode || ""
  const hotelName: string = hotelSession.hotelName || hotelCode

  // Fetch real orders from API — filtered to this hotel
  const fetchApiOrders = useCallback(() => {
    const url = hotelCode ? `/api/orders?hotelId=${encodeURIComponent(hotelCode)}` : "/api/orders"
    fetch(url)
      .then((res) => res.ok ? res.json() : [])
      .then((orders: ApiOrder[]) => {
        if (Array.isArray(orders)) {
          setApiOrders(orders.map(fromApiOrder))
        }
      })
      .catch(() => {})
  }, [hotelCode])

  const loadLiveOrders = useCallback(() => {
    const bookings = getAllBookings()
    setLiveOrders(bookings.map(toHotelOrder))
  }, [])

  useEffect(() => {
    fetchApiOrders()
    loadLiveOrders()
    // Poll API every 30 seconds
    const interval = setInterval(fetchApiOrders, 30000)
    const handler = () => loadLiveOrders()
    window.addEventListener("bondex-booking-updated", handler)
    return () => {
      clearInterval(interval)
      window.removeEventListener("bondex-booking-updated", handler)
    }
  }, [fetchApiOrders, loadLiveOrders])

  // Real data only: API orders first, then any sessionStorage orders not yet in DB
  const allOrders = [...apiOrders, ...liveOrders].filter(
    (order, idx, arr) => arr.findIndex((o) => o.id === order.id) === idx
  )

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guestName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesFilter
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const priority = (order: Order) => {
      if (order.status === "flagged") return 0
      if (order.status === "waiting" && order.checkInDate === "Today") return 1
      if (order.status === "waiting") return 2
      return 3
    }
    return priority(a) - priority(b)
  })

  const flaggedCount = allOrders.filter(o => o.status === "flagged").length

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "flagged": return t("status.flagged")
      case "waiting": return t("status.waiting")
      case "ready": return t("status.ready")
    }
  }

  const handleReissue = (orderId: string) => {
    setReissueOrderId(null)
    setReissueSuccess(orderId)
    setTimeout(() => setReissueSuccess(null), 3000)
  }

  const canReissue = (status: OrderStatus) => status === "waiting" || status === "ready"

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t("orders.filterAll") },
    { value: "flagged", label: t("status.flagged") },
    { value: "waiting", label: t("status.waiting") },
    { value: "ready", label: t("status.ready") },
  ]

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="font-semibold text-lg text-foreground">{t("header.title")}</h1>
            {hotelName && <p className="text-sm text-muted-foreground">{hotelName}</p>}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={onLogout} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label={t("header.logout")}>
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search and scan */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("orders.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={() => setShowScanner(!showScanner)} variant="outline" className="px-4 bg-transparent">
            <Scan className="w-5 h-5" />
          </Button>
        </div>

        {/* Status filter pills - system-assigned, non-editable */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === option.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {/* QR Scanner */}
      {showScanner && (
        <div className="p-4 bg-foreground">
          <div className="aspect-square max-w-xs mx-auto rounded-lg bg-foreground/90 border-2 border-dashed border-background/50 flex flex-col items-center justify-center">
            <QrCode className="w-16 h-16 text-background/50 mb-2" />
            <p className="text-background/70 text-sm">{t("orders.scanQr")}</p>
          </div>
          <Button
            onClick={() => {
              setShowScanner(false)
              const order = allOrders.find(o => o.status === "waiting")
              if (order) onScanOrder(order)
            }}
            variant="secondary"
            className="w-full mt-4"
          >
            {t("orders.simulateScan")}
          </Button>
        </div>
      )}

      {/* Flagged banner - system-generated, no staff action */}
      {flaggedCount > 0 && (
        <div className="p-3 bg-foreground/5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-foreground" />
            <span className="font-medium text-sm">{flaggedCount} {t("orders.flaggedItems")}</span>
            <span className="text-xs text-muted-foreground ml-1">{t("orders.systemHandling")}</span>
          </div>
        </div>
      )}

      {/* Status Legend (collapsible) */}
      <div className="border-b border-border">
        <button onClick={() => setShowLegend(!showLegend)} className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/30 transition-colors">
          <span>{t("legend.title")}</span>
          {showLegend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showLegend && (
          <div className="px-4 pb-3 space-y-2">
            {([
              { status: "waiting" as const, descKey: "statusDesc.waiting" },
              { status: "ready" as const, descKey: "statusDesc.ready" },
              { status: "flagged" as const, descKey: "statusDesc.flagged" },
            ]).map(({ status, descKey }) => {
              const config = STATUS_CONFIG[status]
              const Icon = config.icon
              return (
                <div key={status} className="flex items-start gap-3 py-1.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${config.bgClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{getStatusLabel(status)}</p>
                    <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reissue success toast */}
      {reissueSuccess && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-foreground text-background flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t("reissue.success")}</span>
        </div>
      )}

      {/* Order list */}
      <div className="flex-1 overflow-auto">
        {sortedOrders.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedOrders.map((order) => {
              const config = STATUS_CONFIG[order.status]
              const StatusIcon = config.icon
              const isToday = order.checkInDate === "Today"

              return (
                <div key={order.id}>
                  <div onClick={() => onSelectOrder(order)} className="w-full p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bgClass}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-foreground ${isToday ? "font-bold" : ""}`}>{order.guestName}</span>
                            {order.status === "flagged" && (
                              <span className="px-2 py-0.5 rounded-full bg-foreground text-background text-xs font-medium">{t("status.flagged")}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.itemCount} {order.itemCount > 1 ? t("orders.items") : t("orders.item")} ({order.size})
                            {" · "}
                            {t("orders.checkin")}:{" "}
                            {isToday ? (
                              <span className="font-semibold text-foreground">{t("orders.today")}</span>
                            ) : (
                              order.checkInDate === "Tomorrow" ? t("orders.tomorrow") : order.checkInDate
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${config.pillClass}`}>
                          <StatusIcon className="w-3 h-3" />
                          {getStatusLabel(order.status)}
                        </span>
                        {canReissue(order.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReissueOrderId(order.id) }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                          >
                            <Printer className="w-3 h-3" />
                            {t("reissue.button")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">{t("orders.noOrders")}</h3>
            <p className="text-sm text-muted-foreground">{searchQuery ? t("orders.tryDifferent") : t("orders.noOrdersSub")}</p>
          </div>
        )}
      </div>

      {/* Reissue confirmation modal */}
      {reissueOrderId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="absolute inset-0" onClick={() => setReissueOrderId(null)} />
          <div className="relative bg-card w-full max-w-md rounded-t-2xl border-t border-border p-6 pb-8">
            <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
              <Printer className="w-6 h-6 text-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-center mb-2">{t("reissue.title")}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{t("reissue.warning")}</p>
            <div className="flex gap-3">
              <Button onClick={() => setReissueOrderId(null)} variant="outline" className="flex-1 bg-transparent">{t("reissue.cancel")}</Button>
              <Button onClick={() => handleReissue(reissueOrderId)} className="flex-1">{t("reissue.reissueLabel")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
