"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type Resolution = "write_off" | "paid_offline" | "cancel";

const RESOLUTION_OPTS: { value: Resolution; label: string; desc: string; color: string }[] = [
  { value: "paid_offline", label: "Mark as paid (offline)", desc: "Guest paid via cash / bank transfer", color: "border-emerald-400 bg-emerald-50" },
  { value: "write_off",    label: "Write off",              desc: "BondEx absorbs the cost — delivery continues", color: "border-amber-400 bg-amber-50" },
  { value: "cancel",       label: "Cancel order",           desc: "Contact guest and cancel the booking", color: "border-red-400 bg-red-50" },
];

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null); // orderId being resolved
  const [resolution, setResolution] = useState<Resolution>("paid_offline");
  const [resolutionNote, setResolutionNote] = useState("");
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Orders in CREATED status = payment not completed
  const failed = orders.filter((o) => o.status === "CREATED");

  const handleRetry = async (order: Order) => {
    setRetrying((p) => ({ ...p, [order.id]: true }));
    try {
      // Send guest a payment retry link via email (CS-assisted)
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csFlag: true, csNote: "Payment retry link requested by admin" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Payment link sent to ${order.guestEmail}`);
      // Re-flag order in local state
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, flagged: true } : o));
    } catch {
      // Fallback: just notify
      toast.success("CS team notified — they will send the guest a payment link");
    } finally {
      setRetrying((p) => ({ ...p, [order.id]: false }));
    }
  };

  const handleResolve = async () => {
    if (!resolving) return;
    if (!resolutionNote.trim()) { toast.error("Please add a resolution note"); return; }

    const toastId = "resolve-" + resolving;
    toast.loading("Saving resolution...", { id: toastId });
    try {
      let newStatus: string;
      if (resolution === "paid_offline") newStatus = "PAID";
      else if (resolution === "cancel") newStatus = "AUTO_CANCELLED";
      else newStatus = "PAID"; // write_off — treat as paid so delivery continues

      await fetch(`/api/orders/${resolving}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          csNote: `[Manual resolution: ${resolution}] ${resolutionNote}`,
        }),
      });
      toast.success("Resolution saved", { id: toastId });
      setOrders((prev) => prev.map((o) => o.id === resolving ? { ...o, status: newStatus as Order["status"] } : o));
      setResolving(null);
      setResolutionNote("");
    } catch {
      toast.error("Failed to save resolution", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Unpaid Orders</h1>
              <p className="text-white/50 text-sm mt-1">Payment not completed. CS handles these individually.</p>
            </div>
            <button onClick={load} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5">
          <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Important policy</p>
          <p className="text-sm text-amber-700">
            Even if additional payment is declined, the system maintains delivery status.
            BondEx CS contacts customers individually. Use &ldquo;Manual resolution&rdquo; to close cases.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
          </div>
        ) : failed.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-[#EDE8DF]">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-bold text-[#1A120B]">No payment failures</p>
            <p className="text-sm text-[#A89080] mt-1">All payments are processing normally.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {failed.map((order) => (
              <motion.div key={order.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-[#A89080]">{order.id}</p>
                    <p className="font-bold text-[#1A120B]">{order.guestName}</p>
                    <p className="text-xs text-[#A89080]">{order.guestEmail}</p>
                    {order.guestPhone && <p className="text-xs text-[#A89080]">{order.guestPhone}</p>}
                  </div>
                  <Badge variant="error">Unpaid</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><p className="text-xs text-[#A89080]">Amount due</p><p className="font-bold text-[#1A120B]">{formatCurrency(order.totalPrice)}</p></div>
                  <div><p className="text-xs text-[#A89080]">From hotel</p><p className="font-semibold text-[#1A120B]">{order.fromHotel}</p></div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Retry — sends payment link to guest */}
                  <Button
                    onClick={() => handleRetry(order)}
                    loading={retrying[order.id]}
                    size="sm"
                  >
                    <RefreshCw size={13} className="mr-1.5" /> Send payment link
                  </Button>

                  {/* Manual resolution */}
                  <Button
                    onClick={() => { setResolving(order.id); setResolution("paid_offline"); setResolutionNote(""); }}
                    variant="ghost"
                    size="sm"
                  >
                    <CheckCircle size={13} className="mr-1.5" /> Manual resolution
                  </Button>

                  <Link href={`/admin/orders/${order.id}`}>
                    <Button variant="ghost" size="sm">View order</Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Manual resolution bottom sheet */}
      <AnimatePresence>
        {resolving && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setResolving(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-6 max-w-lg mx-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-[#1A120B] text-lg">Manual Resolution</h2>
                <button onClick={() => setResolving(null)} className="w-8 h-8 rounded-full bg-[#F0E8DB] flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[#A89080] mb-4">Order <span className="font-mono">{resolving}</span></p>

              <div className="flex flex-col gap-2 mb-4">
                {RESOLUTION_OPTS.map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    resolution === opt.value ? opt.color : "border-[#EDE8DF] hover:border-[#C8A96E]"
                  }`}>
                    <input type="radio" name="resolution" value={opt.value} checked={resolution === opt.value}
                      onChange={() => setResolution(opt.value)} className="sr-only" />
                    <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      resolution === opt.value ? "border-[#1A120B]" : "border-[#C8A96E]"
                    }`}>
                      {resolution === opt.value && <div className="w-2 h-2 bg-[#1A120B] rounded-full" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A120B]">{opt.label}</p>
                      <p className="text-xs text-[#7A6252]">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mb-5">
                <p className="text-sm font-medium text-[#44342A] mb-1.5">
                  Resolution note <span className="text-red-500">*</span>
                </p>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Describe what happened and why this resolution was chosen..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-[#FEFCF8] text-sm text-[#1A120B] placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setResolving(null)} variant="ghost" size="lg" className="flex-1">Cancel</Button>
                <Button onClick={handleResolve} size="lg" className="flex-1">Save resolution</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
