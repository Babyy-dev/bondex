"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { BookingState } from "@/types";

interface Props {
  orderId: string;
  booking: BookingState;
}

export function Step6Confirmed({ orderId, booking }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Generate QR code client-side — no API call needed
  useEffect(() => {
    const qrPayload = JSON.stringify({ orderId, type: "bondex-checkin" });
    QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 2,
      color: { dark: "#1A120B", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl).catch(console.error);
  }, [orderId]);

  const destination =
    booking.toAddress?.facilityName ??
    booking.toAddress?.city ??
    "Your destination";

  const deliveryDate = booking.deliveryDate ?? "";

  const steps = [
    { icon: "🧳", title: "Bring luggage",   desc: "Take to front desk" },
    { icon: "📱", title: "Show QR code",    desc: "Show this screen" },
    { icon: "🏷️",  title: "Attach label",   desc: "Staff prints & hands you" },
  ];

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col">
      {/* Success header */}
      <div className="bg-[#1A120B] text-white px-4 pt-12 pb-8 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-16 h-16 bg-[#C8A96E]/30 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg className="w-8 h-8 text-[#C8A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-2xl font-black mb-1">Booking Confirmed!</motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-white/50 text-sm">Order {orderId}</motion.p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* Delivery summary — built from booking state, no API call */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF] flex flex-col gap-4"
        >
          <InfoRow emoji="📍" label="Pickup from"
            value={`${booking.fromHotel} – Front desk`} />
          <InfoRow emoji="🎯" label="Deliver to"
            value={`${destination}${deliveryDate ? ` · ${formatDate(deliveryDate)}` : ""} · Size ${booking.size ?? "M"}`} />
          {deliveryDate && (
            <InfoRow emoji="⏰" label="Check in by"
              value={
                <span>
                  {formatDate(deliveryDate)} <strong>17:00</strong>
                  <span className="text-xs text-[#A89080] ml-1">· Late check-in may delay delivery</span>
                </span>
              } />
          )}
        </motion.div>

        {/* QR Code — generated client-side from orderId */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border-4 border-[#1A120B] flex flex-col items-center gap-4"
        >
          <p className="text-sm font-semibold text-[#44342A] text-center">
            Show this at the hotel front desk
          </p>

          <div className="w-52 h-52 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for order ${orderId}`} className="w-48 h-48 rounded-xl" />
            ) : (
              <div className="w-48 h-48 bg-[#FEFCF8] rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs font-bold text-[#1A120B]">Scan only at hotel front desk</p>
            <p className="text-xs text-[#A89080] mt-0.5">QR code becomes invalid after check-in</p>
          </div>
        </motion.div>

        {/* 3 Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          {steps.map((step, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 text-center shadow-sm border border-[#EDE8DF] flex flex-col items-center gap-2">
              <span className="text-2xl">{step.icon}</span>
              <p className="text-xs font-bold text-[#1A120B] leading-tight">{step.title}</p>
              <p className="text-[10px] text-[#A89080] leading-tight">{step.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Screenshot tip */}
        <p className="text-xs text-center text-[#A89080] flex items-center justify-center gap-1">
          <Camera size={12} />
          Take a screenshot to save your QR code
        </p>

        {/* CTA */}
        <Link href={`/status/${orderId}`}>
          <Button variant="outline" size="lg" className="w-full">
            <ExternalLink size={16} className="mr-2" />
            View delivery status
          </Button>
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ emoji, label, value }: { emoji: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide">{label}</p>
        <div className="text-sm text-[#1A120B] mt-0.5">{value}</div>
      </div>
    </div>
  );
}
