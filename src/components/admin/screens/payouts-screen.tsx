"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Building2, RefreshCw, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayoutRow {
  hotelId: string
  hotelName: string
  orderCount: number
  totalRevenue: number
  totalCarrierCost: number
  totalPayout: number
}

interface KpiData {
  today: { date: string; orders: number; revenue: number; checkedIn: number }
  thisMonth: { month: string; revenue: number }
  statusCounts: Record<string, number>
  last30Days: { date: string; orders: number; revenue: number }[]
  hotelPayouts: PayoutRow[]
  totalOrders: number
}

interface PayoutsScreenProps {
  onBack: () => void
}

export function PayoutsScreen({ onBack }: PayoutsScreenProps) {
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = () => {
    setLoading(true)
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStats() }, [])

  const maxRevenue = data ? Math.max(...data.last30Days.map((d) => d.revenue), 1) : 1

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Revenue & Payouts
          </h1>
          <p className="text-muted-foreground text-sm">Daily KPI, revenue breakdown, and hotel payout summary</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading stats...</div>
      ) : !data ? (
        <div className="text-center py-16 text-muted-foreground">Failed to load stats</div>
      ) : (
        <div className="space-y-8">
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Today Orders</p>
              <p className="text-3xl font-bold">{data.today.orders}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.today.checkedIn} checked in</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Today Revenue</p>
              <p className="text-3xl font-bold">¥{data.today.revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.today.date}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Month Revenue</p>
              <p className="text-3xl font-bold">¥{data.thisMonth.revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.thisMonth.month}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Total Orders</p>
              <p className="text-3xl font-bold">{data.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Orders by Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {status.toLowerCase().replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue chart (last 30 days) */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="font-medium text-foreground mb-4">Revenue — Last 30 Days</h3>
            <div className="flex items-end gap-1 h-32">
              {data.last30Days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-foreground/20 group-hover:bg-foreground/40 rounded-sm transition-colors relative"
                    style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }}
                    title={`${d.date}: ¥${d.revenue.toLocaleString()}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{data.last30Days[0]?.date}</span>
              <span>{data.last30Days[data.last30Days.length - 1]?.date}</span>
            </div>
          </div>

          {/* Hotel payout table */}
          <div>
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Hotel Payouts (All Time)
            </h3>
            {data.hotelPayouts.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
                No hotel data yet
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hotel</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Orders</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Carrier Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase font-bold">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.hotelPayouts
                      .sort((a, b) => b.totalPayout - a.totalPayout)
                      .map((row) => (
                        <tr key={row.hotelId} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-medium">{row.hotelName}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted-foreground">{row.orderCount}</td>
                          <td className="px-4 py-3 text-sm text-right">¥{row.totalRevenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted-foreground">¥{row.totalCarrierCost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">¥{row.totalPayout.toLocaleString()}</td>
                        </tr>
                      ))}
                    <tr className="bg-muted/30 font-bold">
                      <td className="px-4 py-3 text-sm">Total</td>
                      <td className="px-4 py-3 text-sm text-right">{data.hotelPayouts.reduce((s, r) => s + r.orderCount, 0)}</td>
                      <td className="px-4 py-3 text-sm text-right">¥{data.hotelPayouts.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">¥{data.hotelPayouts.reduce((s, r) => s + r.totalCarrierCost, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">¥{data.hotelPayouts.reduce((s, r) => s + r.totalPayout, 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
