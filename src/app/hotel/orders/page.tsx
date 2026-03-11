"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, QrCode, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Filter = "all" | "PAID" | "CHECKED_IN" | "flagged";

function statusInfo(status: string, flagged?: boolean) {
  if (flagged) return { label: "Flagged", variant: "error" as const, icon: "🚩" };
  const map: Record<string, { label: string; variant: "warning"|"success"|"info"|"neutral"; icon: string }> = {
    PAID:             { label: "Waiting for guest", variant: "warning", icon: "⏳" },
    CHECKED_IN:       { label: "Ready for pickup",  variant: "success", icon: "✅" },
    HANDED_TO_CARRIER:{ label: "Picked up",         variant: "success", icon: "🚚" },
    IN_TRANSIT:       { label: "In transit",        variant: "info",    icon: "📦" },
    DELIVERED:        { label: "Delivered",         variant: "success", icon: "🎉" },
  };
  return map[status] ?? { label: status, variant: "neutral" as const, icon: "❓" };
}

const FILTERS: { key: Filter; en: string; ja: string }[] = [
  { key: "all",       en: "All",        ja: "すべて"   },
  { key: "PAID",      en: "Waiting",    ja: "待機中"   },
  { key: "CHECKED_IN",en: "Checked in", ja: "受付済み" },
  { key: "flagged",   en: "Flagged",    ja: "フラグ"   },
];

export default function HotelOrdersPage() {
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [filter,    setFilter]    = useState<Filter>("all");
  const [query,     setQuery]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [lang,      setLang]      = useState<"EN"|"JA">("EN");
  const [hotelId,   setHotelId]   = useState<string>("");
  const [hotelName, setHotelName] = useState<string>("Hotel");
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/hotel/login");
  };

  const load = (hid = hotelId) => {
    if (!hid) return;
    setLoading(true);
    fetch(`/api/orders?hotelId=${hid}`)
      .then((r) => r.json())
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((session) => {
        setHotelId(session.hotelId);
        setHotelName(session.hotelName ?? "Hotel");
        load(session.hotelId);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "flagged")  return o.flagged;
    if (filter !== "all" && o.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.guestName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      {/* Header */}
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black">{hotelName}</h1>
            <p className="text-white/50 text-sm">Today's Pickup List</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 rounded-xl overflow-hidden text-xs">
              {(["EN","JA"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition-all ${lang === l ? "bg-[#C8A96E] text-[#1A120B]" : "text-white/60"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => load(hotelId)} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
              <RefreshCw size={15} />
            </button>
            <button onClick={handleLogout} title="Logout" className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89080]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "EN" ? "Search by order ID or guest name..." : "予約IDまたはゲスト名で検索..."}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === f.key
                  ? "bg-[#1A120B] text-white"
                  : "bg-white text-[#7A6252] border border-[#EDE8DF] hover:border-[#C8A96E]"
              )}
            >
              {lang === "EN" ? f.en : f.ja}
            </button>
          ))}
        </div>

        {/* Order list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#A89080] text-sm">No orders found</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order, i) => {
              const s = statusInfo(order.status, order.flagged);
              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/hotel/orders/${order.id}`}>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-mono text-[#A89080]">{order.id}</p>
                          <p className="font-bold text-[#1A120B]">{order.guestName}</p>
                        </div>
                        <Badge variant={s.variant}>{s.icon} {s.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#A89080]">
                        <span>Size {order.size}</span>
                        <span>→ {order.toAddress.facilityName ?? order.toAddress.city}</span>
                        <span className="ml-auto font-medium text-[#7A6252]">{order.deliveryDate}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link href="/hotel/scan">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-[#1A120B] rounded-full flex items-center justify-center shadow-2xl cursor-pointer">
          <QrCode size={24} className="text-[#C8A96E]" />
        </motion.div>
      </Link>
    </div>
  );
}
