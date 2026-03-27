"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, Mail, Phone, Info, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BookingData } from "../traveler-flow"

interface ContactInfoScreenProps {
  data: BookingData
  onUpdate: (data: BookingData) => void
  onNext: (contact: { email: string; phone: string }) => void
  onBack: () => void
}

type Phase = "input" | "verify"

export function ContactInfoScreen({ data, onUpdate, onNext, onBack }: ContactInfoScreenProps) {
  const [email, setEmail] = useState(data.contact.email)
  const [confirmEmail, setConfirmEmail] = useState(data.contact.email)
  const [phone, setPhone] = useState(data.contact.phone)
  const [errors, setErrors] = useState<{ email?: string; confirmEmail?: string; phone?: string }>({})
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Verify phase
  const [phase, setPhase] = useState<Phase>("input")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [codeError, setCodeError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const validatePhone = (v: string) => v.replace(/[\s\-+()]/g, "").length >= 8

  // Phase 1 → send OTP
  const handleContinue = async () => {
    const newErrors: typeof errors = {}
    if (!validateEmail(email)) newErrors.email = "Please enter a valid email address"
    if (email !== confirmEmail) newErrors.confirmEmail = "Email addresses do not match"
    if (!validatePhone(phone)) newErrors.phone = "Please enter a valid phone number"
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setIsSending(true)
    setSendError(null)
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setSendError(json.error || "Failed to send code. Please try again."); return }
      setCode(["", "", "", "", "", ""])
      setCodeError("")
      setResendCooldown(60)
      setPhase("verify")
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setSendError("Network error. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setIsSending(true)
    setSendError(null)
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setSendError(json.error || "Failed to resend code."); return }
      setCode(["", "", "", "", "", ""])
      setCodeError("")
      setResendCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setSendError("Network error. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  // Code input handlers
  const handleCodeChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const digit = value.slice(-1)
    setCode((prev) => { const next = [...prev]; next[index] = digit; return next })
    setCodeError("")
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }, [])

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }, [code])

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const newCode = Array.from({ length: 6 }, (_, i) => text[i] || "")
    setCode(newCode)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
  }, [])

  // Verify OTP
  const handleVerify = async () => {
    const fullCode = code.join("")
    if (fullCode.length !== 6) { setCodeError("Please enter the full 6-digit code"); return }
    setIsVerifying(true)
    setCodeError("")
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: fullCode }),
      })
      const json = await res.json()
      if (!res.ok) { setCodeError(json.error || "Incorrect code. Please try again."); return }
      const contact = { email: email.trim(), phone: phone.trim() }
      onUpdate({ ...data, contact })
      onNext(contact)
    } catch {
      setCodeError("Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const canContinue = email && confirmEmail && phone
  const isCodeComplete = code.every((d) => d !== "")
  const maskedEmail = email ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "*") + c) : ""

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => { if (phase === "verify") { setPhase("input"); setCode(["","","","","",""]); setCodeError("") } else { onBack() } }}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">
            {phase === "input" ? "Contact info" : "Verify your email"}
          </h1>
          <p className="text-sm text-muted-foreground">Step 4 of 6</p>
        </div>
      </header>

      {/* ── Phase 1: Contact input ── */}
      {phase === "input" && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {"We'll send a verification code to your email, then use it for booking updates."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email address
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm email</label>
              <Input
                type="email"
                placeholder="Confirm your email"
                value={confirmEmail}
                onChange={(e) => { setConfirmEmail(e.target.value); setErrors({ ...errors, confirmEmail: undefined }) }}
                className={errors.confirmEmail ? "border-destructive" : ""}
              />
              {errors.confirmEmail && <p className="text-xs text-destructive">{errors.confirmEmail}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone number
              </label>
              <Input
                type="tel"
                placeholder="+81 90-1234-5678"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors({ ...errors, phone: undefined }) }}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              <p className="text-xs text-muted-foreground">Include country code for international numbers</p>
            </div>

            {sendError && <p className="text-xs text-destructive">{sendError}</p>}
          </div>

          <div className="p-4 border-t border-border bg-card">
            <Button onClick={handleContinue} disabled={!canContinue || isSending} className="w-full h-12">
              {isSending ? "Sending code..." : "Send verification code"}
            </Button>
          </div>
        </>
      )}

      {/* ── Phase 2: Enter OTP ── */}
      {phase === "verify" && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                A 6-digit code was sent to{" "}
                <span className="font-medium text-foreground">{maskedEmail}</span>
              </p>
              <p className="text-xs text-muted-foreground">Check your inbox (and spam folder)</p>
            </div>

            {/* 6-digit code input */}
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    codeError ? "border-destructive" : digit ? "border-foreground" : "border-border"
                  }`}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
            {codeError && <p className="text-xs text-destructive text-center">{codeError}</p>}

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSending}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>
              {sendError && <p className="text-xs text-destructive">{sendError}</p>}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-card">
            <Button onClick={handleVerify} disabled={!isCodeComplete || isVerifying} className="w-full h-12">
              {isVerifying ? "Verifying..." : "Verify & continue"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
