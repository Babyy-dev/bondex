"use client"

import React from "react"

import { useState } from "react"
import { ArrowLeft, Building2, Truck, Printer, Clock, MapPin, Save, ChevronDown, ChevronUp, Info } from "lucide-react"

interface HotelRegisterScreenProps {
  onBack: () => void
}

type CarrierType = "yamato" | "sagawa"
type PrinterType = "bluetooth_thermal" | "usb_thermal" | "none"
type PickupMethod = "scheduled" | "on_demand" | "hotel_drop_off"

interface HotelFormData {
  // Basic info
  name: string
  branchName: string
  postalCode: string
  prefecture: string
  city: string
  street: string
  building: string
  phone: string
  contactName: string
  contactEmail: string
  // Delivery settings
  carrier: CarrierType
  pickupMethod: PickupMethod
  scheduledPickupTime: string
  cutoffTime: string
  sameDay: boolean
  // Receiving settings
  receivingHoursStart: string
  receivingHoursEnd: string
  maxDailyPackages: number
  storageLocation: string
  // Printer & label
  printerType: PrinterType
  labelSize: "62mm" | "100mm"
  // Notes
  operationalNotes: string
}

const PREFECTURES = [
  "Tokyo", "Osaka", "Kyoto", "Hokkaido", "Okinawa", "Kanagawa", "Chiba",
  "Saitama", "Aichi", "Fukuoka", "Hyogo", "Hiroshima", "Miyagi", "Nara",
  "Nagano", "Shizuoka", "Yamanashi",
]

