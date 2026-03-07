"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, Package, AlertTriangle, Hotel, DollarSign, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders",    label: "Orders",    icon: "📦" },
  { href: "/admin/payments",  label: "Payments",  icon: "💳" },
  { href: "/admin/hotels",    label: "Hotels",    icon: "🏨" },
];

function StatCard({ label, value, sub, icon, bg }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; bg: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]"
    >
      <div className={`w-10 h-10 ${bg} rounded-2xl flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-black text-[#1A120B]">{value}</p>
      <p className="text-sm text-[#A89080] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#C8A96E] mt-1 font-medium">{sub}</p>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const load = () => {
    setLoading(true);
    fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const revenue  = orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.totalPrice, 0);
  const earnings = Math.round(revenue * 0.15);
  const flagged  = orders.filter((o) => o.flagged).length;
  const paid     = orders.filter((o) => o.status === "PAID").length;
  const checkedIn= orders.filter((o) => o.status === "CHECKED_IN").length;

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex">
      {/* Sidebar */}
      <div className="w-56 bg-[#1A120B] text-white flex-col py-6 px-4 hidden md:flex">
        <div className="text-xl font-black mb-8 px-2 text-[#C8A96E]">BondEx</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 px-3">← Back to app</Link>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-[#1A120B]">Dashboard</h1>
              <p className="text-sm text-[#A89080]">{new Date().toDateString()}</p>
            </div>
            <button onClick={load} className="w-9 h-9 bg-white rounded-xl border border-[#EDE8DF] flex items-center justify-center hover:bg-[#FEFCF8]">
              <RefreshCw size={15} className="text-[#7A6252]" />
            </button>
          </div>

          {/* Alerts */}
          {(flagged > 0 || paid > 2) && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Action required</p>
                {flagged > 0 && <p className="text-xs text-amber-700 mt-1">🚩 {flagged} flagged order(s) need attention</p>}
                {paid > 2   && <p className="text-xs text-amber-700 mt-0.5">⏳ {paid} order(s) still waiting for check-in</p>}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Your Earnings" value={formatCurrency(earnings)} sub="15% of shipping fees"
              icon={<DollarSign size={18} className="text-[#C8A96E]" />} bg="bg-[#F8F3EC]" />
            <StatCard label="Today's Orders" value={String(orders.length)} sub={`${checkedIn} checked in`}
              icon={<Package size={18} className="text-blue-600" />} bg="bg-blue-50" />
            <StatCard label="Revenue" value={formatCurrency(revenue)} sub="Delivered orders"
              icon={<TrendingUp size={18} className="text-emerald-600" />} bg="bg-emerald-50" />
            <StatCard label="Hotels Active" value="2" sub="0 paused"
              icon={<Hotel size={18} className="text-orange-600" />} bg="bg-orange-50" />
          </div>

          {/* Recent orders table */}
          <div className="bg-white rounded-3xl shadow-sm border border-[#EDE8DF] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F0E8DB] flex items-center justify-between">
              <h2 className="font-bold text-[#1A120B]">Recent Orders</h2>
              <Link href="/admin/orders" className="text-sm text-[#C8A96E] hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-[#A89080] uppercase tracking-wide border-b border-[#F0E8DB]">
                    <th className="text-left px-6 py-3">Order</th>
                    <th className="text-left px-6 py-3">Guest</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="border-b border-[#FEFCF8] hover:bg-[#FEFCF8] transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="text-sm font-mono text-[#C8A96E] hover:underline">{o.id}</Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-[#1A120B]">{o.guestName}</td>
                      <td className="px-6 py-3">
                        <Badge variant={o.status === "DELIVERED" ? "success" : o.status === "PAID" ? "warning" : o.status === "CHECKED_IN" ? "info" : "neutral"}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-[#1A120B]">{formatCurrency(o.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
