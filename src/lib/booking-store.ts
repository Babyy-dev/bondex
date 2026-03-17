// sessionStorage-based booking store for demo data sharing across roles
// Traveler saves → Hotel Staff & Admin read

export type IssueType = "payment_failure" | "uncollected" | "carrier_exception" | "size_mismatch" | "other"

export interface BookingMessage {
  id: string
  type: "info" | "warning" | "action_required"
  issueType?: IssueType
  title: string
  body: string
  createdAt: string
  readAt?: string
}

export const ISSUE_TEMPLATES: Record<IssueType, { title: string; body: string; type: BookingMessage["type"] }> = {
  payment_failure: {
    title: "Payment issue",
    body: "Your payment could not be processed. Please update your payment method to avoid delivery delays.",
    type: "action_required",
  },
  uncollected: {
    title: "Luggage not collected",
    body: "Your luggage has not been collected at the hotel. Please contact the front desk or reach out to BondEx support.",
    type: "action_required",
  },
  carrier_exception: {
    title: "Delivery delay",
    body: "There is an issue with your delivery. Our team is working to resolve it. We will notify you once the situation is updated.",
    type: "warning",
  },
  size_mismatch: {
    title: "Size adjustment",
    body: "The measured size of your luggage differs from what was declared. A price adjustment will be applied to your payment method.",
    type: "warning",
  },
  other: {
    title: "Message from BondEx",
    body: "",
    type: "info",
  },
}

export interface StoredBooking {
  orderId: string
  status: "confirmed" | "waiting" | "checked_in" | "picked_up" | "in_transit" | "delivered"
  createdAt: string

  // Destination (Step 1)
  destination: {
    name: string
    address: string
    type: string
    checkInDate: string
    bookingName: string
    recipientName: string
  }

  // Delivery Date (Step 2)
  deliveryDate: string

  // Luggage Items (Step 3)
  items: Array<{
    size: string
    weight: number
    photos: string[]  // blob URLs (session only)
  }>

  // Contact (Step 4)
  contact: {
    email: string
    phone: string
    verified: boolean
  }

  // Payment (Step 5)
  payment: {
    method: string
    amount: number
    maxAmount: number
  }

  // Messages from Admin/CS
  messages: BookingMessage[]
}

const STORAGE_KEY = "bondex_bookings"

function readAll(): StoredBooking[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(bookings: StoredBooking[]): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}

/** Generate a BDX-XXXX order ID */
export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BDX-${num}`
}

/** Save a new booking from Traveler flow */
export function saveBooking(booking: StoredBooking): void {
  const all = readAll()
  // Prevent duplicates
  const exists = all.findIndex((b) => b.orderId === booking.orderId)
  if (exists >= 0) {
    all[exists] = booking
  } else {
    all.unshift(booking) // newest first
  }
  writeAll(all)
  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent("bondex-booking-updated"))
}

/** Get all bookings (newest first) */
export function getAllBookings(): StoredBooking[] {
  return readAll()
}

/** Get a single booking by orderId */
export function getBookingById(orderId: string): StoredBooking | null {
  return readAll().find((b) => b.orderId === orderId) || null
}

/** Update booking status */
export function updateBookingStatus(orderId: string, status: StoredBooking["status"]): void {
  const all = readAll()
  const booking = all.find((b) => b.orderId === orderId)
  if (booking) {
    booking.status = status
    writeAll(all)
    window.dispatchEvent(new CustomEvent("bondex-booking-updated"))
  }
}

/** Add a message to a booking */
export function addMessage(orderId: string, message: Omit<BookingMessage, "id" | "createdAt">): void {
  const all = readAll()
  const booking = all.find((b) => b.orderId === orderId)
  if (booking) {
    if (!booking.messages) booking.messages = []
    booking.messages.push({
      ...message,
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    })
    writeAll(all)
    window.dispatchEvent(new CustomEvent("bondex-booking-updated"))
  }
}

/** Mark a message as read */
export function markMessageRead(orderId: string, messageId: string): void {
  const all = readAll()
  const booking = all.find((b) => b.orderId === orderId)
  if (booking?.messages) {
    const msg = booking.messages.find((m) => m.id === messageId)
    if (msg && !msg.readAt) {
      msg.readAt = new Date().toISOString()
      writeAll(all)
      window.dispatchEvent(new CustomEvent("bondex-booking-updated"))
    }
  }
}

/** Get unread message count for a booking */
export function getUnreadCount(orderId: string): number {
  const booking = getBookingById(orderId)
  if (!booking?.messages) return 0
  return booking.messages.filter((m) => !m.readAt).length
}
