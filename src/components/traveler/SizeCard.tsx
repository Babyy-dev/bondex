"use client";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { SizeInfo } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SizeCardProps {
  size: SizeInfo;
  selected: boolean;
  onSelect: () => void;
  onInfoClick: (e: React.MouseEvent) => void;
}

const SIZE_ICONS: Record<string, string> = { S: "🧳", M: "💼", L: "🗃️", LL: "🏌️" };

export function SizeCard({ size, selected, onSelect, onInfoClick }: SizeCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-3xl border-2 p-5 transition-all duration-200 flex flex-col gap-3",
        selected
          ? "border-[#1A120B] bg-[#FEFCF8] shadow-md"
          : "border-[#EDE8DF] bg-white hover:border-[#C8A96E] hover:shadow-sm"
      )}
    >
      {size.code === "M" && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="text-[10px] px-2 py-0.5">Most Common</Badge>
        </div>
      )}

      <div className="flex items-start justify-between">
        <span className="text-3xl">{SIZE_ICONS[size.code]}</span>
        <button
          onClick={onInfoClick}
          className="text-[#A89080] hover:text-[#7A6252] transition-colors"
          aria-label="Size details"
        >
          <Info size={16} />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xl font-bold", selected ? "text-[#1A120B]" : "text-[#1A120B]")}>
            {size.code}
          </span>
          <span className="text-sm text-[#7A6252]">{size.label}</span>
        </div>
        <p className="text-xs text-[#A89080] mt-0.5 leading-snug">{size.description}</p>
      </div>

      <div className="flex items-end justify-between mt-auto pt-2 border-t border-[#F0E8DB]">
        <div>
          <p className="text-xs text-[#A89080]">Max {size.maxWeight}</p>
          <p className="text-xs text-[#A89080]">{size.maxSize}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-[#1A120B]">{formatCurrency(size.price)}</p>
          <p className="text-[10px] text-[#A89080]">from</p>
        </div>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 right-3 w-5 h-5 bg-[#1A120B] rounded-full flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
