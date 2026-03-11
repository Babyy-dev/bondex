"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "PAID",             label: "Paid" },
  { value: "CHECKED_IN",       label: "Checked In" },
  { value: "HANDED_TO_CARRIER",label: "Picked Up" },
  { value: "IN_TRANSIT",       label: "In Transit" },
  { value: "DELIVERED",        label: "Delivered" },
  { value: "AUTO_CANCELLED",   label: "Cancelled" },
];

function sv(s: OrderStatus): "success"|"warning"|"info"|"error"|"neutral" {
  const m: Record<OrderStatus, "success"|"warning"|"info"|"error"|"neutral"> = {
    CREATED: "neutral", PAID: "warning", CHECKED_IN: "info",
    HANDED_TO_CARRIER: "info", IN_TRANSIT: "info",
    DELIVERED: "success", AUTO_CANCELLED: "error", CARRIER_REFUSED: "error",
  };
  return m[s] ?? "neutral";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query,  setQuery]  = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(console.error);
  }, []);

  let filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.guestName.toLowerCase().includes(q) || o.guestEmail.toLowerCase().includes(q);
    }
    return true;
  });
  if (dateFrom) filtered = filtered.filter(o => o.createdAt >= dateFrom);
  if (dateTo)   filtered = filtered.filter(o => o.createdAt <= dateTo + "T23:59:59");

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-2xl font-black">All Orders</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89080]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                filter === f.value ? "bg-[#1A120B] text-white" : "bg-white text-[#7A6252] border border-[#EDE8DF] hover:border-[#C8A96E]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EDE8DF] text-sm text-[#1A120B] bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30" />
          <span className="text-xs text-[#A89080]">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EDE8DF] text-sm text-[#1A120B] bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-[#A89080] hover:text-[#1A120B]">Clear</button>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-[#EDE8DF] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-[#A89080] uppercase tracking-wide border-b border-[#F0E8DB]">
                {["Order ID","Guest","Size","Destination","Date","Status","Amount"].map((h) => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <motion.tr key={o.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[#FEFCF8] hover:bg-[#FEFCF8] transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-sm font-mono text-[#C8A96E] hover:underline">{o.id}</Link>
                    {o.flagged && <span className="ml-1 text-xs">🚩</span>}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-[#1A120B]">{o.guestName}</p>
                    <p className="text-xs text-[#A89080]">{o.guestEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-[#7A6252]">{o.size}</td>
                  <td className="px-5 py-3 text-sm text-[#7A6252]">{o.toAddress.facilityName ?? o.toAddress.city}</td>
                  <td className="px-5 py-3 text-sm text-[#7A6252]">{o.deliveryDate}</td>
                  <td className="px-5 py-3"><Badge variant={sv(o.status)}>{o.status}</Badge></td>
                  <td className="px-5 py-3 text-sm font-semibold text-[#1A120B]">{formatCurrency(o.totalPrice)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[#A89080] text-sm">No orders found</div>
          )}
        </div>
      </div>
    </div>
  );
}
