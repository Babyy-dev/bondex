"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { use } from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string; desc: string }[] = [
  { status: "CREATED",          label: "Booking confirmed",    icon: "✅", desc: "Your booking has been received" },
  { status: "PAID",             label: "Payment confirmed",    icon: "💳", desc: "Payment processed successfully" },
  { status: "CHECKED_IN",       label: "Waiting for carrier",  icon: "🏨", desc: "Hotel has checked in your luggage" },
  { status: "HANDED_TO_CARRIER",label: "Picked up by carrier", icon: "🚚", desc: "Yamato Transport has collected it" },
  { status: "IN_TRANSIT",       label: "In transit",           icon: "📦", desc: "Your luggage is on the way" },
  { status: "DELIVERED",        label: "Delivered",            icon: "🎉", desc: "Delivered to your destination" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.status);

function getStatusVariant(s: OrderStatus) {
  const map: Record<OrderStatus, "success"|"warning"|"info"|"error"|"neutral"> = {
    CREATED: "neutral", PAID: "info", CHECKED_IN: "warning",
    HANDED_TO_CARRIER: "warning", IN_TRANSIT: "info",
    DELIVERED: "success", AUTO_CANCELLED: "error", CARRIER_REFUSED: "error",
  };
  return map[s] ?? "neutral";
}

export default function StatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(setOrder).catch(console.error);
  }, [orderId]);

  const copyTracking = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!order) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
    </div>
  );

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isTerminal = ["AUTO_CANCELLED","CARRIER_REFUSED"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> BondEx
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black">Delivery Status</h1>
              <p className="text-white/50 text-sm mt-0.5">Order {order.id}</p>
            </div>
            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Destination card */}
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

        {/* Timeline */}
        {!isTerminal ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">Progress</p>
            <div className="flex flex-col">
              {STATUS_STEPS.map((step, idx) => {
                const done   = idx < currentIdx;
                const active = idx === currentIdx;
                const future = idx > currentIdx;
                return (
                  <div key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={false}
                        animate={{ backgroundColor: done || active ? "#1A120B" : "#EDE8DF", scale: active ? 1.15 : 1 }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      >
                        {done ? (
                          <Check size={14} className="text-white" />
                        ) : active ? (
                          <span>{step.icon}</span>
                        ) : (
                          <span className="text-xs text-[#A89080] font-bold">{idx + 1}</span>
                        )}
                      </motion.div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 rounded-full ${done ? "bg-[#1A120B]" : "bg-[#EDE8DF]"}`} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-semibold ${future ? "text-[#A89080]" : "text-[#1A120B]"}`}>
                        {step.label}
                      </p>
                      {(done || active) && (
                        <p className="text-xs text-[#A89080] mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-3xl p-5 border border-red-200">
            <p className="font-bold text-red-700">
              {order.status === "AUTO_CANCELLED" ? "Order Cancelled" : "Carrier Refused"}
            </p>
            <p className="text-sm text-red-600 mt-1">Please contact BondEx support.</p>
          </div>
        )}

        {/* Tracking */}
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
            <p>📦 If delayed, luggage may be held at a carrier office near your destination.</p>
            <p>📞 <a href="mailto:support@bondex.jp" className="underline">Contact BondEx</a> if you need help.</p>
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
