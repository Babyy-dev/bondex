"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Building2, MapPin, ChevronRight } from "lucide-react"
import type { Hotel } from "@/types"

interface HotelListScreenProps {
  onAddHotel: () => void
  onBack: () => void
}

const mockHotels: Hotel[] = [
  { id: "h1", name: "Park Hyatt Tokyo", branchName: "Shinjuku", address: "Tokyo", status: "active", dailyOrderCount: 42, carrier: "yamato", cutoffTime: "15:00", printerType: "bluetooth_thermal", labelSize: "62mm" },
  { id: "h2", name: "The Ritz-Carlton Kyoto", branchName: "Main", address: "Kyoto", status: "active", dailyOrderCount: 28, carrier: "yamato", cutoffTime: "15:00", printerType: "bluetooth_thermal", labelSize: "62mm" },
  { id: "h3", name: "Aman Tokyo", branchName: "Otemachi", address: "Tokyo", status: "active", dailyOrderCount: 15, carrier: "sagawa", cutoffTime: "15:00", printerType: "usb_thermal", labelSize: "62mm" },
  { id: "h4", name: "Hoshinoya Fuji", branchName: "Main", address: "Yamanashi", status: "active", dailyOrderCount: 8, carrier: "yamato", cutoffTime: "15:00", printerType: "none", labelSize: "62mm" },
  { id: "h5", name: "Sakura Hotel Shinjuku", branchName: "Main", address: "Tokyo", status: "paused", dailyOrderCount: 0, carrier: "yamato", cutoffTime: "15:00", printerType: "none", labelSize: "62mm" },
]

export function HotelListScreen({ onAddHotel }: HotelListScreenProps) {
  const [search, setSearch] = useState("")
  const [hotels, setHotels] = useState<Hotel[]>(mockHotels)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.ok ? res.json() : [])
      .then((data: Hotel[]) => {
        if (Array.isArray(data) && data.length > 0) setHotels(data)
        // else keep mockHotels as fallback
      })
      .catch(() => {/* keep mockHotels */})
      .finally(() => setLoading(false))
  }, [])

  const filtered = hotels.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.address || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hotels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading..." : `${hotels.length} registered hotels`}
          </p>
        </div>
        <button
          onClick={onAddHotel}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add new hotel
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by hotel name or region..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Hotel list */}
      <div className="space-y-2">
        {filtered.map((hotel) => (
          <div
            key={hotel.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{hotel.name}</span>
                  {hotel.branchName && hotel.branchName !== "Main" && (
                    <span className="text-xs text-muted-foreground">({hotel.branchName})</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    hotel.status === "active"
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {hotel.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{hotel.address}</span>
                  <span className="text-xs text-muted-foreground ml-2">{hotel.dailyOrderCount} orders</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  )
}
