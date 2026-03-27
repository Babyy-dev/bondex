"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Tag, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { QrTag, Hotel } from "@/types"

interface QrTagsScreenProps {
  onBack: () => void
}

const STATUS_CONFIG = {
  unused:      { label: "Unused",      icon: Clock,        color: "text-muted-foreground bg-muted" },
  assigned:    { label: "Assigned",    icon: CheckCircle,  color: "text-foreground bg-foreground/10" },
  invalidated: { label: "Invalidated", icon: XCircle,      color: "text-destructive bg-destructive/10" },
}

export function QrTagsScreen({ onBack }: QrTagsScreenProps) {
  const [tags, setTags]       = useState<QrTag[]>([])
  const [hotels, setHotels]   = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [filterHotel, setFilterHotel] = useState("")
  const [filterStatus, setFilterStatus] = useState<QrTag["status"] | "all">("all")
  const [generating, setGenerating] = useState(false)
  const [genHotel, setGenHotel] = useState("")
  const [genCount, setGenCount] = useState("10")

  const fetchTags = () => {
    setLoading(true)
    const url = filterHotel ? `/api/qr-tags?hotelId=${filterHotel}` : "/api/qr-tags"
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data: QrTag[]) => { if (Array.isArray(data)) setTags(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch("/api/hotels")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Hotel[]) => { if (Array.isArray(data)) setHotels(data) })
      .catch(() => {})
    fetchTags()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterHotel])

  const handleGenerate = async () => {
    if (!genHotel) { alert("Select a hotel"); return }
    const count = parseInt(genCount, 10)
    if (isNaN(count) || count < 1) { alert("Enter a valid count"); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/qr-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: genHotel, count }),
      })
      if (res.ok) fetchTags()
      else alert("Failed to generate tags")
    } catch { alert("Network error") }
    finally { setGenerating(false) }
  }

  const stats = {
    unused:      tags.filter((t) => t.status === "unused").length,
    assigned:    tags.filter((t) => t.status === "assigned").length,
    invalidated: tags.filter((t) => t.status === "invalidated").length,
  }

  const filtered = filterStatus === "all" ? tags : tags.filter((t) => t.status === filterStatus)

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6" />
            QR Tag Inventory
          </h1>
          <p className="text-muted-foreground text-sm">Manage physical QR tags distributed to hotels</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTags} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["unused", "assigned", "invalidated"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`p-4 rounded-lg border text-left transition-all ${filterStatus === s ? "border-foreground" : "border-border"} bg-card hover:border-foreground/50`}
            >
              <p className="text-2xl font-bold">{stats[s]}</p>
              <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${cfg.color}`}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Generate tags panel */}
      <div className="p-4 rounded-lg border border-border bg-card mb-6">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Generate New Tags
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Hotel</label>
            <select
              value={genHotel}
              onChange={(e) => setGenHotel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Select hotel...</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}{h.branchName ? ` (${h.branchName})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground mb-1 block">Count</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
              className="text-center"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterHotel}
          onChange={(e) => setFilterHotel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["all", "unused", "assigned", "invalidated"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus === s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50"}`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tags...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tags found</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tag ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hotel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tag) => {
                const cfg = STATUS_CONFIG[tag.status]
                const hotel = hotels.find((h) => h.id === tag.hotelId)
                return (
                  <tr key={tag.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-bold">{tag.id}</td>
                    <td className="px-4 py-3 text-sm">{hotel?.name ?? tag.hotelId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tag.orderId ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(tag.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
