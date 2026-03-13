"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function NewHotelPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", branchName: "",
    addressLine1: "", city: "", prefecture: "", postalCode: "",
    carrier: "yamato", cutoffTime: "17:00", receiptStartTime: "10:00",
    printerType: "bluetooth_thermal", labelSize: "62mm", notes: "",
    contactName: "", contactPhone: "", contactEmail: "",
    collectionMethod: "fixed_time",
    sameDayDelivery: false,
    maxDailyItems: "",
    storageLocation: "",
    operationalNotes: "",
  });
  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/hotels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Build display address string from structured fields
          address: [form.addressLine1, form.city, form.prefecture, form.postalCode].filter(Boolean).join(", "),
          maxDailyItems: form.maxDailyItems ? Number(form.maxDailyItems) : undefined,
          receiptStartTime: form.receiptStartTime || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hotel registered successfully");
      router.push("/admin/hotels");
    } catch { toast.error("Failed to register hotel"); }
    finally { setLoading(false); }
  };

  const radioRow = (v: string, label: string, current: string, key: string) => (
    <label key={v} className={cn(
      "flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all",
      current === v ? "border-[#1A120B] bg-[#FEFCF8]" : "border-[#EDE8DF] hover:border-[#C8A96E]"
    )}>
      <input type="radio" name={key} value={v} checked={current === v} onChange={() => set(key, v)} className="sr-only" />
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${current === v ? "border-[#1A120B]" : "border-[#C8A96E]"}`}>
        {current === v && <div className="w-2 h-2 bg-[#1A120B] rounded-full" />}
      </div>
      <span className="text-sm text-[#44342A]">{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-6 pt-10 pb-6">
        <div className="max-w-xl mx-auto">
          <Link href="/admin/hotels" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Hotels
          </Link>
          <h1 className="text-2xl font-black">Register New Hotel</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <S title="Basic Information">
            <Input label="Hotel name"    required value={form.name}         onChange={(e) => set("name", e.target.value)}         placeholder="e.g. Sakura Hotel" />
            <Input label="Branch name"           value={form.branchName}    onChange={(e) => set("branchName", e.target.value)}    placeholder="e.g. Shinjuku" />
            <Input label="Street address" required value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="e.g. 1-2-3 Kabukicho" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City"       required value={form.city}       onChange={(e) => set("city", e.target.value)}       placeholder="e.g. Shinjuku" />
              <Input label="Prefecture" required value={form.prefecture} onChange={(e) => set("prefecture", e.target.value)} placeholder="e.g. Tokyo" />
            </div>
            <Input label="Postal code" required value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="e.g. 160-0021" />
          </S>

          <S title="Contact Person">
            <Input label="Contact name"  value={form.contactName}  onChange={(e) => set("contactName", e.target.value)}  placeholder="e.g. Tanaka Hiroshi" />
            <Input label="Contact phone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="e.g. 03-1234-5678" />
            <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="e.g. ops@hotel.co.jp" />
          </S>

          <S title="Delivery / Carrier">
            <div>
              <p className="text-sm font-medium text-[#44342A] mb-2">Carrier</p>
              <div className="flex gap-3">
                {["yamato","sagawa"].map((c) => (
                  <button key={c} type="button" onClick={() => set("carrier", c)}
                    className={cn("flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-all capitalize",
                      form.carrier === c ? "border-[#1A120B] bg-[#1A120B] text-white" : "border-[#EDE8DF] text-[#44342A] hover:border-[#C8A96E]"
                    )}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Receipt start time" type="time" value={form.receiptStartTime}
              onChange={(e) => set("receiptStartTime", e.target.value)}
              hint="When the hotel starts accepting luggage (e.g. 10:00)" />
            <Input label="Cutoff time" type="time" value={form.cutoffTime}
              onChange={(e) => set("cutoffTime", e.target.value)}
              hint="Last time to accept luggage for same-day pickup" />
          </S>

          <S title="Operations">
            <div>
              <p className="text-sm font-medium text-[#44342A] mb-2">Collection method</p>
              <div className="flex flex-col gap-2">
                {radioRow("fixed_time", "Fixed time (scheduled pickup)", form.collectionMethod, "collectionMethod")}
                {radioRow("on_demand",  "On demand (call when ready)",    form.collectionMethod, "collectionMethod")}
                {radioRow("drop_off",   "Drop-off (hotel brings to carrier)", form.collectionMethod, "collectionMethod")}
              </div>
            </div>
            <label className={cn(
              "flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all",
              form.sameDayDelivery ? "border-[#1A120B] bg-[#FEFCF8]" : "border-[#EDE8DF] hover:border-[#C8A96E]"
            )}>
              <input type="checkbox" checked={form.sameDayDelivery} onChange={(e) => set("sameDayDelivery", e.target.checked)} className="sr-only" />
              <div className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                form.sameDayDelivery ? "bg-[#1A120B] border-[#1A120B]" : "border-[#C8A96E]"
              )}>
                {form.sameDayDelivery && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-[#44342A]">Same-day delivery supported</span>
            </label>
            <Input label="Max items per day" type="number" value={form.maxDailyItems}
              onChange={(e) => set("maxDailyItems", e.target.value)} placeholder="e.g. 20" hint="Leave blank for no limit" />
            <Input label="Storage location" value={form.storageLocation}
              onChange={(e) => set("storageLocation", e.target.value)} placeholder="e.g. Front desk, Luggage room" />
            <div>
              <p className="text-sm font-medium text-[#44342A] mb-1.5">Operational notes <span className="text-[#A89080] font-normal text-xs">(internal)</span></p>
              <textarea value={form.operationalNotes} onChange={(e) => set("operationalNotes", e.target.value)}
                placeholder="Internal notes for BondEx staff only..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E] resize-none"
              />
            </div>
          </S>

          <S title="Printer / Label">
            <div>
              <p className="text-sm font-medium text-[#44342A] mb-2">Printer type</p>
              <div className="flex flex-col gap-2">
                {radioRow("bluetooth_thermal", "Bluetooth thermal (recommended)", form.printerType, "printerType")}
                {radioRow("usb_thermal",       "USB thermal",                     form.printerType, "printerType")}
                {radioRow("none",              "None (handwritten fallback)",      form.printerType, "printerType")}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#44342A] mb-2">Label size</p>
              <div className="flex gap-3">
                {["62mm","100mm"].map((s) => (
                  <button key={s} type="button" onClick={() => set("labelSize", s)}
                    className={cn("flex-1 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all",
                      form.labelSize === s ? "border-[#1A120B] bg-[#1A120B] text-white" : "border-[#EDE8DF] text-[#44342A] hover:border-[#C8A96E]"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </S>

          <Button type="submit" loading={loading} size="lg" className="w-full">Register hotel</Button>
        </form>
      </div>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#EDE8DF]">
      <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-4">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
