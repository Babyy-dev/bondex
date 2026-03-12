"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import type { Hotel } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [query,  setQuery]  = useState("");

  useEffect(() => {
    fetch("/api/hotels").then((r) => r.json()).then(setHotels).catch(console.error);
  }, []);

  const filtered = hotels.filter((h) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      (h.branchName ?? "").toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Hotels</h1>
            <Link href="/admin/hotels/new">
              <Button size="sm" variant="secondary">
                <Plus size={14} className="mr-1.5" /> Add hotel
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5 flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89080]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, branch, or area..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((hotel, i) => (
            <motion.div key={hotel.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-[#1A120B]">{hotel.name}</p>
                  {hotel.branchName && <p className="text-sm text-[#7A6252]">{hotel.branchName}</p>}
                  <p className="text-xs text-[#A89080] mt-0.5">{hotel.address}</p>
                </div>
                <Badge variant={hotel.status === "active" ? "success" : "neutral"}>{hotel.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-[#7A6252]">
                <div><p className="text-[#A89080]">Carrier</p><p className="font-medium capitalize">{hotel.carrier}</p></div>
                <div>
                  <p className="text-[#A89080]">Hours</p>
                  <p className="font-medium">{hotel.receiptStartTime ? `${hotel.receiptStartTime} – ${hotel.cutoffTime}` : `Until ${hotel.cutoffTime}`}</p>
                </div>
                <div><p className="text-[#A89080]">Today's orders</p><p className="font-medium">{hotel.dailyOrderCount}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#F0E8DB] flex items-center gap-2 text-xs text-[#A89080]">
                <span>🖨️ {hotel.printerType.replace(/_/g, " ")}</span>
                <span>·</span>
                <span>{hotel.labelSize} label</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
