"use client";
import { use, useEffect, useState, useRef } from "react";
import { ArrowLeft, Edit3, RefreshCw, Printer, FileText, Hash } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Order, LuggageSize } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSizeInfo } from "@/lib/pricing";
import toast from "react-hot-toast";

const SIZES: LuggageSize[] = ["S","M","L","LL"];

// ── Handwritten slip (printable fail-safe) ────────────────────────────────────
function HandwrittenSlip({ order, onClose }: { order: Order; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const print = () => {
    const content = ref.current?.innerHTML ?? "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>BondEx Handwritten Slip – ${order.id}</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; padding: 20px; max-width: 380px; }
        h2 { font-size: 16px; border-bottom: 2px solid #000; padding-bottom: 6px; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px dashed #aaa; padding-bottom: 4px; }
        .label { color: #666; font-size: 11px; }
        .big { font-size: 28px; font-weight: bold; text-align: center; margin: 16px 0; border: 3px solid #000; padding: 10px; }
        .footer { margin-top: 20px; font-size: 10px; color: #888; }
      </style></head><body>
      <h2>BondEx — Emergency Slip (Printer Malfunction)</h2>
      ${content}
      <div class="footer">Generated ${new Date().toLocaleString("ja-JP")} · For hotel staff use only</div>
      </body></html>
    `);
    w.document.close();
    w.print();
    w.close();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="bg-[#1A120B] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span className="font-bold text-sm">Handwritten Slip (Printer Failsafe)</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xs">Close ✕</button>
        </div>

        <div ref={ref} className="p-5 flex flex-col gap-3 text-sm font-mono">
          <div className="text-center text-2xl font-black border-4 border-[#1A120B] rounded-2xl py-3 mb-2">
            {order.id}
          </div>
          {[
            ["Guest",       order.guestName],
            ["Size",        `Size ${order.size}`],
            ["From",        order.fromHotel],
            ["To",          order.toAddress.facilityName ?? order.toAddress.city ?? "–"],
            ["Recipient",   order.toAddress.recipientName],
            ["Postal",      order.toAddress.postalCode],
            ["Pref/City",   `${order.toAddress.prefecture} ${order.toAddress.city}`],
            ["Delivery",    order.deliveryDate],
            ["Phone",       order.guestPhone],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2 border-b border-dashed border-[#EDE8DF] pb-2">
              <span className="text-[#A89080] w-24 flex-shrink-0">{label}:</span>
              <span className="font-bold text-[#1A120B] break-all">{value}</span>
            </div>
          ))}
          {order.trackingNumber && (
            <div className="flex gap-2">
              <span className="text-[#A89080] w-24 flex-shrink-0">Tracking:</span>
              <span className="font-bold text-[#1A120B]">{order.trackingNumber}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <Button onClick={print} size="lg" className="w-full flex items-center gap-2">
            <Printer size={16} /> Print / Save as PDF
          </Button>
          <p className="text-xs text-center text-[#A89080] mt-2">
            Give this paper slip to the guest when the printer is unavailable.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order,           setOrder]           = useState<Order | null>(null);
  const [editingSize,     setEditingSize]      = useState(false);
  const [newSize,         setNewSize]          = useState<LuggageSize>("M");
  const [evidenceNote,    setEvidenceNote]     = useState("");
  const [saving,          setSaving]           = useState(false);
  const [showSlip,        setShowSlip]         = useState(false);
  const [editingTracking, setEditingTracking]  = useState(false);
  const [newTracking,     setNewTracking]      = useState("");
  const [savingTracking,  setSavingTracking]   = useState(false);

  const load = () => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((o) => { setOrder(o); setNewSize(o.size); setNewTracking(o.trackingNumber ?? ""); })
      .catch(console.error);
  };
  useEffect(() => { load(); }, [orderId]);

  // ── Size change with evidence note ───────────────────────────────────────
  const handleSizeChange = async () => {
    if (!order || newSize === order.size) { setEditingSize(false); return; }
    if (!evidenceNote.trim()) {
      toast.error("Please enter the carrier evidence note before changing size.");
      return;
    }
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
      // Save evidence note to order as a note field (stored in a patch)
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceNote }),
      });
      if (data.charged) {
        toast.success(`Size changed to ${newSize} — ${formatCurrency(diff)} charged via Stripe`);
      } else {
        toast.success(`Size changed to ${newSize}${diff > 0 ? ` — ${formatCurrency(diff)} — ${data.message}` : ""}`);
      }
      setEvidenceNote("");
      load(); setEditingSize(false);
    } catch { toast.error("Failed to update size"); }
    finally { setSaving(false); }
  };

  // ── Manual tracking number ───────────────────────────────────────────────
  const handleSaveTracking = async () => {
    if (!order) return;
    setSavingTracking(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: newTracking.trim() || undefined }),
      });
      toast.success("Tracking number saved");
      load(); setEditingTracking(false);
    } catch { toast.error("Failed to save tracking number"); }
    finally { setSavingTracking(false); }
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

        {/* Utility buttons row */}
        <div className="flex gap-2">
          <button onClick={() => setShowSlip(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#7A6252] hover:border-[#C8A96E] hover:text-[#1A120B] transition-all">
            <FileText size={14} /> Handwritten slip
          </button>
          {order.labelUrl && (
            <a href={order.labelUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#7A6252] hover:border-[#C8A96E] hover:text-[#1A120B] transition-all">
              <Printer size={14} /> Print label
            </a>
          )}
        </div>

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

          {/* Size change panel */}
          <AnimatePresence>
            {editingSize && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-[#F0E8DB] overflow-hidden">
                <p className="text-sm font-semibold text-[#44342A] mb-3">Change size</p>
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
                {/* Carrier evidence note — required */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-[#44342A] block mb-1.5">
                    Carrier evidence note <span className="text-red-500">*</span>
                    <span className="text-[#A89080] font-normal ml-1">(required — record carrier's measurement)</span>
                  </label>
                  <textarea
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="e.g. Yamato driver measured 135cm / 17kg — upgraded to L per driver slip #12345"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E] resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSizeChange} loading={saving} size="sm"
                    disabled={!evidenceNote.trim()}>
                    Save change
                  </Button>
                  <Button onClick={() => { setEditingSize(false); setEvidenceNote(""); }} variant="ghost" size="sm">Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

          {/* Tracking number — editable */}
          <div className="mt-4 pt-3 border-t border-[#F0E8DB]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[#A89080]">Tracking number</p>
              <button onClick={() => setEditingTracking(!editingTracking)}
                className="flex items-center gap-1 text-xs text-[#C8A96E] hover:text-[#B89558]">
                <Hash size={11} />
                {editingTracking ? "Cancel" : order.trackingNumber ? "Edit" : "Add manually"}
              </button>
            </div>
            {editingTracking ? (
              <div className="flex gap-2 mt-2">
                <input
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value)}
                  placeholder="Enter tracking number..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#EDE8DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]"
                />
                <Button onClick={handleSaveTracking} loading={savingTracking} size="sm">Save</Button>
              </div>
            ) : (
              order.trackingNumber
                ? <p className="font-mono font-bold text-sm mt-0.5 text-[#1A120B]">{order.trackingNumber}</p>
                : <p className="text-sm text-[#A89080] italic mt-0.5">No tracking number yet</p>
            )}
            {order.carrier && <p className="text-xs text-[#A89080] mt-0.5">{order.carrier}</p>}
          </div>
        </div>

        {/* Evidence photos */}
        {order.photoUrls && order.photoUrls.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">Evidence Photos</p>
            <div className="flex gap-3 flex-wrap">
              {order.photoUrls.filter(url => url && url !== "").map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Evidence ${i + 1}`}
                    className="w-24 h-24 rounded-2xl object-cover border border-[#EDE8DF] hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
            <p className="text-xs text-[#A89080] mt-2">Taken by hotel staff at check-in · Retained 7 days post-delivery</p>
          </div>
        )}

        {/* Shipping label */}
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
            <p>📝 {formatDate(order.createdAt)} — Order created</p>
            {order.status !== "CREATED" && <p>💳 — Payment confirmed</p>}
            {["CHECKED_IN","HANDED_TO_CARRIER","IN_TRANSIT","DELIVERED"].includes(order.status) && <p>🏨 — Hotel checked in luggage</p>}
            {["HANDED_TO_CARRIER","IN_TRANSIT","DELIVERED"].includes(order.status) && (
              <p>🚚 — Carrier picked up{order.trackingNumber ? ` · ${order.trackingNumber}` : ""}</p>
            )}
            {order.status === "DELIVERED" && <p>✅ — Delivered</p>}
            {order.status === "AUTO_CANCELLED" && <p>❌ — Auto-cancelled (deadline passed)</p>}
            {order.status === "CARRIER_REFUSED" && <p>⚠️ — Carrier refused</p>}
          </div>
        </div>
      </div>

      {/* Handwritten slip modal */}
      <AnimatePresence>
        {showSlip && <HandwrittenSlip order={order} onClose={() => setShowSlip(false)} />}
      </AnimatePresence>
    </div>
  );
}
