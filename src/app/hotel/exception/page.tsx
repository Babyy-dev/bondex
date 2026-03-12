"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, QrCode, Printer, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Order } from "@/types";
import toast from "react-hot-toast";

type QuestionType = "damaged_qr" | "other" | null;
type Stage = "select" | "search" | "found" | "reallocated";

// ── Status helpers ────────────────────────────────────────────────────────────

function statusBadge(status: string, flagged?: boolean) {
  if (flagged) return { label: "Flagged", variant: "error" as const };
  const map: Record<string, { label: string; variant: "warning"|"success"|"info"|"neutral" }> = {
    PAID:              { label: "Waiting for guest", variant: "warning" },
    CHECKED_IN:        { label: "Checked in",        variant: "success" },
    HANDED_TO_CARRIER: { label: "Picked up",         variant: "success" },
    IN_TRANSIT:        { label: "In transit",        variant: "info"    },
    DELIVERED:         { label: "Delivered",         variant: "success" },
  };
  return map[status] ?? { label: status, variant: "neutral" as const };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HotelExceptionPage() {
  const [lang,          setLang]          = useState<"EN" | "JA">("EN");
  const [stage,         setStage]         = useState<Stage>("select");
  const [questionType,  setQuestionType]  = useState<QuestionType>(null);
  const [query,         setQuery]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [results,       setResults]       = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reprinting,    setReprinting]    = useState(false);

  const t = {
    title:       lang === "EN" ? "Exception Handling"                       : "例外対応",
    subtitle:    lang === "EN" ? "QR damaged or other issue"                : "QR破損・その他の問題",
    back:        lang === "EN" ? "Back to list"                             : "一覧へ戻る",
    selectQ:     lang === "EN" ? "What is the issue?"                      : "問題の種類を選択してください",
    damagedQr:   lang === "EN" ? "QR code is damaged / unreadable"         : "QRコードが破損・読み取れない",
    damagedQrSub:lang === "EN" ? "Manually look up the order and reissue label" : "手動で注文を検索し、ラベルを再発行します",
    otherIssue:  lang === "EN" ? "Other issue"                             : "その他の問題",
    otherSub:    lang === "EN" ? "Search order and flag for CS"            : "注文を検索してCSにフラグを立てる",
    searchTitle: lang === "EN" ? "Search order"                            : "注文を検索",
    searchHint:  lang === "EN" ? "Enter booking ID or guest name"          : "予約IDまたはゲスト名を入力",
    search:      lang === "EN" ? "Search"                                  : "検索",
    noResults:   lang === "EN" ? "No orders found"                         : "注文が見つかりません",
    selectOrder: lang === "EN" ? "Select an order to continue"             : "続行する注文を選択してください",
    orderFound:  lang === "EN" ? "Order found"                             : "注文が見つかりました",
    reissue:     lang === "EN" ? "Reissue label (no repayment required)"   : "ラベル再発行（再支払い不要）",
    reissuing:   lang === "EN" ? "Reissuing…"                              : "再発行中…",
    scanInstead: lang === "EN" ? "Proceed to check-in without QR scan"     : "QRスキャンなしで受付へ進む",
    flagCS:      lang === "EN" ? "Flag issue for CS"                       : "CSに問題をフラグ",
    reset:       lang === "EN" ? "Start over"                              : "最初からやり直す",
    doneTitle:   lang === "EN" ? "Label reissued"                          : "ラベルを再発行しました",
    doneSub:     lang === "EN" ? "Hand the new label to the guest."        : "新しいラベルをゲストに渡してください。",
    backList:    lang === "EN" ? "Back to order list"                      : "注文一覧へ戻る",
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      // Try direct ID lookup first
      const byId = await fetch(`/api/orders/${query.trim()}`);
      if (byId.ok) {
        const order: Order = await byId.json();
        setResults([order]);
      } else {
        // Fall back to listing all and filtering by guest name
        const all = await fetch("/api/orders").then((r) => r.json()) as Order[];
        const q = query.trim().toLowerCase();
        setResults(all.filter((o) =>
          o.id.toLowerCase().includes(q) || o.guestName.toLowerCase().includes(q)
        ));
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Reissue label ─────────────────────────────────────────────────────────

  const handleReissue = async () => {
    if (!selectedOrder) return;
    setReprinting(true);
    try {
      // Trigger check-in / label generation (non-photo path — system already has photos or uses demo)
      const res = await fetch("/api/shipco/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id, photoUrls: selectedOrder.photoUrls ?? [] }),
      });
      const data = await res.json();
      if (data.labelUrl) window.open(data.labelUrl, "_blank");
      toast.success(lang === "EN" ? "Label reissued and sent to printer" : "ラベルを再発行しプリンターに送信しました");
      setStage("reallocated");
    } catch {
      toast.error("Reissue failed. Please try again.");
    } finally {
      setReprinting(false);
    }
  };

  const handleFlag = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: true }),
    });
    toast("Issue flagged — CS will follow up", { icon: "🚩" });
    setSelectedOrder((prev) => prev ? { ...prev, flagged: true } : prev);
  };

  const reset = () => {
    setStage("select");
    setQuestionType(null);
    setQuery("");
    setResults([]);
    setSelectedOrder(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      {/* Header */}
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/hotel/orders" className="flex items-center gap-2 text-white/50 hover:text-white text-sm">
              <ArrowLeft size={16} /> {t.back}
            </Link>
            <div className="flex bg-white/10 rounded-xl overflow-hidden text-xs">
              {(["EN","JA"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition-all ${lang === l ? "bg-[#C8A96E] text-[#1A120B]" : "text-white/60"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <h1 className="text-xl font-black">{t.title}</h1>
          <p className="text-white/50 text-sm">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ── Stage: Select question type ── */}
          {stage === "select" && (
            <motion.div key="select"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm font-semibold text-[#1A120B]">{t.selectQ}</p>

              {/* Damaged QR */}
              <button
                onClick={() => { setQuestionType("damaged_qr"); setStage("search"); }}
                className="w-full bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FDF6E8] flex items-center justify-center flex-shrink-0">
                  <QrCode size={22} className="text-[#C8A96E]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#1A120B] text-sm">{t.damagedQr}</p>
                  <p className="text-xs text-[#A89080] mt-0.5">{t.damagedQrSub}</p>
                </div>
                <ChevronRight size={16} className="text-[#A89080] mt-0.5 flex-shrink-0" />
              </button>

              {/* Other issue */}
              <button
                onClick={() => { setQuestionType("other"); setStage("search"); }}
                className="w-full bg-white rounded-3xl p-5 border border-[#EDE8DF] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🚩</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#1A120B] text-sm">{t.otherIssue}</p>
                  <p className="text-xs text-[#A89080] mt-0.5">{t.otherSub}</p>
                </div>
                <ChevronRight size={16} className="text-[#A89080] mt-0.5 flex-shrink-0" />
              </button>
            </motion.div>
          )}

          {/* ── Stage: Search ── */}
          {stage === "search" && (
            <motion.div key="search"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                <button onClick={reset} className="text-[#A89080] hover:text-[#7A6252]">
                  <ArrowLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-[#1A120B]">{t.searchTitle}</p>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89080]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={t.searchHint}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]"
                  />
                </div>
                <Button onClick={handleSearch} loading={loading}>{t.search}</Button>
              </div>

              <p className="text-xs text-[#7A6252] bg-[#F8F3EC] border border-[#EDE8DF] rounded-2xl px-4 py-3">
                Demo: Try <strong>ORD-DEMO1</strong> or guest name <strong>Alex</strong>
              </p>

              {/* Results */}
              {results.length === 0 && query && !loading && (
                <p className="text-center text-sm text-[#A89080] py-4">{t.noResults}</p>
              )}
              {results.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide">{t.selectOrder}</p>
                  {results.map((order) => {
                    const s = statusBadge(order.status, order.flagged);
                    return (
                      <button key={order.id}
                        onClick={() => { setSelectedOrder(order); setStage("found"); }}
                        className="w-full bg-white rounded-3xl p-4 border border-[#EDE8DF] shadow-sm hover:shadow-md hover:border-[#C8A96E] transition-all text-left"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-mono text-[#A89080]">{order.id}</p>
                            <p className="font-bold text-[#1A120B] text-sm">{order.guestName}</p>
                          </div>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </div>
                        <p className="text-xs text-[#A89080]">Size {order.size} · {order.deliveryDate}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Stage: Order found ── */}
          {stage === "found" && selectedOrder && (
            <motion.div key="found"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                <button onClick={() => setStage("search")} className="text-[#A89080] hover:text-[#7A6252]">
                  <ArrowLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-[#1A120B]">{t.orderFound}</p>
              </div>

              {/* Order card */}
              <div className="bg-white rounded-3xl p-5 border-2 border-[#C8A96E] shadow-sm">
                <p className="text-xs font-mono text-[#A89080]">{selectedOrder.id}</p>
                <p className="font-black text-[#1A120B] text-lg mt-0.5">{selectedOrder.guestName}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[#7A6252]">
                  <span>Size {selectedOrder.size}</span>
                  <span>·</span>
                  <span>{selectedOrder.toAddress.facilityName ?? selectedOrder.toAddress.city}</span>
                  <span>·</span>
                  <span>{selectedOrder.deliveryDate}</span>
                </div>
                <div className="mt-3">
                  <Badge variant={statusBadge(selectedOrder.status, selectedOrder.flagged).variant}>
                    {statusBadge(selectedOrder.status, selectedOrder.flagged).label}
                  </Badge>
                </div>
              </div>

              {/* Actions based on question type */}
              {questionType === "damaged_qr" ? (
                <div className="flex flex-col gap-3">
                  {/* Reissue label — no repayment */}
                  <Button size="lg" className="w-full flex items-center gap-2" onClick={handleReissue} loading={reprinting}>
                    <Printer size={16} /> {t.reissue}
                  </Button>

                  {/* Proceed to check-in without QR */}
                  <Link href={`/hotel/scan?orderId=${selectedOrder.id}`} className="w-full">
                    <Button size="lg" variant="outline" className="w-full flex items-center gap-2">
                      <QrCode size={16} /> {t.scanInstead}
                    </Button>
                  </Link>

                  <p className="text-xs text-center text-[#A89080]">
                    {lang === "EN"
                      ? "No new payment or tag assignment needed — the order stays the same."
                      : "新しい支払いやタグの再割り当ては不要です。注文はそのまま有効です。"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={handleFlag}
                    disabled={!!selectedOrder.flagged}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    🚩 {t.flagCS}
                    {selectedOrder.flagged && <span className="text-xs ml-1 opacity-60">(already flagged)</span>}
                  </button>

                  <Link href={`/hotel/scan?orderId=${selectedOrder.id}`} className="w-full">
                    <Button size="lg" variant="outline" className="w-full flex items-center gap-2">
                      <QrCode size={16} />
                      {lang === "EN" ? "Proceed to check-in" : "受付へ進む"}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Reset */}
              <button onClick={reset}
                className="flex items-center justify-center gap-2 text-xs text-[#A89080] hover:text-[#7A6252] py-2">
                <RefreshCw size={12} /> {t.reset}
              </button>
            </motion.div>
          )}

          {/* ── Stage: Reallocated / Done ── */}
          {stage === "reallocated" && (
            <motion.div key="reallocated"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 bg-[#F8F3EC] rounded-full flex items-center justify-center"
              >
                <Printer size={36} className="text-[#C8A96E]" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-black text-[#1A120B]">{t.doneTitle}</h2>
                <p className="text-[#A89080] mt-1">{t.doneSub}</p>
              </div>

              <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl px-6 py-5 w-full text-left">
                <p className="text-sm font-bold text-[#1A120B] mb-2">
                  {lang === "EN" ? "Self-Labeling instructions" : "セルフラベリング手順"}
                </p>
                <p className="text-sm text-[#7A6252]">
                  {lang === "EN"
                    ? "Tear off the sticker and hand it to the guest. Guest applies it to their luggage themselves."
                    : "ステッカーを切り取り、ゲストに渡してください。ゲスト自身が荷物に貼り付けます。"}
                </p>
              </div>

              <Link href="/hotel/orders" className="w-full">
                <Button variant="outline" size="lg" className="w-full">{t.backList}</Button>
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
