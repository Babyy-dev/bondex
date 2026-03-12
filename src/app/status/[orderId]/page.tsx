"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { use } from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { formatDate } from "@/lib/utils";

// Plain-language labels — technical terms prohibited on user-facing screens
const STATUS_META: Record<OrderStatus, { label: string; icon: string; desc: string; color: string; bg: string }> = {
  CREATED:           { label: "Booking confirmed",       icon: "✅", desc: "Your booking has been received",             color: "text-[#1A120B]",   bg: "bg-[#F8F3EC]" },
  PAID:              { label: "Waiting for hotel check-in", icon: "🏨", desc: "Bring your luggage to the hotel front desk", color: "text-amber-700",   bg: "bg-amber-50"  },
  CHECKED_IN:        { label: "Waiting for carrier pickup", icon: "⏳", desc: "Hotel has recorded your luggage",           color: "text-blue-700",    bg: "bg-blue-50"   },
  HANDED_TO_CARRIER: { label: "Picked up by carrier",    icon: "🚚", desc: "Yamato Transport has collected your bags",   color: "text-indigo-700",  bg: "bg-indigo-50" },
  IN_TRANSIT:        { label: "In transit",               icon: "📦", desc: "Your luggage is on its way",                color: "text-purple-700",  bg: "bg-purple-50" },
  DELIVERED:         { label: "Delivered",                icon: "🎉", desc: "Your luggage has arrived at the destination",color: "text-emerald-700", bg: "bg-emerald-50"},
  AUTO_CANCELLED:    { label: "Booking cancelled",        icon: "❌", desc: "Automatically cancelled — contact BondEx",  color: "text-red-700",     bg: "bg-red-50"    },
  CARRIER_REFUSED:   { label: "Carrier could not accept", icon: "⚠️", desc: "Please contact BondEx for assistance",      color: "text-red-700",     bg: "bg-red-50"    },
};

const TIMELINE_STEPS: OrderStatus[] = [
  "CREATED", "PAID", "CHECKED_IN", "HANDED_TO_CARRIER", "IN_TRANSIT", "DELIVERED",
];

function getStepIndex(status: OrderStatus): number {
  const i = TIMELINE_STEPS.indexOf(status);
  return i >= 0 ? i : 0;
}

export default function StatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order,    setOrder]    = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setOrder(data); })
      .catch(() => setNotFound(true));
  }, [orderId]);

  const copyTracking = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (notFound) return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-4xl">📦</p>
      <h1 className="text-xl font-black text-[#1A120B]">Order not found</h1>
      <p className="text-sm text-[#A89080] text-center">Check your order ID or contact BondEx support.</p>
      <Link href="/" className="text-sm text-[#C8A96E] underline">Back to home</Link>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
    </div>
  );

  const meta       = STATUS_META[order.status] ?? STATUS_META.CREATED;
  const currentIdx = getStepIndex(order.status);
  const isTerminal = ["AUTO_CANCELLED","CARRIER_REFUSED"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      {/* Dark header — order ID only */}
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-3 text-sm">
            <ArrowLeft size={16} /> BondEx
          </Link>
          <p className="text-white/40 text-xs font-mono">Order {order.id}</p>
        </div>
      </div>

      {/* ── LARGE STICKY STATUS BLOCK ─────────────────────────────────────────── */}
      <div className={`sticky top-0 z-20 border-b ${meta.bg} border-opacity-60`}
        style={{ borderColor: "var(--tw-shadow-color, #EDE8DF)" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <motion.div
            key={order.status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
          >
            {meta.icon}
          </motion.div>
          <div>
            <motion.p
              key={order.status + "_label"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-lg font-black ${meta.color}`}
            >
              {meta.label}
            </motion.p>
            <p className="text-sm text-[#7A6252] mt-0.5">{meta.desc}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Delivery info card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Delivery info</p>
          <div className="flex flex-col gap-3">
            <Row emoji="📍" label="From" value={order.fromHotel} />
            <Row emoji="🎯" label="To"
              value={<>
                <span className="font-medium text-[#1A120B]">{order.toAddress.facilityName ?? order.toAddress.city}</span>
                <p className="text-xs text-[#A89080]">{formatDate(order.deliveryDate)}</p>
              </>}
            />
          </div>
        </div>

        {/* Progress timeline */}
        {!isTerminal ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">Progress</p>
            <div className="flex flex-col">
              {TIMELINE_STEPS.map((status, idx) => {
                const m      = STATUS_META[status];
                const done   = idx < currentIdx;
                const active = idx === currentIdx;
                const future = idx > currentIdx;
                return (
                  <div key={status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: done ? "#1A120B" : active ? "#C8A96E" : "#EDE8DF",
                          scale: active ? 1.15 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      >
                        {done ? (
                          <Check size={14} className="text-white" />
                        ) : active ? (
                          <span className="text-base">{m.icon}</span>
                        ) : (
                          <span className="text-xs text-[#A89080] font-bold">{idx + 1}</span>
                        )}
                      </motion.div>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 rounded-full transition-colors duration-500 ${done ? "bg-[#1A120B]" : "bg-[#EDE8DF]"}`} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-semibold ${future ? "text-[#A89080]" : active ? m.color : "text-[#1A120B]"}`}>
                        {m.label}
                      </p>
                      {(done || active) && (
                        <p className="text-xs text-[#A89080] mt-0.5">{m.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`rounded-3xl p-5 border ${meta.bg} border-red-200`}>
            <p className="font-bold text-red-700 text-lg">{meta.label}</p>
            <p className="text-sm text-red-600 mt-1">{meta.desc}</p>
            <a href="mailto:support@bondex.jp" className="mt-3 inline-block text-sm text-red-700 underline">
              Contact BondEx support →
            </a>
          </div>
        )}

        {/* Tracking (only after pickup) */}
        {order.trackingNumber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]"
          >
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Carrier tracking</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#A89080]">{order.carrier ?? "Yamato Transport"}</p>
                <p className="text-sm font-mono font-bold text-[#1A120B]">{order.trackingNumber}</p>
              </div>
              <button onClick={copyTracking}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8F3EC] text-xs font-medium text-[#44342A] hover:bg-[#EDE8DF] transition-colors">
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Good to know */}
        <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl p-5">
          <p className="text-xs font-semibold text-[#C8A96E] uppercase tracking-wide mb-2">Good to know</p>
          <div className="flex flex-col gap-2 text-sm text-[#7A6252]">
            <p>📦 If delayed, your luggage may be held at a carrier office near your destination.</p>
            <p>📞 Need help? <a href="mailto:support@bondex.jp" className="underline">Contact BondEx support</a></p>
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ emoji, label, value }: { emoji: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-xs text-[#A89080]">{label}</p>
        <div className="text-sm text-[#1A120B] mt-0.5">{value}</div>
      </div>
    </div>
  );
}
