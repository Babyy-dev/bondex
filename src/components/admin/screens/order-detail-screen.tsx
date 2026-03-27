"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ArrowLeft, User, MapPin, Package, CreditCard, Camera, Edit2, Save, AlertTriangle, Truck, Send, MessageSquare, Bell, ChevronDown, Clock, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getBookingById, updateBookingStatus, addMessage, ISSUE_TEMPLATES, type IssueType, type BookingMessage, type StoredBooking } from "@/lib/booking-store"
import type { Order as ApiOrder } from "@/types"

interface OrderDetailScreenProps {
  orderId: string
  onBack: () => void
}

const fallbackOrder = {
  id: "BX-A1B2C3",
  guestName: "Tanaka Yuki",
  guestEmail: "tanaka@example.com",
  guestPhone: "+81 90-1234-5678",
  itemCount: 2,
  items: [
    { id: "1", size: "M" as const, actualSize: "L" as const },
    { id: "2", size: "S" as const, actualSize: "S" as const },
  ],
  status: "in_transit" as const,
  paymentStatus: "paid" as "paid" | "failed" | "surcharge-pending",
  hotelName: "Park Hyatt Tokyo",
  hotelAddress: "3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo",
  trackingNumber: "1234567890",
  createdAt: "2026-02-02T10:30:00Z",
  checkInDate: "2026-02-05",
  deliveryDate: "2026-02-06",
  evidencePhotos: ["photo1", "photo2"],
  price: 7000,
  surchargePending: 1000,
  labelUrl: "",
}

