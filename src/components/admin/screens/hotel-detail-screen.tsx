"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Building2, MapPin, Phone, Mail, User, Truck, Clock, Printer, Package, FileText, ToggleLeft, ToggleRight } from "lucide-react"
import type { Hotel } from "@/types"

interface HotelDetailScreenProps {
  hotelId: string
  onBack: () => void
}

const COLLECTION_METHOD_LABELS: Record<string, string> = {
  fixed_time: "Fixed time pickup",
  on_demand: "On-demand pickup",
  drop_off: "Hotel drop-off to depot",
}

const PRINTER_TYPE_LABELS: Record<string, string> = {
  bluetooth_thermal: "Bluetooth thermal",
  usb_thermal: "USB thermal",
  none: "No printer",
}

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === "") return null
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-44">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">{display}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

export function HotelDetailScreen({ hotelId, onBack }: HotelDetailScreenProps) {
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)

  useEffect(() => {
    fetch(`/api/hotels/${hotelId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: Hotel | null) => {
        if (!data) setError("Hotel not found")
        else setHotel(data)
      })
      .catch(() => setError("Failed to load hotel"))
      .finally(() => setLoading(false))
  }, [hotelId])

  const handleToggleStatus = async () => {
    if (!hotel || togglingStatus) return
    setTogglingStatus(true)
    const newStatus = hotel.status === "active" ? "paused" : "active"
    try {
      const res = await fetch(`/api/hotels/${hotelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) setHotel((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch {
      // ignore
    } finally {
      setTogglingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading hotel details...</p>
      </div>
    )
  }

  if (error || !hotel) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-destructive text-sm">{error || "Hotel not found"}</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors mt-0.5"
          aria-label="Back to hotel list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{hotel.name}</h1>
            {hotel.branchName && hotel.branchName !== "Main" && (
              <span className="text-muted-foreground text-base">({hotel.branchName})</span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              hotel.status === "active"
                ? "bg-foreground/10 text-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {hotel.status === "active" ? "Active" : "Paused"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{hotel.id}</p>
        </div>

        {/* Toggle active/paused */}
        <button
          onClick={handleToggleStatus}
          disabled={togglingStatus}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {hotel.status === "active"
            ? <><ToggleRight className="w-4 h-4 text-foreground" /> Pause hotel</>
            : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /> Activate hotel</>
          }
        </button>
      </div>

      <div className="space-y-4">
        {/* Basic info */}
        <Section title="Hotel information" icon={<Building2 className="w-4 h-4" />}>
          <Row label="Hotel name" value={hotel.name} />
          <Row label="Branch name" value={hotel.branchName} />
          <Row label="Full address" value={hotel.address} />
          <Row label="Postal code" value={hotel.postalCode} />
          <Row label="Prefecture" value={hotel.prefecture} />
          <Row label="City" value={hotel.city} />
          <Row label="Street" value={hotel.addressLine1} />
        </Section>

        {/* Contact */}
        <Section title="Contact" icon={<User className="w-4 h-4" />}>
          <Row label="Contact name" value={hotel.contactName} />
          <Row label="Phone" value={hotel.contactPhone} />
          <Row label="Email" value={hotel.contactEmail} />
        </Section>

        {/* Delivery & carrier */}
        <Section title="Delivery & carrier" icon={<Truck className="w-4 h-4" />}>
          <Row label="Carrier" value={hotel.carrier === "yamato" ? "Yamato Transport" : hotel.carrier === "sagawa" ? "Sagawa Express" : hotel.carrier} />
          <Row label="Collection method" value={hotel.collectionMethod ? COLLECTION_METHOD_LABELS[hotel.collectionMethod] ?? hotel.collectionMethod : undefined} />
          <Row label="Cutoff time" value={hotel.cutoffTime} />
          <Row label="Same-day delivery" value={hotel.sameDayDelivery} />
        </Section>

        {/* Receiving rules */}
        <Section title="Receiving rules" icon={<Clock className="w-4 h-4" />}>
          <Row label="Receiving hours start" value={hotel.receiptStartTime} />
          <Row label="Max daily items" value={hotel.maxDailyItems} />
          <Row label="Storage location" value={hotel.storageLocation} />
        </Section>

        {/* Printer & label */}
        <Section title="Printer & label" icon={<Printer className="w-4 h-4" />}>
          <Row label="Printer type" value={PRINTER_TYPE_LABELS[hotel.printerType] ?? hotel.printerType} />
          <Row label="Label size" value={hotel.labelSize} />
        </Section>

        {/* Stats */}
        <Section title="Stats" icon={<Package className="w-4 h-4" />}>
          <Row label="Daily order count" value={hotel.dailyOrderCount} />
        </Section>

        {/* Operational notes */}
        {hotel.operationalNotes && (
          <Section title="Operational notes (admin only)" icon={<FileText className="w-4 h-4" />}>
            <p className="text-sm text-foreground py-3 leading-relaxed whitespace-pre-wrap">{hotel.operationalNotes}</p>
          </Section>
        )}
      </div>
    </div>
  )
}
