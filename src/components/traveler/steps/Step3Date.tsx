"use client";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { getDeliveryDates, getEarliestDeliveryDate } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import { GoodToKnow } from "@/components/traveler/GoodToKnow";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { BookingState } from "@/types";

interface Props {
  booking: BookingState;
  update: (p: Partial<BookingState>) => void;
  onNext: () => void;
}

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function Step3Date({ booking, update, onNext }: Props) {
  const dates    = getDeliveryDates();
  const earliest = getEarliestDeliveryDate();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Pick delivery date</h1>
        <p className="text-sm text-[#A89080]">Time slot is automatically scheduled by the system</p>
      </div>

      <div className="flex flex-col gap-2">
        {dates.map((date, i) => {
          const iso        = date.toISOString().split("T")[0];
          const isSelected = booking.deliveryDate === iso;
          const isEarliest = date.getTime() === earliest.getTime();

          return (
            <motion.button
              key={iso}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => update({ deliveryDate: iso })}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-150 text-left",
                isSelected
                  ? "border-[#1A120B] bg-[#FEFCF8]"
                  : "border-[#EDE8DF] bg-white hover:border-[#C8A96E]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex flex-col items-center justify-center",
                  isSelected ? "bg-[#1A120B] text-white" : "bg-[#F8F3EC] text-[#44342A]"
                )}>
                  <span className="text-xs font-medium">{DAYS[date.getDay()]}</span>
                  <span className="text-lg font-black leading-none">{date.getDate()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A120B]">
                    {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} className="text-[#A89080]" />
                    <span className="text-xs text-[#A89080]">Automatically scheduled</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEarliest && <Badge variant="success" className="text-[10px]">Earliest</Badge>}
                {isSelected && (
                  <div className="w-5 h-5 bg-[#1A120B] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {booking.destinationType === "airport" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <span className="text-lg">✈️</span>
          <p className="text-sm text-amber-800">
            Your flight time must be after <strong>14:00</strong> on the selected delivery date.
          </p>
        </div>
      )}

      <GoodToKnow />

      <Button onClick={onNext} disabled={!booking.deliveryDate} size="lg" className="w-full">
        Continue
      </Button>
    </div>
  );
}