export function OrderDetailScreen({ orderId, onBack }: OrderDetailScreenProps) {
  const [apiOrder, setApiOrder] = useState<ApiOrder | null>(null)

  // Fetch real order from API on mount
  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((order: ApiOrder | null) => {
        if (order) setApiOrder(order)
      })
      .catch(() => {})
  }, [orderId])

  // Try API order first, then sessionStorage booking, then fallback mock
  const mockOrder = useMemo(() => {
    if (apiOrder) {
      return {
        id: apiOrder.id,
        guestName: apiOrder.guestName,
        guestEmail: apiOrder.guestEmail,
        guestPhone: apiOrder.guestPhone,
        itemCount: 1,
        items: [{ id: "1", size: apiOrder.size as "S" | "M" | "L" | "LL", actualSize: apiOrder.size as "S" | "M" | "L" | "LL" }],
        status: (apiOrder.status === "PAID" || apiOrder.status === "CREATED") ? "checked-in" as const : "in-transit" as const,
        paymentStatus: "paid" as "paid" | "failed" | "surcharge-pending",
        hotelName: apiOrder.fromHotel,
        hotelAddress: [apiOrder.toAddress?.facilityName, apiOrder.toAddress?.city, apiOrder.toAddress?.prefecture].filter(Boolean).join(", "),
        trackingNumber: apiOrder.trackingNumber || "",
        createdAt: apiOrder.createdAt,
        checkInDate: apiOrder.checkedInAt ? new Date(apiOrder.checkedInAt).toLocaleDateString("ja-JP") : apiOrder.toAddress?.facilityName || "",
        deliveryDate: apiOrder.deliveryDate,
        evidencePhotos: apiOrder.photoUrls || [],
        price: apiOrder.basePrice,
        surchargePending: Math.max(0, (apiOrder.totalPrice || apiOrder.basePrice) - apiOrder.basePrice),
        labelUrl: apiOrder.labelUrl || "",
      }
    }
    const live = getBookingById(orderId)
    if (live) {
      const prices: Record<string, number> = { S: 2500, M: 3500, L: 4500, LL: 5500 }
      const basePrice = live.items.reduce((sum, i) => sum + (prices[i.size] || 3500), 0)
      return {
        id: live.orderId,
        guestName: live.destination.recipientName || live.destination.bookingName,
        guestEmail: live.contact.email,
        guestPhone: live.contact.phone,
        itemCount: live.items.length || 1,
        items: live.items.map((item, idx) => ({
          id: String(idx + 1),
          size: item.size as "S" | "M" | "L" | "LL",
          actualSize: item.size as "S" | "M" | "L" | "LL",
        })),
        status: live.status === "confirmed" ? "checked-in" as const : "in-transit" as const,
        paymentStatus: "paid" as "paid" | "failed" | "surcharge-pending",
        hotelName: live.destination.name,
        hotelAddress: live.destination.address,
        trackingNumber: "",
        createdAt: live.createdAt,
        checkInDate: live.destination.checkInDate,
        deliveryDate: live.deliveryDate,
        evidencePhotos: live.items.flatMap((i) => i.photos),
        price: basePrice,
        surchargePending: 0,
        labelUrl: "",
      }
    }
    return fallbackOrder
  }, [orderId, apiOrder])
  const [newSize, setNewSize] = useState<string>("")
  const [isEditingSize, setIsEditingSize] = useState(false)
  const [isEditingTracking, setIsEditingTracking] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [sizeNote, setSizeNote] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [showSlipModal, setShowSlipModal] = useState(false)

  // Status change
  const isLiveBooking = !!getBookingById(orderId)
  const statuses: StoredBooking["status"][] = ["confirmed", "waiting", "checked_in", "picked_up", "in_transit", "delivered", "carrier_refused", "auto_cancelled"]
  const statusLabels: Record<string, string> = { confirmed: "Confirmed", waiting: "Waiting", checked_in: "Checked In", picked_up: "Picked Up", in_transit: "In Transit", delivered: "Delivered", carrier_refused: "Carrier Refused", auto_cancelled: "Auto Cancelled" }
  const [currentStatus, setCurrentStatus] = useState<string>(mockOrder.status)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // Sync state when API order loads
  useEffect(() => {
    if (apiOrder) {
      if (apiOrder.trackingNumber) setTrackingNumber(apiOrder.trackingNumber)
      setCurrentStatus(
        apiOrder.status === "DELIVERED" ? "delivered" :
        apiOrder.status === "IN_TRANSIT" ? "in_transit" :
        apiOrder.status === "HANDED_TO_CARRIER" ? "picked_up" :
        apiOrder.status === "CHECKED_IN" ? "checked_in" :
        apiOrder.status === "PAID" ? "waiting" :
        apiOrder.status === "CARRIER_REFUSED" ? "carrier_refused" :
        apiOrder.status === "AUTO_CANCELLED" ? "auto_cancelled" : "confirmed"
      )
    }
  }, [apiOrder])

  // Issue & messaging
  const [selectedIssue, setSelectedIssue] = useState<IssueType | "">("")
  const [messageTitle, setMessageTitle] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [messageSent, setMessageSent] = useState(false)
  const [messages, setMessages] = useState<BookingMessage[]>([])

  const loadMessages = useCallback(() => {
    const live = getBookingById(orderId)
    if (live?.messages) setMessages([...live.messages])
  }, [orderId])

  useEffect(() => {
    loadMessages()
    const h = () => loadMessages()
    window.addEventListener("bondex-booking-updated", h)
    return () => window.removeEventListener("bondex-booking-updated", h)
  }, [loadMessages])

  const handleStatusChange = (status: StoredBooking["status"]) => {
    if (isLiveBooking) {
      updateBookingStatus(orderId, status)
    }
    // Also PATCH real API order
    if (apiOrder) {
      const apiStatusMap: Record<string, string> = {
        confirmed: "CREATED", waiting: "PAID", checked_in: "CHECKED_IN",
        picked_up: "IN_TRANSIT", in_transit: "IN_TRANSIT", delivered: "DELIVERED",
        carrier_refused: "CARRIER_REFUSED", auto_cancelled: "AUTO_CANCELLED",
      }
      fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatusMap[status] || status.toUpperCase() }),
      }).catch(() => {})
    }
    setCurrentStatus(status)
    setShowStatusDropdown(false)
  }

  const handleIssueSelect = (issue: IssueType) => {
    setSelectedIssue(issue)
    const template = ISSUE_TEMPLATES[issue]
    setMessageTitle(template.title)
    setMessageBody(template.body)
  }

  const handleSendMessage = async () => {
    if (!messageTitle || !messageBody) return
    const issueType = selectedIssue || "other"
    const template = ISSUE_TEMPLATES[issueType as IssueType]
    if (isLiveBooking) {
      addMessage(orderId, {
        type: template?.type || "info",
        issueType: issueType as IssueType,
        title: messageTitle,
        body: messageBody,
      })
    }
    // Also persist csNote to real API
    fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csNote: `[${messageTitle}] ${messageBody}` }),
    }).catch(() => {})
    setMessageSent(true)
    setSelectedIssue("")
    setMessageTitle("")
    setMessageBody("")
    setTimeout(() => setMessageSent(false), 3000)
  }

  const handleSaveSize = async () => {
    if (!sizeNote) {
      alert("Evidence note required for size change")
      return
    }
    if (!newSize) {
      alert("Select the new size")
      return
    }
    // Call charge-difference API to bill surcharge off-session
    try {
      const res = await fetch("/api/stripe/charge-difference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newSize, note: sizeNote }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Failed to process size change")
        return
      }
    } catch {
      alert("Network error processing size change")
      return
    }
    // Also PATCH order with new size + CS note
    fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: newSize, csNote: `Size adjusted: ${sizeNote}` }),
    }).catch(() => {})
    setIsEditingSize(false)
    setNewSize("")
    setSizeNote("")
    // Refresh order data
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((o) => { if (o) setApiOrder(o) })
      .catch(() => {})
  }

  const handleSaveTracking = () => {
    // Persist to real API
    fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber }),
    }).catch(() => {})
    setIsEditingTracking(false)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground font-mono">{orderId}</h1>
          <p className="text-muted-foreground">Order details</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSlipModal(true)}>
          <Printer className="w-4 h-4 mr-2" />
          Print slip
        </Button>
        {mockOrder.labelUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(mockOrder.labelUrl, "_blank")}>
            <Printer className="w-4 h-4 mr-2" />
            Print label
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Status with dropdown */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Status
            </h3>
            <div className="relative mb-4">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                <span>{statusLabels[currentStatus] || currentStatus}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showStatusDropdown ? "rotate-180" : ""}`} />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${s === currentStatus ? "bg-muted font-medium" : ""}`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mockOrder.trackingNumber && (
              <p className="text-sm text-muted-foreground font-mono mb-2">#{mockOrder.trackingNumber}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Select a status to update. Changes are reflected in the Traveler view in real-time.
            </p>
          </div>

          {/* Guest info */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Guest information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{mockOrder.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{mockOrder.guestEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{mockOrder.guestPhone}</span>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Destination
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-medium">{mockOrder.hotelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span>{mockOrder.checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{mockOrder.deliveryDate}</span>
              </div>
            </div>
          </div>

          {/* Manual tracking input */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Tracking number</h3>
              {!isEditingTracking ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTracking(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveTracking}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
            {isEditingTracking ? (
              <div className="space-y-2">
                <Input
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use for handwritten label fallback only
                </p>
              </div>
            ) : (
              <p className="font-mono text-sm">{trackingNumber || "Not set"}</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Items and size control */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items ({mockOrder.itemCount})
              </h3>
              {!isEditingSize ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingSize(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Adjust size
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveSize}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {mockOrder.items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Item {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Declared: {item.size}</span>
                    {item.actualSize !== item.size && (
                      <>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                        <span className="text-sm font-medium text-foreground">Actual: {item.actualSize}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isEditingSize && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">New size (carrier measured)</label>
                  <div className="flex gap-2">
                    {(["S", "M", "L", "LL"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewSize(s)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${newSize === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Evidence note (required)</label>
                  <Input
                    placeholder="Describe the size discrepancy..."
                    value={sizeNote}
                    onChange={(e) => setSizeNote(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Size change triggers automatic off-session surcharge via Stripe
                </p>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base price</span>
                <span>¥{mockOrder.price.toLocaleString()}</span>
              </div>
              {mockOrder.surchargePending > 0 && (
                <div className="flex justify-between text-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Surcharge pending
                  </span>
                  <span className="font-medium">¥{mockOrder.surchargePending.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold">¥{(mockOrder.price + mockOrder.surchargePending).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                mockOrder.paymentStatus === "paid" ? "bg-foreground/10 text-foreground" :
                mockOrder.paymentStatus === "failed" ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>
                {mockOrder.paymentStatus === "paid" && "Paid"}
                {mockOrder.paymentStatus === "failed" && "Failed"}
                {mockOrder.paymentStatus === "surcharge-pending" && "Surcharge pending"}
              </span>
            </div>
          </div>

          {/* Evidence photos */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Evidence photos
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {mockOrder.evidencePhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-lg bg-muted border border-border overflow-hidden hover:border-foreground transition-colors"
                >
                  <img
                    src={photo}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </button>
              ))}
              {mockOrder.evidencePhotos.length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground text-center py-4">
                  No photos uploaded
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Issue Registration & Message Send */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Issue Registration */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Register Issue & Notify User
          </h3>

          {/* Issue Type Selector */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ISSUE_TEMPLATES) as IssueType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleIssueSelect(key)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    selectedIssue === key
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {ISSUE_TEMPLATES[key].title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Edit */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <Input
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="Message title"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Message body</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write a message to the traveler..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSendMessage}
                disabled={!messageTitle || !messageBody}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Traveler
              </Button>
              {messageSent && (
                <span className="text-sm text-green-600 font-medium">Sent</span>
              )}
            </div>
            {!isLiveBooking && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                This is a mock order. Messages will not be persisted. Create a booking from the Traveler flow to test live messaging.
              </p>
            )}
          </div>
        </div>

        {/* Message History */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message History
            {messages.length > 0 && (
              <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {messages.length}
              </span>
            )}
          </h3>

          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {[...messages].reverse().map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border ${
                    msg.type === "action_required" ? "border-destructive/30 bg-destructive/5" :
                    msg.type === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                    "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{msg.title}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      msg.type === "action_required" ? "bg-destructive/10 text-destructive" :
                      msg.type === "warning" ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {msg.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{msg.body}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.readAt ? (
                      <span className="text-green-600">Read</span>
                    ) : (
                      <span>Unread</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Handwritten slip modal (printer fallback) */}
      {showSlipModal && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50" onClick={() => setShowSlipModal(false)}>
          <div
            className="bg-card rounded-lg max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Handwritten Slip — Printer Fallback
              </h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => window.print()}>Print</Button>
                <Button size="sm" variant="outline" onClick={() => setShowSlipModal(false)}>Close</Button>
              </div>
            </div>
            <div id="print-slip" className="p-6 space-y-4 text-sm font-mono">
              <div className="text-center border-b pb-4 mb-4">
                <p className="text-xl font-bold">BondEx — 配送伝票</p>
                <p className="text-xs text-muted-foreground">Handwritten Slip / 手書き伝票</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Order ID / 注文ID</p><p className="font-bold">{mockOrder.id}</p></div>
                <div><p className="text-xs text-muted-foreground">Date / 日付</p><p>{new Date().toLocaleDateString("ja-JP")}</p></div>
                <div><p className="text-xs text-muted-foreground">Guest / ゲスト</p><p>{mockOrder.guestName}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone / 電話</p><p>{mockOrder.guestPhone}</p></div>
                <div><p className="text-xs text-muted-foreground">From / 発送元</p><p>{mockOrder.hotelName}</p></div>
                <div><p className="text-xs text-muted-foreground">Delivery / 配達日</p><p>{mockOrder.deliveryDate}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">To / 配達先</p><p>{mockOrder.hotelAddress}</p></div>
                <div><p className="text-xs text-muted-foreground">Size / サイズ</p><p className="font-bold">{mockOrder.items.map(i => i.size).join(", ")}</p></div>
                <div><p className="text-xs text-muted-foreground">Items / 個数</p><p>{mockOrder.itemCount}</p></div>
              </div>
              {mockOrder.trackingNumber && (
                <div className="border-t pt-4"><p className="text-xs text-muted-foreground">Tracking / 追跡番号</p><p className="font-bold">{mockOrder.trackingNumber}</p></div>
              )}
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div><p>Staff signature / スタッフ署名</p><div className="h-8 border-b border-dashed border-muted-foreground mt-2" /></div>
                <div><p>Guest signature / ゲスト署名</p><div className="h-8 border-b border-dashed border-muted-foreground mt-2" /></div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground border-t pt-3">
                BondEx – Japan Luggage Delivery | Use this slip when printer is unavailable
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="bg-card p-4 rounded-lg max-w-2xl w-full mx-4">
            <img
              src={selectedPhoto}
              alt="Evidence photo"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
