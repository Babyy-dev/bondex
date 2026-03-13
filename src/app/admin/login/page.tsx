"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      toast.success("Logged in as Admin");
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#7A6252] hover:text-[#1A120B] transition-colors">
          <ChevronLeft size={16} />
          Back to BondEx
        </Link>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-3xl shadow-sm border border-[#EDE8DF] p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#1A120B] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-xl font-black text-[#1A120B]">Admin Portal</h1>
            <p className="text-sm text-[#A89080] mt-1">BondEx Customer Service &amp; Operations</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input label="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder="admin" required />
            <Input label="Password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Log in
            </Button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
