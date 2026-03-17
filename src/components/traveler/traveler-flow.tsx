"use client"

import { useState } from "react"
import { saveBooking, generateOrderId, type StoredBooking } from "@/lib/booking-store"
import { LandingScreen } from "./screens/landing-screen"
import { DestinationScreen } from "./screens/destination-screen"
import { LuggageInputScreen } from "./screens/luggage-input-screen"
import { ContactInfoScreen } from "./screens/contact-info-screen"
import { PaymentScreen } from "./screens/payment-screen"
import { CompletionScreen } from "./screens/completion-screen"
import { StatusDashboard } from "./screens/status-dashboard"
import { Calendar, Clock, ChevronRight, CheckCircle2, ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface BookingData {
  destination: {
    name: string
    address: string
    type: string
    checkInDate: string
    bookingName: string
    recipientName?: string
  }
  deliveryDate: {
    earliest: string
    selected: string
    expectedArrival?: string
    departureTime?: string
  }
  items: Array<{
    id: string
    size: "S" | "M" | "L" | "LL"
    photos: string[]
    estimatedWeight?: number
  }>
  contact: {
    email: string
    phone: string
  }
  orderId?: string
}

interface TravelerFlowProps {
  onBack?: () => void
  initialStep?: string | null
}

const STEP_MAP: Record<string, number> = {
  landing: 0,
  destination: 1,
  "delivery-date": 2,
  luggage: 3,
  contact: 4,
  payment: 5,
  completion: 6,
  status: 7,
}

export function TravelerFlow({ onBack, initialStep }: TravelerFlowProps) {
  const [step, setStep] = useState(() => {
    if (initialStep && initialStep in STEP_MAP) return STEP_MAP[initialStep]
    return 0
  })
  const [data, setData] = useState<BookingData>({
    destination: { name: "", address: "", type: "", checkInDate: "", bookingName: "" },
    deliveryDate: { earliest: "", selected: "", departureTime: "" },
    items: [],
    contact: { email: "", phone: "" },
  })

  const handleUpdate = (updates: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  // --- Step 2: Delivery Date Selection Screen (inline) ---
  const DeliveryDateScreen = () => {
    const destName = data.destination.name || "your destination"

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-8 bg-background animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="p-4 flex items-center gap-4 border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-20">
          <button onClick={() => setStep(1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Delivery date</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Step 2 of 6</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Destination Header */}
          <div className="p-4 rounded-xl bg-muted/50 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <p className="text-sm font-medium leading-tight">
              Select when you want your luggage to arrive at{" "}
              <span className="font-bold text-primary">{destName}</span>
            </p>
          </div>

          {/* Delivery Date Options */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
              Delivery date
            </p>

            <div className="relative group">
              <button className="w-full p-4 rounded-2xl border-2 border-primary bg-primary/5 text-left flex items-center justify-between shadow-lg shadow-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-base">Wed, Feb 18</div>
                  <div className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-black uppercase italic">
                    Earliest
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
              </button>
            </div>

            {["Thu, Feb 19", "Fri, Feb 20", "Sat, Feb 21"].map((date) => (
              <button
                key={date}
                className="w-full p-4 rounded-2xl border border-border bg-card text-left flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <span className="font-bold text-base text-muted-foreground/80">{date}</span>
                <div className="w-5 h-5 rounded-full border border-border" />
              </button>
            ))}
          </div>

          {/* Logistics Promise */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Scheduled to arrive before 12:00</p>
                  <p className="text-[10px] text-muted-foreground">Assigned automatically by system</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-dashed flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">
                Flight time must be after <span className="font-bold text-foreground">14:00</span> on the
                delivery date.
              </p>
            </div>
          </div>

          {/* Good to know */}
          <div className="space-y-3 pt-4 border-t">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-2">
              <Info className="w-3 h-3" /> Good to know
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block">Hotel Front Desk Collection</span>
                  Luggage is received at the hotel front desk. You don{"'"}t need to be present.
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block">Secure Storage</span>
                  Hotel staff will hold your luggage safely until you arrive.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 bg-background border-t border-border sticky bottom-0">
          <Button className="w-full h-14 text-lg font-bold rounded-2xl" onClick={() => setStep(3)}>

            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Step 0: Landing */}
      {step === 0 && <LandingScreen onNext={() => setStep(1)} onBack={() => onBack?.()} />}

      {/* Step 1: Destination */}
      {step === 1 && (
        <DestinationScreen
          data={data}
          onUpdate={handleUpdate}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {/* Step 2: Delivery Date (inline) */}
      {step === 2 && <DeliveryDateScreen />}

      {/* Step 3: Luggage Details (size, photos, weight) */}
      {step === 3 && (
        <LuggageInputScreen
          data={data}
          onUpdate={(d) => setData(d)}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: Contact Info */}
      {step === 4 && (
        <ContactInfoScreen
          data={data}
          onUpdate={(d) => setData(d)}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {/* Step 5: Payment */}
      {step === 5 && (
        <PaymentScreen
          data={data}
          onUpdate={(d) => setData(d)}
          onNext={() => {
            // Save booking to sessionStorage for Hotel Staff / Admin
            const orderId = data.orderId || generateOrderId()
            const stored: StoredBooking = {
              orderId,
              status: "confirmed",
              createdAt: new Date().toISOString(),
              destination: {
                name: data.destination.name,
                address: data.destination.address,
                type: data.destination.type,
                checkInDate: data.destination.checkInDate,
                bookingName: data.destination.bookingName,
                recipientName: (data.destination as Record<string, string>).recipientName || data.destination.bookingName,
              },
              deliveryDate: data.deliveryDate.selected || data.deliveryDate.earliest || "2026-02-18",
              items: data.items.map((item) => ({
                size: item.size,
                weight: item.estimatedWeight || 10,
                photos: item.photos,
              })),
              contact: {
                email: data.contact.email,
                phone: data.contact.phone,
                verified: true,
              },
              payment: {
                method: "card",
                amount: data.items.reduce((sum, item) => {
                  const prices: Record<string, number> = { S: 2500, M: 3500, L: 4500, LL: 5500 }
                  return sum + (prices[item.size] || 3500)
                }, 0),
                maxAmount: data.items.reduce((sum, item) => {
                  const maxPrices: Record<string, number> = { S: 3500, M: 4500, L: 5500, LL: 6500 }
                  return sum + (maxPrices[item.size] || 4500)
                }, 0),
              },
              messages: [],
            }
            saveBooking(stored)
            setData((prev) => ({ ...prev, orderId }))
            setStep(6)
          }}
          onBack={() => setStep(4)}
        />
      )}

      {/* Step 6: Booking Confirmed */}
      {step === 6 && (
        <CompletionScreen data={data} onViewStatus={() => setStep(7)} onBack={() => setStep(5)} />
      )}

      {/* Step 7: Status Dashboard */}
      {step === 7 && <StatusDashboard data={data} onBack={() => setStep(6)} />}

      {/* Legal Footer */}
      <footer className="max-w-md mx-auto w-full px-6 py-6 border-t border-border/50">
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <a href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span className="text-muted-foreground/30">|</span>
          <a href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <span className="text-muted-foreground/30">|</span>
          <a href="/legal/commercial-transactions" className="hover:text-foreground transition-colors">SCTA</a>
        </div>
      </footer>
    </div>
  )
}

// Helper icon component
function ArrowLeft({ className }: { className?: string }) {
  return <ChevronRight className={`${className} rotate-180`} />
}

export default TravelerFlow
