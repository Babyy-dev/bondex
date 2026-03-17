"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  ArrowLeft, MapPin, Search, User, AlertTriangle,
  ArrowRight, CheckCircle2, X, Clock,
  Calendar, PlaneTakeoff, Hotel, ShieldCheck, AlertCircle, Upload, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BookingData } from "../traveler-flow"
import type { Hotel as HotelType } from "@/types"

interface DestinationScreenProps {
  data: BookingData
  onUpdate: (data: Partial<BookingData>) => void
  onNext: () => void
  onBack: () => void
}

// 初期値としての配送元（QRスキャン想定）
const DEFAULT_PICKUP = { id: "p1", name: "Sakura Hotel Shinjuku", address: "2-21-4 Kabukicho, Shinjuku" }

// Static airports/stations fallback (always shown alongside real hotels)
const staticFacilities = [
  { id: "ap-1", name: "Narita Airport T1", address: "Gokoyama, Narita, Chiba", destType: "airport" },
  { id: "ap-2", name: "Haneda Airport T3", address: "Hanedakuko, Ota City, Tokyo", destType: "airport" },
  { id: "ap-3", name: "Kansai International Airport (KIX)", address: "Senshu-kuko Kita, Izumisano, Osaka", destType: "airport" },
]

// プロ選定：大阪・京都・東日本の主要施設マスターデータ (fallback if API fails)
const mockFacilities = [
  { id: "osaka-1", name: "W Osaka", address: "4-1-3 Minami Semba, Chuo-ku, Osaka", destType: "hotel" },
  { id: "osaka-2", name: "Conrad Osaka", address: "3-2-4 Nakanoshima, Kita-ku, Osaka", destType: "hotel" },
  { id: "osaka-3", name: "Centara Grand Hotel Osaka", address: "2-11-50 Namba-naka, Naniwa-ku, Osaka", destType: "hotel" },
  { id: "kyoto-1", name: "The Ritz-Carlton Kyoto", address: "Kamogawa Nijo-ohashi Kado, Nakagyo-ku, Kyoto", destType: "hotel" },
  { id: "kyoto-2", name: "Ace Hotel Kyoto", address: "245-2 Kurumayacho, Nakagyo-ku, Kyoto", destType: "hotel" },
  { id: "kyoto-3", name: "Park Hyatt Kyoto", address: "360 Kodaiji Masuyacho, Higashiyama-ku, Kyoto", destType: "hotel" },
  { id: "tokyo-1", name: "Aman Tokyo", address: "1-5-6 Otemachi, Chiyoda-ku, Tokyo", destType: "hotel" },
  { id: "tokyo-2", name: "Hotel Nikko Narita", address: "500 Tokome, Narita, Chiba", destType: "hotel" },
  { id: "tokyo-3", name: "The Kahala Hotel & Resort Yokohama", address: "1-1-3 Minatomirai, Nishi-ku, Yokohama, Kanagawa", destType: "hotel" },
  { id: "hokkaido-1", name: "Park Hyatt Niseko Hanazono", address: "328-47 Iwaobetsu, Kutchan, Hokkaido", destType: "hotel" },
  ...staticFacilities,
]

