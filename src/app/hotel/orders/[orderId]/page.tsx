"use client";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Printer, Flag, Info, Copy, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Delivery step tracker ─────────────────────────────────────────────────────

type StepKey = "waiting" | "in_transit" | "at_office" | "delivered";

const DELIVERY_STEPS: { key: StepKey; en: string; ja: string }[] = [
  { key: "waiting",    en: "Waiting for pickup",  ja: "集荷待ち"    },
  { key: "in_transit", en: "In transit",          ja: "輸送中"      },
  { key: "at_office",  en: "Left at office",      ja: "営業所留め"  },
  { key: "delivered",  en: "Delivery completed",  ja: "配達完了"    },
];

function getStepIndex(status: string): number {
  if (status === "DELIVERED")         return 3;
  if (status === "IN_TRANSIT")        return 2;
  if (status === "HANDED_TO_CARRIER") return 1;
  return 0; // PAID, CHECKED_IN
}

function DeliveryStepTracker({ status, lang }: { status: string; lang: "EN" | "JA" }) {
  const activeIndex = getStepIndex(status);
  return (
    <div className="relative flex items-start justify-between">
      {/* connecting line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-[#EDE8DF]" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-[#C8A96E] transition-all duration-500"
        style={{ width: `${(activeIndex / (DELIVERY_STEPS.length - 1)) * 100}%` }}
      />
      {DELIVERY_STEPS.map((step, i) => {
        const done    = i < activeIndex;
        const current = i === activeIndex;
        return (
          <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              done    ? "bg-[#C8A96E] border-[#C8A96E] text-white" :
              current ? "bg-white border-[#C8A96E] text-[#C8A96E]" :
                        "bg-white border-[#EDE8DF] text-[#A89080]"
            }`}>
              {done ? "✓" : i + 1}
            </div>
            <p className={`text-[10px] text-center leading-tight ${current ? "font-bold text-[#1A120B]" : "text-[#A89080]"}`}>
              {lang === "EN" ? step.en : step.ja}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Reprint modal ─────────────────────────────────────────────────────────────

function ReprintModal({ onConfirm, onCancel, loading, lang }: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  lang: "EN" | "JA";
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-center w-12 h-12 bg-[#F8F3EC] rounded-2xl mx-auto mb-4">
          <Printer size={22} className="text-[#C8A96E]" />
        </div>
        <h3 className="text-base font-black text-[#1A120B] text-center mb-1">
          {lang === "EN" ? "Reprint shipping label?" : "配送ラベルを再印刷しますか？"}
        </h3>
        <p className="text-xs text-[#A89080] text-center mb-5">
          {lang === "EN"
            ? "The label will be sent to the printer again."
            : "ラベルがプリンターに再送信されます。"}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-[#EDE8DF] text-sm font-medium text-[#7A6252] hover:bg-[#F8F3EC] transition-colors">
            {lang === "EN" ? "Cancel" : "キャンセル"}
          </button>
          <Button onClick={onConfirm} loading={loading} className="flex-1">
            {lang === "EN" ? "Reprint" : "再印刷"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HotelOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order,        setOrder]        = useState<Order | null>(null);
  const [reprinting,   setReprinting]   = useState(false);
  const [showReprint,  setShowReprint]  = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [lang,         setLang]         = useState<"EN" | "JA">("EN");

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(setOrder).catch(console.error);
  }, [orderId]);

  const handleReprint = async () => {
    if (!order?.labelUrl) { toast.error("No label available"); return; }
    setReprinting(true);
    window.open(order.labelUrl, "_blank");
    await new Promise((r) => setTimeout(r, 600));
    toast.success(lang === "EN" ? "Label sent to printer" : "ラベルをプリンターに送信しました");
    setReprinting(false);
    setShowReprint(false);
  };

  const handleFlag = async () => {
    if (!order) return;
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: true }),
    });
    setOrder((prev) => prev ? { ...prev, flagged: true } : prev);
    toast("Issue flagged. CS will handle it.", { icon: "🚩" });
  };

  const handleCopyTracking = () => {
    if (!order?.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!order) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
    </div>
  );

  const canReprint = ["PAID","CHECKED_IN"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/hotel/orders" className="flex items-center gap-2 text-white/50 hover:text-white text-sm">
              <ArrowLeft size={16} />
              {lang === "EN" ? "Back to list" : "一覧へ戻る"}
            </Link>
            {/* Language switcher */}
            <div className="flex bg-white/10 rounded-xl overflow-hidden text-xs">
              {(["EN","JA"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition-all ${lang === l ? "bg-[#C8A96E] text-[#1A120B]" : "text-white/60"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs font-mono">{order.id}</p>
              <h1 className="text-xl font-black mt-0.5">{order.guestName}</h1>
            </div>
            {order.flagged && <Badge variant="error">🚩 Flagged</Badge>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {/* View-only notice */}
        <div className="flex items-center gap-2 bg-[#FEFCF8] border border-[#EDE8DF] rounded-2xl px-4 py-3">
          <Info size={14} className="text-[#C8A96E] flex-shrink-0" />
          <p className="text-xs text-[#7A6252]">
            {lang === "EN" ? "View only. No editing available on this screen." : "閲覧のみ。この画面では編集できません。"}
          </p>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">
            {lang === "EN" ? "Order details" : "注文詳細"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <D label={lang === "EN" ? "Guest"         : "ゲスト名"}   value={order.guestName} />
            <D label={lang === "EN" ? "Size"          : "サイズ"}     value={`Size ${order.size}`} />
            <D label={lang === "EN" ? "Status"        : "ステータス"} value={order.status} />
            <D label={lang === "EN" ? "Check-in date" : "受付日"}     value={order.checkedInAt ? formatDate(order.checkedInAt) : (lang === "EN" ? "Not yet checked in" : "未受付")} />
            <D label={lang === "EN" ? "Delivery date" : "配達日"}     value={formatDate(order.deliveryDate)} />
            <D label={lang === "EN" ? "Packages"      : "個数"}       value="1" />
          </div>
        </div>

        {/* Destination */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-3">
            {lang === "EN" ? "Destination" : "配送先"}
          </p>
          <p className="font-semibold text-[#1A120B]">{order.toAddress.facilityName ?? "–"}</p>
          <p className="text-sm text-[#7A6252] mt-0.5">{order.toAddress.recipientName}</p>
          <p className="text-xs text-[#A89080] mt-0.5">{order.toAddress.city}, {order.toAddress.prefecture} {order.toAddress.postalCode}</p>
        </div>

        {/* Delivery step tracker */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
          <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-5">
            {lang === "EN" ? "Delivery progress" : "配送状況"}
          </p>
          <DeliveryStepTracker status={order.status} lang={lang} />
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
            <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-2">
              {lang === "EN" ? "Tracking" : "追跡番号"}
            </p>
            <p className="text-xs text-[#A89080]">{order.carrier ?? "Yamato Transport"}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="font-mono text-sm font-bold text-[#1A120B]">{order.trackingNumber}</p>
              <button onClick={handleCopyTracking}
                className="flex items-center gap-1 text-xs text-[#C8A96E] hover:text-[#B89558] transition-colors">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? (lang === "EN" ? "Copied" : "コピー済み") : (lang === "EN" ? "Copy" : "コピー")}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {canReprint && (
            <Button onClick={() => setShowReprint(true)} variant="outline" className="w-full flex items-center gap-2">
              <Printer size={16} />
              {lang === "EN" ? "Reprint shipping label" : "配送ラベルを再印刷"}
            </Button>
          )}
          {!order.flagged && (
            <button onClick={handleFlag}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
              <Flag size={15} />
              {lang === "EN" ? "Flag an issue (no reason required)" : "問題をフラグ（理由不要）"}
            </button>
          )}
        </div>

        <Link href={`/hotel/scan?orderId=${orderId}`}>
          <Button size="lg" className="w-full">
            {lang === "EN" ? "Go to QR scan / Check-in" : "QRスキャン・受付へ"}
          </Button>
        </Link>
      </div>

      {/* Reprint confirmation modal */}
      <AnimatePresence>
        {showReprint && (
          <ReprintModal
            onConfirm={handleReprint}
            onCancel={() => setShowReprint(false)}
            loading={reprinting}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function D({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#A89080]">{label}</p>
      <p className="text-sm font-semibold text-[#1A120B] mt-0.5">{value}</p>
    </div>
  );
}
