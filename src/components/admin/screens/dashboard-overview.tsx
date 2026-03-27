"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, Package, Truck, ArrowRight, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAllBookings, type StoredBooking } from "@/lib/booking-store"
import type { Order as ApiOrder, OrderStatus } from "@/types"

interface DashboardOverviewProps {
  onSelectOrder: (orderId: string) => void
  onViewPaymentFailures: () => void
  onViewOrders: (filter?: string) => void
}

const INACTIVE_STATUSES: OrderStatus[] = ["DELIVERED", "AUTO_CANCELLED", "CARRIER_REFUSED"]

function mapApiOrderForDashboard(o: ApiOrder) {
  const paymentFailed = !!(o as ApiOrder & { paymentFailed?: boolean }).paymentFailed
  return {
    id: o.id,
    guest: o.guestName,
    status: o.status.toLowerCase().replace(/_/g, "-"),
    items: 1,
    actionRequired: !!o.flagged || paymentFailed,
    actionLabel: paymentFailed ? "Payment failed" : o.flagged ? "Flagged" : "",
    paymentFailed,
  }
}

export function DashboardOverview({ onSelectOrder, onViewPaymentFailures, onViewOrders }: DashboardOverviewProps) {
  const [liveBookings, setLiveBookings] = useState<StoredBooking[]>([])
  const [apiOrders, setApiOrders] = useState<ReturnType<typeof mapApiOrderForDashboard>[]>([])
  const [stats, setStats] = useState<{ today: { revenue: number; orders: number }; thisMonth: { revenue: number } } | null>(null)

  const fetchApiOrders = useCallback(() => {
    fetch("/api/orders")
      .then((res) => res.ok ? res.json() : [])
      .then((orders: ApiOrder[]) => {
        if (Array.isArray(orders)) {
          setApiOrders(orders.map(mapApiOrderForDashboard))
        }
      })
      .catch(() => {})
  }, [])

  const load = useCallback(() => setLiveBookings(getAllBookings()), [])
  useEffect(() => {
    fetchApiOrders()
    load()
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d) })
      .catch(() => {})
    const h = () => load()
    window.addEventListener("bondex-booking-updated", h)
    return () => window.removeEventListener("bondex-booking-updated", h)
  }, [fetchApiOrders, load])

  const sessionOrders = liveBookings.map((b) => {
    const unresolvedActions = (b.messages || []).filter((m) => m.type === "action_required" && !m.readAt)
    return {
      id: b.orderId,
      guest: b.destination.recipientName || b.destination.bookingName,
      status: "confirmed" as const,
      items: b.items.length || 1,
      actionRequired: unresolvedActions.length > 0,
      actionLabel: unresolvedActions[0]?.title || "",
    }
  })

  // Real data only: API orders first, then any sessionStorage orders not yet in DB
  const allOrders = [
    ...apiOrders,
    ...sessionOrders.filter((s) => !apiOrders.some((a) => a.id === s.id)),
  ]

  // Derive all counts from actual data
  const actionRequiredCount = allOrders.filter((o) => o.actionRequired).length
  const activeOrderCount = allOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "auto-cancelled" && o.status !== "carrier-refused").length
  const inTransitCount = allOrders.filter((o) => o.status === "in-transit" || o.status === "handed-to-carrier").length

  // Recent = limit to 5
  const mergedRecentOrders = allOrders.slice(0, 5)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Operations overview and action items</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => onViewOrders("action_required")}
          className="p-4 rounded-lg bg-card border border-border text-left hover:border-foreground/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{actionRequiredCount}</p>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Action required</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => onViewOrders("active")}
          className="p-4 rounded-lg bg-card border border-border text-left hover:border-foreground/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeOrderCount}</p>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Active orders</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => onViewOrders("in-transit")}
          className="p-4 rounded-lg bg-card border border-border text-left hover:border-foreground/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Truck className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inTransitCount}</p>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">In transit</p>
            </div>
          </div>
        </button>
        <div className="p-4 rounded-lg bg-card border border-border text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">¥{stats?.today.revenue.toLocaleString() ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Today&apos;s revenue</p>
              <p className="text-xs text-muted-foreground">Month: ¥{stats?.thisMonth.revenue.toLocaleString() ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(() => {
        const uncollected = allOrders.filter((o) => o.status === "paid")
        const paymentFailed = allOrders.filter((o) => (o as { paymentFailed?: boolean }).paymentFailed)
        if (uncollected.length === 0 && paymentFailed.length === 0) return null
        return (
          <div className="mb-8 space-y-2">
            {uncollected.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border text-sm">
                <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">
                  <strong>{uncollected.length}</strong> order{uncollected.length > 1 ? "s" : ""} paid but not yet checked in
                </span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onViewOrders("paid")}>
                  View
                </Button>
              </div>
            )}
            {paymentFailed.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-foreground">
                  <strong>{paymentFailed.length}</strong> order{paymentFailed.length > 1 ? "s" : ""} with payment failure
                </span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={onViewPaymentFailures}>
                  View
                </Button>
              </div>
            )}
          </div>
        )
      })()}

      {/* Action required section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Action required
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onViewOrders("action_required")}>
            View all
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Issue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allOrders.filter((o) => o.actionRequired).map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium">{item.id}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.guest}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      {item.actionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => onSelectOrder(item.id)}>
                      Resolve
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recent orders
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onViewOrders()}>
            View all
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mergedRecentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-sm font-medium">{order.id}</td>
                  <td className="px-4 py-3 text-sm">{order.guest}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{order.items} item{order.items > 1 ? "s" : ""}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "delivered" ? "bg-foreground/10 text-foreground" :
                      order.status === "in-transit" ? "bg-muted text-muted-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {order.status === "confirmed" && "Confirmed"}
                      {order.status === "in-transit" && "In transit"}
                      {order.status === "delivered" && "Delivered"}
                      {order.status === "checked-in" && "Checked in"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onSelectOrder(order.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
