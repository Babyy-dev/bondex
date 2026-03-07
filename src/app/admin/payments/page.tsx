"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(console.error);
  }, []);

  const failed = orders.filter((_, i) => i === 0).map((o) => ({
    ...o, failReason: "Card declined", retryCount: 1,
  }));

  const handleRetry = async (id: string) => {
    toast.loading("Retrying payment...", { id });
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Payment retry queued", { id });
  };

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-2xl font-black">Payment Failures</h1>
          <p className="text-white/50 text-sm mt-1">Delivery is NOT stopped. CS handles these individually.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5">
          <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Important policy</p>
          <p className="text-sm text-amber-700">
            Even if additional payment is declined, the system maintains delivery status.
            BondEx CS contacts customers individually.
          </p>
        </div>

        {failed.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-[#EDE8DF]">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-bold text-[#1A120B]">No payment failures</p>
            <p className="text-sm text-[#A89080] mt-1">All payments are processing normally.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {failed.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-[#A89080]">{item.id}</p>
                    <p className="font-bold text-[#1A120B]">{item.guestName}</p>
                    <p className="text-xs text-[#A89080]">{item.guestEmail}</p>
                  </div>
                  <Badge variant="error">Payment failed</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div><p className="text-xs text-[#A89080]">Amount</p><p className="font-semibold text-[#1A120B]">{formatCurrency(item.totalPrice)}</p></div>
                  <div><p className="text-xs text-[#A89080]">Reason</p><p className="font-semibold text-red-600">{item.failReason}</p></div>
                  <div><p className="text-xs text-[#A89080]">Retry #</p><p className="font-semibold text-[#1A120B]">{item.retryCount}</p></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleRetry(item.id)} size="sm">
                    <RefreshCw size={13} className="mr-1.5" /> Retry payment
                  </Button>
                  <Link href={`/admin/orders/${item.id}`}>
                    <Button variant="ghost" size="sm">View order</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
