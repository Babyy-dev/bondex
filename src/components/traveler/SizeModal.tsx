"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { SizeInfo } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SizeModalProps { size: SizeInfo | null; onClose: () => void; }

export function SizeModal({ size, onClose }: SizeModalProps) {
  return (
    <AnimatePresence>
      {size && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1A120B]/40 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 max-w-lg mx-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#1A120B]">Size {size.code} – {size.label}</h3>
              <button onClick={onClose} className="text-[#A89080] hover:text-[#7A6252] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-[#FEFCF8] rounded-2xl p-6 mb-5 flex items-center justify-center">
              <svg viewBox="0 0 200 160" className="w-48 h-36">
                <rect x="40" y="20" width="120" height="120" rx="8" fill="#EDE8DF" stroke="#C8A96E" strokeWidth="2"/>
                <rect x="80" y="20" width="40" height="12" rx="4" fill="#C8A96E"/>
                <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#1A120B">{size.code}</text>
                <line x1="40" y1="155" x2="160" y2="155" stroke="#A89080" strokeWidth="1.5"/>
                <text x="100" y="168" textAnchor="middle" fontSize="11" fill="#A89080">{size.maxSize}</text>
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Max Size",           value: size.maxSize },
                { label: "Max Weight",         value: size.maxWeight },
                { label: "Base Price",         value: formatCurrency(size.price) },
                { label: "Max (oversized)",    value: formatCurrency(size.maxPrice) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#FEFCF8] rounded-2xl p-4">
                  <p className="text-xs text-[#A89080] mb-1">{label}</p>
                  <p className="font-bold text-[#1A120B]">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#A89080] text-center">
              If the carrier measures a different size, the price adjusts automatically.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
