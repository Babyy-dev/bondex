"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, AlertTriangle, CreditCard, ArrowRight, Info, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Order } from "@/types"

interface PaymentFailureScreenProps {
  onSelectOrder: (orderId: string) => void
  onBack: () => void
}

export function PaymentFailureScreen({ onSelectOrder, onBack }: PaymentFailureScreenProps) {
  const [failedOrders, setFailedOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFailures = () => {
    setLoading(true)
    fetch("/api/orders?paymentFailed=true")
      .then((res) => res.ok ? res.json() : [])
      .then((data: Order[]) => {
        if (Array.isArray(data)) setFailedOrders(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFailures() }, [])

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Payment Issues
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Loading..." : `${failedOrders.length} failed payment${failedOrders.length !== 1 ? "s" : ""} requiring manual recovery`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFailures} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Critical notice */}
      <div className="p-4 rounded-lg bg-muted border border-border mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Payment failure handling policy</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Shipment is <strong>NOT</strong> stopped for payment failures</li>
              <li>Status remains unchanged — shipment continues as normal</li>
              <li>CS handles payment recovery manually</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Failed payments list */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading payment failures...</p>
        </div>
      ) : failedOrders.length > 0 ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {failedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-4 py-4">
                    <p className="font-mono text-sm font-medium">{order.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium">{order.guestName}</p>
                      <p className="text-xs text-muted-foreground">{order.guestEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">¥{order.totalPrice.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Payment failed
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                      {order.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button size="sm" onClick={() => onSelectOrder(order.id)}>
                      Handle
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">No payment issues</h3>
          <p className="text-sm text-muted-foreground">All payments are processing normally</p>
        </div>
      )}
    </div>
  )
}
