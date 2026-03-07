"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shield, Clock, Globe } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, title: "Japan's delivery infrastructure, built in", desc: "Powered by Yamato Transport & Sagawa Express" },
  { icon: Clock,  title: "36-hour adventure",                         desc: "Book today, delivered tomorrow" },
  { icon: Globe,  title: "Anywhere in Japan",                         desc: "Hotels, airports, stations, depots" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-lg mx-auto w-full">
        <span className="text-2xl font-black text-[#1A120B] tracking-tight">BondEx</span>
        <div className="flex gap-4">
          <Link href="/hotel/login"     className="text-[#A89080] text-sm hover:text-[#1A120B] transition-colors">Hotel staff</Link>
          <Link href="/admin/login"     className="text-[#A89080] text-sm hover:text-[#1A120B] transition-colors">Admin</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Floating suitcase */}
          <div className="mb-8 flex justify-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-28 h-28 bg-[#F8F3EC] border border-[#EDE8DF] rounded-full flex items-center justify-center"
            >
              <span className="text-6xl">🧳</span>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#C8A96E] text-xs font-bold uppercase tracking-widest mb-3"
          >
            Japan Luggage Delivery
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black text-[#1A120B] leading-tight mb-4"
          >
            Enjoy a miniature<br />
            <span className="text-[#C8A96E]">36-hour adventure</span><br />
            without luggage
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#A89080] text-base mb-10 leading-relaxed"
          >
            Ship your bags from your hotel to your next destination.
            We handle everything — you explore freely.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/book"
              className="inline-flex items-center gap-3 bg-[#1A120B] text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-[#2D1A0E] active:scale-[0.97] transition-all shadow-lg shadow-[#1A120B]/10"
            >
              Start Booking
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-14 grid grid-cols-1 gap-3 w-full"
        >
          {TRUST_ITEMS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="flex items-start gap-4 bg-white border border-[#EDE8DF] rounded-2xl px-5 py-4 text-left"
            >
              <div className="w-9 h-9 bg-[#F8F3EC] rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-[#C8A96E]" />
              </div>
              <div>
                <p className="text-[#1A120B] text-sm font-semibold">{title}</p>
                <p className="text-[#A89080] text-xs mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Demo links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-8 flex flex-wrap gap-3 justify-center"
        >
          <Link href="/hotel/login"    className="text-xs text-[#C8A96E] hover:text-[#1A120B] transition-colors underline">Hotel Staff Portal →</Link>
          <span className="text-[#EDE8DF] text-xs">|</span>
          <Link href="/admin/login"    className="text-xs text-[#C8A96E] hover:text-[#1A120B] transition-colors underline">Admin Dashboard →</Link>
          <span className="text-[#EDE8DF] text-xs">|</span>
          <Link href="/status/ORD-DEMO1" className="text-xs text-[#C8A96E] hover:text-[#1A120B] transition-colors underline">Demo Status →</Link>
        </motion.div>
      </div>
    </div>
  );
}
