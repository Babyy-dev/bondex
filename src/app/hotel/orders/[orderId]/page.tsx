"use client";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Printer, Flag, Info } from "lucide-react";
import Link from "next/link";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function HotelOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder]     = useState<Order | null>(null);
  const [reprinting, setReprinting] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(setOrder).catch(console.error);
  }, [orderId]);

  const handleReprint = async () => {
    if (!order?.labelUrl) { toast.error("No label available"); return; }
    setReprinting(true);
    window.open(order.labelUrl, "_blank");
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Label sent to printer");
    setReprinting(false);
  };

  const handleFlag = async () => {
    if (!order) return;
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: true }),
    });
    setOrder((prev) => prev ? { ...prev, flagged: true } : prev);
    toast("Issue flagged. CS will handle it.", { icon: "🚩" });
  };

  if (!order) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
    </div>
  );

  const canReprint = ["PAID","CHECKED_IN"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href="/hotel/orders" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Back to list
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs font-mono">{order.id}</p>
              <h1 className="text-xl font-black mt-0.5">{order.guestName}</h1>
            </div>
            {order.flagged && <Badge variant="error">🚩 Flagged</Badge>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {/* View-only notice */}
        <div className="flex items-center gap-2 bg-[#FEFCF8] border border-[#EDE8DF] rounded-2xl px-4 py-3">
          <Info size={14} className="text-[#C8A96E] flex-shrink-0" />
          <p className="text-xs text-[#7A6252]">View only. No editing available on this screen.</p>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">Order details</p>
          <div className="grid grid-cols-2 gap-4">
            <D label="Guest"         value={order.guestName} />
            <D label="Size"          value={`Size ${order.size}`} />
            <D label="Status"        value={order.status} />
            <D label="Check-in date" value={formatDate(new Date())} />
            <D label="Delivery date" value={formatDate(order.deliveryDate)} />
            <D label="Packages"      value="1" />
          </div>
        </div>

        {/* Destination */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Destination</p>
          <p className="font-semibold text-[#1A120B]">{order.toAddress.facilityName ?? "–"}</p>
          <p className="text-sm text-[#7A6252] mt-0.5">{order.toAddress.recipientName}</p>
          <p className="text-xs text-[#A89080] mt-0.5">{order.toAddress.city}, {order.toAddress.prefecture} {order.toAddress.postalCode}</p>
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-2">Tracking</p>
            <p className="text-xs text-[#A89080]">{order.carrier ?? "Yamato Transport"}</p>
            <p className="font-mono text-sm font-bold text-[#1A120B]">{order.trackingNumber}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {canReprint && (
            <Button onClick={handleReprint} loading={reprinting} variant="outline" className="w-full flex items-center gap-2">
              <Printer size={16} /> Reprint shipping label
            </Button>
          )}
          {!order.flagged && (
            <button onClick={handleFlag}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
              <Flag size={15} /> Flag an issue (no reason required)
            </button>
          )}
        </div>

        <Link href={`/hotel/scan?orderId=${orderId}`}>
          <Button size="lg" className="w-full">Go to QR scan / Check-in</Button>
        </Link>
      </div>
    </div>
  );
}

function D({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#A89080]">{label}</p>
      <p className="text-sm font-semibold text-[#1A120B] mt-0.5">{value}</p>
    </div>
  );
}