export function HotelRegisterScreen({ onBack }: HotelRegisterScreenProps) {
  const [form, setForm] = useState<HotelFormData>({
    name: "",
    branchName: "",
    postalCode: "",
    prefecture: "",
    city: "",
    street: "",
    building: "",
    phone: "",
    contactName: "",
    contactEmail: "",
    carrier: "yamato",
    pickupMethod: "scheduled",
    scheduledPickupTime: "17:00",
    cutoffTime: "15:00",
    sameDay: false,
    receivingHoursStart: "08:00",
    receivingHoursEnd: "21:00",
    maxDailyPackages: 20,
    storageLocation: "",
    printerType: "bluetooth_thermal",
    labelSize: "62mm",
    operationalNotes: "",
  })

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    delivery: true,
    receiving: true,
    printer: true,
    notes: false,
  })

  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateForm = (updates: Partial<HotelFormData>) => {
    setForm(prev => ({ ...prev, ...updates }))
    setSaved(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const body = {
        name: form.name,
        branchName: form.branchName || undefined,
        address: `${form.street}, ${form.city}, ${form.prefecture} ${form.postalCode}`,
        addressLine1: form.street,
        city: form.city,
        prefecture: form.prefecture,
        postalCode: form.postalCode,
        status: "active" as const,
        carrier: form.carrier,
        cutoffTime: form.cutoffTime,
        printerType: form.printerType,
        labelSize: form.labelSize,
        contactName: form.contactName,
        contactPhone: form.phone,
        contactEmail: form.contactEmail,
        collectionMethod: form.pickupMethod === "hotel_drop_off" ? "drop_off" : form.pickupMethod === "on_demand" ? "on_demand" : "fixed_time",
        sameDayDelivery: form.sameDay,
        maxDailyItems: form.maxDailyPackages,
        storageLocation: form.storageLocation || undefined,
        operationalNotes: form.operationalNotes || undefined,
        receiptStartTime: form.receivingHoursStart,
      }
      const res = await fetch("/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          onBack()
        }, 1500)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveError(err.error || "Failed to register hotel. Please try again.")
      }
    } catch {
      setSaveError("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = form.name && form.postalCode && form.prefecture && form.city && form.street && form.phone && form.contactName && form.contactEmail

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to hotel list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Register new hotel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define delivery behavior, pickup rules, and carrier settings.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Section 1: Basic Information */}
        <SectionCard
          title="Hotel information"
          icon={<Building2 className="w-4 h-4" />}
          expanded={expandedSections.basic}
          onToggle={() => toggleSection("basic")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Hotel name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g. Park Hyatt Tokyo"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
              <FormField label="Branch name">
                <input
                  type="text"
                  value={form.branchName}
                  onChange={(e) => updateForm({ branchName: e.target.value })}
                  placeholder="e.g. Shinjuku, Main"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Postal code" required>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => updateForm({ postalCode: e.target.value })}
                  placeholder="163-1055"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
              <FormField label="Prefecture" required>
                <select
                  value={form.prefecture}
                  onChange={(e) => updateForm({ prefecture: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select</option>
                  {PREFECTURES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="City" required>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateForm({ city: e.target.value })}
                  placeholder="Shinjuku-ku"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Street address" required>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => updateForm({ street: e.target.value })}
                  placeholder="3-7-1-2 Nishi-Shinjuku"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
              <FormField label="Building / floor">
                <input
                  type="text"
                  value={form.building}
                  onChange={(e) => updateForm({ building: e.target.value })}
                  placeholder="39F"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
            </div>

            {/* Contact */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">Staff contact for operations</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Contact name" required>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => updateForm({ contactName: e.target.value })}
                    placeholder="Tanaka Taro"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
                <FormField label="Email" required>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => updateForm({ contactEmail: e.target.value })}
                    placeholder="front@hotel.com"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
                <FormField label="Phone" required>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder="03-1234-5678"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Delivery & Carrier */}
        <SectionCard
          title="Delivery & carrier"
          icon={<Truck className="w-4 h-4" />}
          expanded={expandedSections.delivery}
          onToggle={() => toggleSection("delivery")}
        >
          <div className="space-y-4">
            <FormField label="Carrier">
              <div className="flex gap-3">
                {([
                  { value: "yamato", label: "Yamato Transport" },
                  { value: "sagawa", label: "Sagawa Express" },
                ] as const).map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateForm({ carrier: option.value })}
                    className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.carrier === option.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Pickup method">
              <div className="flex gap-3">
                {([
                  { value: "scheduled", label: "Scheduled", desc: "Fixed daily pickup" },
                  { value: "on_demand", label: "On demand", desc: "Call when ready" },
                  { value: "hotel_drop_off", label: "Hotel drop-off", desc: "Hotel brings to depot" },
                ] as const).map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateForm({ pickupMethod: option.value })}
                    className={`flex-1 px-3 py-3 rounded-lg border text-left transition-all ${
                      form.pickupMethod === option.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <div className={`text-sm font-medium ${form.pickupMethod === option.value ? "text-foreground" : "text-foreground"}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
                  </button>
                ))}
              </div>
            </FormField>

            {form.pickupMethod === "scheduled" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Scheduled pickup time">
                  <input
                    type="time"
                    value={form.scheduledPickupTime}
                    onChange={(e) => updateForm({ scheduledPickupTime: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
                <FormField label="Cutoff time" hint="Orders after this time ship next day">
                  <input
                    type="time"
                    value={form.cutoffTime}
                    onChange={(e) => updateForm({ cutoffTime: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="sameDay"
                checked={form.sameDay}
                onChange={(e) => updateForm({ sameDay: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="sameDay" className="text-sm text-foreground cursor-pointer">
                Same-day delivery available
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                If enabled, orders before cutoff can arrive same day
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Receiving rules */}
        <SectionCard
          title="Receiving rules"
          icon={<Clock className="w-4 h-4" />}
          expanded={expandedSections.receiving}
          onToggle={() => toggleSection("receiving")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Receiving hours start">
                <input
                  type="time"
                  value={form.receivingHoursStart}
                  onChange={(e) => updateForm({ receivingHoursStart: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
              <FormField label="Receiving hours end">
                <input
                  type="time"
                  value={form.receivingHoursEnd}
                  onChange={(e) => updateForm({ receivingHoursEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FormField>
            </div>

            <FormField label="Max daily packages" hint="Maximum packages this hotel can receive per day">
              <input
                type="number"
                value={form.maxDailyPackages}
                onChange={(e) => updateForm({ maxDailyPackages: parseInt(e.target.value) || 0 })}
                min={1}
                max={200}
                className="w-32 px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Storage location" hint="Where packages are stored before guest pickup">
              <input
                type="text"
                value={form.storageLocation}
                onChange={(e) => updateForm({ storageLocation: e.target.value })}
                placeholder="e.g. Bell desk, Back office, Luggage room B1"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Section 4: Printer & Label */}
        <SectionCard
          title="Printer & label"
          icon={<Printer className="w-4 h-4" />}
          expanded={expandedSections.printer}
          onToggle={() => toggleSection("printer")}
        >
          <div className="space-y-4">
            <FormField label="Printer type">
              <div className="flex gap-3">
                {([
                  { value: "bluetooth_thermal", label: "Bluetooth thermal" },
                  { value: "usb_thermal", label: "USB thermal" },
                  { value: "none", label: "No printer" },
                ] as const).map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateForm({ printerType: option.value })}
                    className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.printerType === option.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormField>

            {form.printerType !== "none" && (
              <FormField label="Label size">
                <div className="flex gap-3">
                  {([
                    { value: "62mm", label: "62mm", desc: "Standard" },
                    { value: "100mm", label: "100mm", desc: "Wide" },
                  ] as const).map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateForm({ labelSize: option.value })}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        form.labelSize === option.value
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {option.label} <span className="font-normal text-xs opacity-70">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </FormField>
            )}

            {form.printerType === "none" && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">
                  Without a printer, hotel staff will need to handwrite labels or use a shared office printer. This may slow down operations.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Section 5: Operational notes */}
        <SectionCard
          title="Operational notes"
          icon={<MapPin className="w-4 h-4" />}
          expanded={expandedSections.notes}
          onToggle={() => toggleSection("notes")}
        >
          <FormField label="Internal notes" hint="Only visible to Admin. Not shown to hotel staff or guests.">
            <textarea
              value={form.operationalNotes}
              onChange={(e) => updateForm({ operationalNotes: e.target.value })}
              rows={4}
              placeholder="e.g. Delivery entrance via B1 parking lot. Contact security first. Closed on Wednesdays."
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </FormField>
        </SectionCard>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background border-t border-border mt-6 -mx-8 px-8 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            This defines operational settings only. Contract terms are managed separately.
          </p>
          {saveError && (
            <p className="text-xs text-destructive mt-1">{saveError}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isValid && !isSaving
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : saved ? "Saved!" : "Register hotel"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* Reusable section card */
function SectionCard({ 
  title, icon, expanded, onToggle, children 
}: { 
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}

/* Reusable form field */
function FormField({ 
  label, required, hint, children 
}: { 
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}
