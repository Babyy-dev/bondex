"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, Mail, Phone, Info, ChevronRight, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BookingData } from "../traveler-flow"

interface ContactInfoScreenProps {
  data: BookingData
  onUpdate: (data: BookingData) => void
  onNext: () => void
  onBack: () => void
}

type Phase = "input" | "method" | "verify"
type VerifyMethod = "email" | "sms"

export function ContactInfoScreen({ data, onUpdate, onNext, onBack }: ContactInfoScreenProps) {
  const [email, setEmail] = useState(data.contact.email)
  const [confirmEmail, setConfirmEmail] = useState(data.contact.email)
  const [phone, setPhone] = useState(data.contact.phone)
  const [errors, setErrors] = useState<{ email?: string; confirmEmail?: string; phone?: string }>({})

  // Verification state
  const [phase, setPhase] = useState<Phase>("input")
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>("email")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [codeError, setCodeError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const validatePhone = (v: string) => v.length >= 8

  // Phase 1 -> Phase 2: validate inputs then show method selection
  const handleContinue = () => {
    const newErrors: typeof errors = {}
    if (!validateEmail(email)) newErrors.email = "Please enter a valid email address"
    if (email !== confirmEmail) newErrors.confirmEmail = "Email addresses do not match"
    if (!validatePhone(phone)) newErrors.phone = "Please enter a valid phone number"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setPhase("method")
  }

  // Phase 2 -> Phase 3: select method and send code
  const handleSendCode = (method: VerifyMethod) => {
    setVerifyMethod(method)
    setCode(["", "", "", "", "", ""])
    setCodeError("")
    setResendCooldown(60)
    setPhase("verify")
    // Focus first input after render
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  // Phase 3: resend code
  const handleResend = () => {
    if (resendCooldown > 0) return
    setCode(["", "", "", "", "", ""])
    setCodeError("")
    setResendCooldown(60)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  // Phase 3: change method - go back to method selection
  const handleChangeMethod = () => {
    setCode(["", "", "", "", "", ""])
    setCodeError("")
    setPhase("method")
  }

  // Code input handlers
  const handleCodeChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const digit = value.slice(-1)
    setCode((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    setCodeError("")
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [code])

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = text[i] || ""
    }
    setCode(newCode)
    const focusIdx = Math.min(text.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }, [code])

  // Phase 3: verify code
  const handleVerify = () => {
    const fullCode = code.join("")
    if (fullCode.length !== 6) {
      setCodeError("Please enter the full 6-digit code")
      return
    }
    // Simulate verification (accept any 6-digit code for prototype)
    onUpdate({
      ...data,
      contact: { email, phone },
    })
    onNext()
  }

  const canContinue = email && confirmEmail && phone
  const isCodeComplete = code.every((d) => d !== "")
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : ""
  const maskedPhone = phone ? phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4) : ""

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => {
            if (phase === "verify") { handleChangeMethod(); return }
            if (phase === "method") { setPhase("input"); return }
            onBack()
          }}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">
            {phase === "input" && "Contact info"}
            {phase === "method" && "Verify your identity"}
            {phase === "verify" && "Enter verification code"}
          </h1>
          <p className="text-sm text-muted-foreground">Step 4 of 6</p>
        </div>
      </header>

      {/* ===== Phase 1: Contact Info Input ===== */}
      {phase === "input" && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {"We'll use this information to send booking confirmation and important updates about your delivery."}
                </p>
              </div>
            </div>

            {/* Email */}
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

            {/* Confirm Email */}
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

            {/* Phone */}
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
          </div>

          <div className="p-4 border-t border-border bg-card">
            <Button onClick={handleContinue} disabled={!canContinue} className="w-full h-12">
              Continue
            </Button>
          </div>
        </>
      )}

      {/* ===== Phase 2: Choose Verification Method ===== */}
      {phase === "method" && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose how to receive your 6-digit verification code.
            </p>

            {/* Email option */}
            <button
              onClick={() => handleSendCode("email")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-xs text-muted-foreground truncate">{maskedEmail}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* SMS option */}
            <button
              onClick={() => handleSendCode("sms")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">SMS</p>
                <p className="text-xs text-muted-foreground truncate">{maskedPhone}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </>
      )}

      {/* ===== Phase 3: Enter Verification Code ===== */}
      {phase === "verify" && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                {"Code sent via "}
                <span className="font-medium text-foreground">{verifyMethod === "email" ? "email" : "SMS"}</span>
                {" to "}
                <span className="font-medium text-foreground">{verifyMethod === "email" ? maskedEmail : maskedPhone}</span>
              </p>
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

            {/* Resend & Change method */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>
              <button
                onClick={handleChangeMethod}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {verifyMethod === "email" ? "Use SMS instead" : "Use email instead"}
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-card">
            <Button onClick={handleVerify} disabled={!isCodeComplete} className="w-full h-12">
              Verify & continue
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