export function DestinationScreen({ data, onUpdate, onNext, onBack }: DestinationScreenProps) {
  const [facilities, setFacilities] = useState(mockFacilities)
  const [loadingHotels, setLoadingHotels] = useState(true)

  // Fetch real hotels from API on mount
  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((hotels: HotelType[]) => {
        if (Array.isArray(hotels) && hotels.length > 0) {
          const hotelFacilities = hotels.map((h) => ({
            id: h.id,
            name: h.name,
            address: h.address,
            destType: "hotel" as const,
          }))
          setFacilities([...hotelFacilities, ...staticFacilities])
        }
        // else keep mockFacilities as fallback
      })
      .catch(() => {
        // keep mockFacilities on error
      })
      .finally(() => setLoadingHotels(false))
  }, [])
  // --- 1. State Management ---
  const [pickupConfirmed, setPickupConfirmed] = useState(false)
  const [isChangingPickup, setIsChangingPickup] = useState(false)
  const [pickupLocation, setPickupLocation] = useState(DEFAULT_PICKUP)
  const [pickupQuery, setPickupQuery] = useState("")

  const [selectedFacility, setSelectedFacility] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState(data.destination.name || "")
  const [arrivalDate, setArrivalDate] = useState(data.destination.checkInDate || "")
  const [arrivalTime, setArrivalTime] = useState("") 
  const [bookingName, setBookingName] = useState(data.destination.bookingName || "")
  const [bookingDoc, setBookingDoc] = useState<File | null>(null)
  const bookingDocRef = useRef<HTMLInputElement>(null)
  const [sameAsBooking, setSameAsBooking] = useState(true)
  const [recipientName, setRecipientName] = useState("")
  const [flightNumber, setFlightNumber] = useState("")

  const isAirport = selectedFacility?.destType === "airport"

  // --- 2. Logistics Logic (ヤマト運輸 空港宅急便規約準拠) ---
  const logisticsStatus = useMemo(() => {
    if (!isAirport || !arrivalDate || !arrivalTime) return null
    
    const flightDate = new Date(arrivalDate)
    const today = new Date(); today.setHours(0,0,0,0)
    
    // 発送デッドライン（2日前締切）
    const shippingDeadline = new Date(flightDate)
    shippingDeadline.setDate(flightDate.getDate() - 2)
    
    // 空港カウンター受取期限（出発の2時間前）
    const [hours, minutes] = arrivalTime.split(":").map(Number)
    let pickupHour = hours - 2
    const pickupTime = `${pickupHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

    const isPossible = shippingDeadline >= today

    return {
      shippingDeadline: shippingDeadline.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      pickupDeadline: pickupTime,
      isPossible,
      error: !isPossible ? "空港配送はフライトの2日前までの予約が必須です。" : null
    }
  }, [isAirport, arrivalDate, arrivalTime])



  const effectiveRecipient = sameAsBooking ? bookingName : recipientName

  const canContinue = useMemo(() => {
    const hasRecipient = sameAsBooking ? !!bookingName : !!recipientName
    const basicInfo = pickupConfirmed && selectedFacility && arrivalDate && arrivalTime && bookingName && bookingDoc && hasRecipient
    if (isAirport) {
      return !!(basicInfo && flightNumber && logisticsStatus?.isPossible)
    }
    return !!basicInfo
  }, [pickupConfirmed, selectedFacility, arrivalDate, arrivalTime, bookingName, bookingDoc, sameAsBooking, recipientName, isAirport, flightNumber, logisticsStatus])

  // --- 4. Action Handlers ---
  const handleContinue = () => {
    if (!selectedFacility) return
    onUpdate({
      fromHotel: pickupLocation.name,
      destination: {
        name: selectedFacility.name,
        address: selectedFacility.address,
        type: selectedFacility.destType,
        checkInDate: arrivalDate,
        bookingName: bookingName,
        recipientName: effectiveRecipient
      }
    })
    onNext()
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-8 bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold tracking-tight">Trip Plan</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Step 1: Pickup Point (Not here? 動線復活) */}
        <div className={`p-4 rounded-2xl border-2 transition-all ${pickupConfirmed ? "bg-muted/30 border-transparent shadow-none" : "bg-primary/5 border-primary shadow-lg shadow-primary/10"}`}>
          {!isChangingPickup ? (
            <div className="flex items-start gap-3">
              <MapPin className={`w-5 h-5 mt-1 ${pickupConfirmed ? "text-muted-foreground" : "text-primary"}`} />
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Step 1: Pickup Point</p>
                <p className="font-bold text-base">{pickupLocation.name}</p>
                <p className="text-xs text-muted-foreground">{pickupLocation.address}</p>
                
                {!pickupConfirmed ? (
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1 rounded-xl font-bold shadow-md shadow-primary/20" onClick={() => setPickupConfirmed(true)}>Yes, I'm here</Button>
                    <button onClick={() => setIsChangingPickup(true)} className="text-[10px] text-muted-foreground underline underline-offset-4 px-2">Not here?</button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-primary text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Location confirmed</span>
                    <button onClick={() => {setPickupConfirmed(false); setIsChangingPickup(true);}} className="ml-auto text-[10px] text-muted-foreground underline">Change</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">Search Pickup Location</p>
                <button onClick={() => setIsChangingPickup(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input autoFocus placeholder="Enter hotel name..." className="pl-9 h-12 rounded-xl border-primary" value={pickupQuery} onChange={(e) => setPickupQuery(e.target.value)} />
              </div>
              <div className="max-h-40 overflow-auto border rounded-xl bg-background shadow-inner">
                {facilities.filter(f => f.destType === "hotel" && f.name.toLowerCase().includes(pickupQuery.toLowerCase())).map(f => (
                  <button key={f.id} onClick={() => {setPickupLocation(f); setIsChangingPickup(false); setPickupConfirmed(true);}} className="w-full p-3 text-left hover:bg-primary/5 border-b last:border-0 text-sm font-medium">
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Destination & Logistics */}
        {pickupConfirmed && !isChangingPickup && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Where to?" className="pl-9 h-14 rounded-2xl shadow-sm focus:ring-primary" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setSelectedFacility(null);}} />
                {!selectedFacility && searchQuery && (
                  <div className="absolute top-full w-full mt-1 border rounded-xl bg-white z-30 shadow-2xl overflow-hidden">
                    {facilities.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(f => (
                      <button key={f.id} onClick={() => {setSelectedFacility(f); setSearchQuery(f.name);}} className="w-full p-4 text-left hover:bg-muted border-b last:border-0 font-bold text-sm">{f.name}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> {isAirport ? "Flight Date" : "Check-in Date"}</label>
                  <Input type="date" className="h-12 rounded-xl" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> {isAirport ? "Flight Time" : "Arrival Time"}</label>
                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  >
                    <option value="">--:00</option>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = i.toString().padStart(2, "0")
                      return <option key={h} value={`${h}:00`}>{h}:00</option>
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* 物流SLAステータス */}
            {isAirport && logisticsStatus && (
              <div className={`p-4 rounded-xl border ${logisticsStatus.isPossible ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20 shadow-lg"}`}>
                <div className="flex items-start gap-3">
                  {logisticsStatus.isPossible ? <ShieldCheck className="w-5 h-5 text-primary mt-0.5" /> : <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />}
                  <div className="space-y-1">
                    <p className={`text-xs font-bold ${logisticsStatus.isPossible ? "text-primary" : "text-destructive"}`}>
                      {logisticsStatus.isPossible ? "Logistics Schedule Confirmed" : "Critical Alert: Deadlines"}
                    </p>
                    <div className="text-[10px] text-muted-foreground space-y-1 leading-relaxed">
                      {logisticsStatus.isPossible ? (
                        <>
                          <p>• Airport counter pickup by: <strong>{logisticsStatus.pickupDeadline}</strong></p>
                          <p>• Shipping deadline from hotel: <strong>{logisticsStatus.shippingDeadline}</strong></p>
                        </>
                      ) : (
                        <p className="font-bold text-destructive">{logisticsStatus.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* フライト・名前情報 */}
            <div className="space-y-4 pt-2 border-t border-dashed">
              {isAirport && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground ml-1">Flight Number</label>
                  <Input placeholder="e.g. JL001 / NH211" className="h-12 rounded-xl uppercase font-mono border-primary/20" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} />
                </div>
              )}

              {/* Booking Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground ml-1">Booking Name</label>
                <Input placeholder="Name on booking" className="h-12 rounded-xl" value={bookingName} onChange={(e) => setBookingName(e.target.value)} />
              </div>

              {/* Booking Confirmation Upload (Required) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 ml-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Booking Confirmation</label>
                  <span className="text-[9px] font-bold text-destructive">Required</span>
                </div>
                <input
                  ref={bookingDocRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setBookingDoc(f)
                  }}
                  className="hidden"
                  aria-label="Upload booking confirmation"
                />
                {bookingDoc ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{bookingDoc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(bookingDoc.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => { setBookingDoc(null); if (bookingDocRef.current) bookingDocRef.current.value = "" }}
                      className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => bookingDocRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-foreground/40 hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload confirmation screenshot or PDF</span>
                  </button>
                )}
              </div>

              {/* Recipient Name with "Same as booking" checkbox */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground ml-1">Recipient Name</label>
                <button
                  type="button"
                  onClick={() => setSameAsBooking(!sameAsBooking)}
                  className="flex items-center gap-2 ml-1"
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                    sameAsBooking ? "bg-foreground border-foreground" : "border-muted-foreground"
                  }`}>
                    {sameAsBooking && (
                      <svg className="w-2.5 h-2.5 text-background" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs text-foreground">Same as booking name</span>
                </button>
                {!sameAsBooking && (
                  <Input
                    placeholder="Recipient full name"
                    className="h-12 rounded-xl"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-4 bg-white border-t border-border mt-auto">
        <Button 
          className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl transition-all shadow-primary/20"
          disabled={!canContinue} 
          onClick={handleContinue}
        >
          {logisticsStatus?.error ? "Schedule Error" : "Confirm & Save Time"}
        </Button>
      </div>
    </div>
  )
}
