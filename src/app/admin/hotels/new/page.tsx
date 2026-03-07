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
    name: "", branchName: "", address: "",
    carrier: "yamato", cutoffTime: "17:00",
    printerType: "bluetooth_thermal", labelSize: "62mm", notes: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/hotels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
            <Input label="Hotel name"   required value={form.name}       onChange={(e) => set("name", e.target.value)}       placeholder="e.g. Sakura Hotel" />
            <Input label="Branch name"          value={form.branchName}  onChange={(e) => set("branchName", e.target.value)}  placeholder="e.g. Shinjuku" />
            <Input label="Address"      required value={form.address}    onChange={(e) => set("address", e.target.value)}     placeholder="Full address" />
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
            <Input label="Cutoff time" type="time" value={form.cutoffTime}
              onChange={(e) => set("cutoffTime", e.target.value)}
              hint="Last time to accept luggage for same-day pickup" />
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
