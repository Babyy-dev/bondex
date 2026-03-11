"use client";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Edit3, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Order, LuggageSize } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSizeInfo } from "@/lib/pricing";
import toast from "react-hot-toast";

const SIZES: LuggageSize[] = ["S","M","L","LL"];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order,       setOrder]       = useState<Order | null>(null);
  const [editingSize, setEditingSize] = useState(false);
  const [newSize,     setNewSize]     = useState<LuggageSize>("M");
  const [saving,      setSaving]      = useState(false);

  const load = () => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then((o) => { setOrder(o); setNewSize(o.size); }).catch(console.error);
  };
  useEffect(() => { load(); }, [orderId]);

  const handleSizeChange = async () => {
    if (!order || newSize === order.size) { setEditingSize(false); return; }
    setSaving(true);
    try {
      const diff = getSizeInfo(newSize).price - getSizeInfo(order.size).price;
      const res = await fetch("/api/stripe/charge-difference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newSize }),
      });
      if (!res.ok) throw new Error("Failed to update size");
      const data = await res.json();
      if (data.charged) {
        toast.success(`Size changed to ${newSize} — ${formatCurrency(diff)} charged via Stripe`);
      } else {
        toast.success(`Size changed to ${newSize}${diff > 0 ? ` — ${formatCurrency(diff)} — ${data.message}` : ""}`);
      }
      load(); setEditingSize(false);
    } catch { toast.error("Failed to update size"); }
    finally { setSaving(false); }
  };

  if (!order) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin/orders" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Orders
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs font-mono">{order.id}</p>
              <h1 className="text-xl font-black mt-0.5">{order.guestName}</h1>
            </div>
            <div className="flex items-center gap-2">
              {order.flagged && <Badge variant="error">🚩 Flagged</Badge>}
              <button onClick={load} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-5 flex flex-col gap-4">

        {/* Order info */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">Order Information</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-[#A89080]">Status</p><Badge variant="info" className="mt-1">{order.status}</Badge></div>
            <div>
              <p className="text-xs text-[#A89080]">Size</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-[#1A120B]">{order.size}</span>
                <button onClick={() => setEditingSize(!editingSize)} className="text-[#C8A96E] hover:text-[#B89558]">
                  <Edit3 size={13} />
                </button>
              </div>
            </div>
            <div><p className="text-xs text-[#A89080]">Base price</p><p className="font-semibold mt-1 text-[#1A120B]">{formatCurrency(order.basePrice)}</p></div>
            <div><p className="text-xs text-[#A89080]">Total charged</p><p className="font-semibold mt-1 text-[#1A120B]">{formatCurrency(order.totalPrice)}</p></div>
            <div><p className="text-xs text-[#A89080]">Delivery date</p><p className="font-semibold mt-1 text-[#1A120B]">{order.deliveryDate}</p></div>
            <div><p className="text-xs text-[#A89080]">Created</p><p className="font-semibold mt-1 text-[#1A120B]">{formatDate(order.createdAt)}</p></div>
          </div>

          {editingSize && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-[#F0E8DB]">
              <p className="text-sm font-semibold text-[#44342A] mb-3">Change size (carrier evidence required)</p>
              <div className="flex gap-2 mb-3">
                {SIZES.map((s) => (
                  <button key={s} onClick={() => setNewSize(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      newSize === s ? "border-[#1A120B] bg-[#1A120B] text-white" : "border-[#EDE8DF] text-[#44342A] hover:border-[#C8A96E]"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {newSize !== order.size && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  Price diff: {formatCurrency(Math.abs(getSizeInfo(newSize).price - getSizeInfo(order.size).price))}
                  {getSizeInfo(newSize).price > getSizeInfo(order.size).price
                    ? " will be charged via off-session payment" : " – no refund per policy"}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSizeChange} loading={saving} size="sm">Save</Button>
                <Button onClick={() => setEditingSize(false)} variant="ghost" size="sm">Cancel</Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Guest */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Guest</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-[#A89080]">Name</p><p className="font-semibold mt-0.5 text-[#1A120B]">{order.guestName}</p></div>
            <div><p className="text-xs text-[#A89080]">Phone</p><p className="font-semibold mt-0.5 text-[#1A120B]">{order.guestPhone}</p></div>
            <div className="col-span-2"><p className="text-xs text-[#A89080]">Email</p><p className="font-semibold mt-0.5 text-[#1A120B]">{order.guestEmail}</p></div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Shipping</p>
          <p className="text-xs text-[#A89080]">From</p>
          <p className="font-semibold text-[#1A120B] mb-2">{order.fromHotel}</p>
          <p className="text-xs text-[#A89080]">To</p>
          <p className="font-semibold text-[#1A120B]">{order.toAddress.facilityName ?? "–"}</p>
          <p className="text-sm text-[#7A6252]">{order.toAddress.recipientName}</p>
          <p className="text-xs text-[#A89080]">{order.toAddress.city}, {order.toAddress.prefecture} {order.toAddress.postalCode}</p>
          {order.trackingNumber && (
            <div className="mt-3 pt-3 border-t border-[#F0E8DB]">
              <p className="text-xs text-[#A89080]">Tracking</p>
              <p className="font-mono font-bold text-sm mt-0.5 text-[#1A120B]">{order.trackingNumber}</p>
              <p className="text-xs text-[#A89080]">{order.carrier}</p>
            </div>
          )}
        </div>

        {/* Evidence photos */}
        {order.photoUrls && order.photoUrls.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Evidence Photos</p>
            <div className="flex gap-3 flex-wrap">
              {order.photoUrls.map((url, i) => (
                url !== "demo-photo" ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Evidence ${i + 1}`}
                      className="w-24 h-24 rounded-2xl object-cover border border-[#EDE8DF] hover:opacity-80 transition-opacity" />
                  </a>
                ) : (
                  <div key={i} className="w-24 h-24 rounded-2xl bg-[#F8F3EC] border border-[#EDE8DF] flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                )
              ))}
            </div>
            <p className="text-xs text-[#A89080] mt-2">Taken by hotel staff at check-in · Retained 7 days post-delivery</p>
          </div>
        )}

        {/* Label */}
        {order.labelUrl && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Shipping Label</p>
            <a href={order.labelUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">View / Print Label</Button>
            </a>
            <p className="text-xs text-[#A89080] mt-2">Retained for 30 days after delivery</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Timeline</p>
          <div className="flex flex-col gap-2 text-xs text-[#7A6252]">
            <p>📝 {formatDate(order.createdAt)} – Order created</p>
            {order.status !== "CREATED" && <p>💳 – Payment confirmed</p>}
            {["CHECKED_IN","HANDED_TO_CARRIER","IN_TRANSIT","DELIVERED"].includes(order.status) && <p>🏨 – Hotel checked in luggage</p>}
            {["HANDED_TO_CARRIER","IN_TRANSIT","DELIVERED"].includes(order.status) && <p>🚚 – Carrier picked up</p>}
            {order.status === "DELIVERED" && <p>✅ – Delivered</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
