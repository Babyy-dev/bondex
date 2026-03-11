"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Camera } from "lucide-react";
import { SIZES } from "@/lib/pricing";
import { SizeCard } from "@/components/traveler/SizeCard";
import { SizeModal } from "@/components/traveler/SizeModal";
import { Button } from "@/components/ui/Button";
import type { BookingState, SizeInfo } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  booking: BookingState;
  update: (p: Partial<BookingState>) => void;
  onNext: () => void;
}

const PROHIBITED = [
  { emoji: "💴", label: "Cash & valuables" },
  { emoji: "⚡", label: "Dangerous goods" },
  { emoji: "🌿", label: "Plants & food" },
  { emoji: "🚫", label: "Restricted items" },
];

export function Step1Luggage({ booking, update, onNext }: Props) {
  const [modalSize, setModalSize]       = useState<SizeInfo | null>(null);
  const [showProhibited, setShowProhibited] = useState(false);

  const canContinue = !!booking.size && booking.agreedToTerms;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Select luggage size</h1>
        <p className="text-sm text-[#A89080]">Handled by Japan's nationwide delivery network</p>
      </div>

      {/* Size grid */}
      <div className="grid grid-cols-2 gap-3">
        {SIZES.map((size, i) => (
          <motion.div
            key={size.code}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <SizeCard
              size={size}
              selected={booking.size === size.code}
              onSelect={() => update({ size: size.code })}
              onInfoClick={(e) => { e.stopPropagation(); setModalSize(size); }}
            />
          </motion.div>
        ))}
      </div>

      {/* Prohibited items toggle */}
      <button
        onClick={() => setShowProhibited(!showProhibited)}
        className="flex items-center gap-2 text-sm text-[#B5621A] font-medium bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 w-full text-left"
      >
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
        View prohibited items
      </button>

      {showProhibited && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-amber-50 border border-amber-200 rounded-3xl p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {PROHIBITED.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm text-amber-800">{item.label}</span>
              </div>
            ))}
          </div>
          <a
            href="https://www.kuronekoyamato.co.jp/ytc/en/send/prohibit/"
            target="_blank" rel="noopener noreferrer"
            className="mt-3 block text-xs text-amber-700 underline"
          >
            Full prohibited items list →
          </a>
        </motion.div>
      )}

      {/* Size notice */}
      <p className="text-xs text-[#7A6252] bg-[#F5EDE0] border border-[#EDE8DF] rounded-2xl px-4 py-3">
        If the carrier measures a different size, the price adjusts automatically.
        Delivery will not be stopped.
      </p>

      {/* Condition photos — optional, max 2 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#44342A]">Luggage photos <span className="text-[#A89080] font-normal">(optional)</span></p>
          <span className="text-xs text-[#A89080]">{booking.conditionPhotos.length}/2</span>
        </div>
        <p className="text-xs text-[#7A6252]">Help hotel staff identify your luggage. Not required.</p>

        <div className="flex gap-3">
          {booking.conditionPhotos.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#EDE8DF]">
              <img src={url} alt={`Luggage photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => update({ conditionPhotos: booking.conditionPhotos.filter((_, idx) => idx !== i) })}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
              >✕</button>
            </div>
          ))}
          {booking.conditionPhotos.length < 2 && (
            <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#EDE8DF] flex flex-col items-center justify-center cursor-pointer hover:border-[#C8A96E] transition-colors bg-white">
              <Camera size={18} className="text-[#A89080] mb-1" />
              <span className="text-[10px] text-[#A89080]">Add photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    update({ conditionPhotos: [...booking.conditionPhotos, reader.result as string] });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Consent */}
      <label className={cn(
        "flex items-start gap-3 cursor-pointer p-4 rounded-3xl border-2 transition-all duration-150",
        booking.agreedToTerms ? "border-[#1A120B] bg-[#FEFCF8]" : "border-[#EDE8DF] bg-white"
      )}>
        <div
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            booking.agreedToTerms ? "bg-[#1A120B] border-[#1A120B]" : "border-[#C8A96E]"
          )}
          onClick={() => update({ agreedToTerms: !booking.agreedToTerms })}
        >
          {booking.agreedToTerms && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input type="checkbox" className="sr-only" checked={booking.agreedToTerms}
          onChange={(e) => update({ agreedToTerms: e.target.checked })} />
        <span className="text-sm text-[#44342A] leading-snug">
          I confirm my item is eligible for delivery and understand size adjustments may apply.
        </span>
      </label>

      <Button onClick={onNext} disabled={!canContinue} size="lg" className="w-full">
        Continue
      </Button>

      <SizeModal size={modalSize} onClose={() => setModalSize(null)} />
    </div>
  );
}
