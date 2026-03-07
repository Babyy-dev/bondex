"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function HotelLogin() {
  const [facilityId, setFacilityId] = useState("HTL-001");
  const [password,   setPassword]   = useState("demo123");
  const [loading,    setLoading]    = useState(false);
  const [lang,       setLang]       = useState<"EN" | "JA">("EN");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, password, role: "hotel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      toast.success(lang === "EN" ? "Logged in successfully" : "ログインしました");
      router.push("/hotel/orders");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const t = {
    title:    lang === "EN" ? "Hotel Staff Portal"                          : "ホテルスタッフポータル",
    subtitle: lang === "EN" ? "Scan QR codes and manage luggage check-ins" : "QRコードをスキャンして荷物を受け付けます",
    id:       lang === "EN" ? "Facility ID"                                 : "施設ID",
    pass:     lang === "EN" ? "Password"                                    : "パスワード",
    login:    lang === "EN" ? "Log in"                                      : "ログイン",
  };

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-white rounded-xl border border-[#EDE8DF] overflow-hidden">
            {(["EN", "JA"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  lang === l ? "bg-[#1A120B] text-white" : "text-[#7A6252] hover:bg-[#F8F3EC]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-[#EDE8DF] p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#1A120B] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏨</span>
            </div>
            <h1 className="text-xl font-black text-[#1A120B]">{t.title}</h1>
            <p className="text-sm text-[#A89080] mt-1">{t.subtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input label={t.id} value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)} placeholder="HTL-001" required />
            <Input label={t.pass} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              {t.login}
            </Button>
          </form>

          <p className="text-center text-xs text-[#A89080] mt-4">
            Demo: Facility ID = HTL-001 · Password = demo123
          </p>
        </div>
      </motion.div>
    </div>
  );
}
