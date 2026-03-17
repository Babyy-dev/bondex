"use client"

import { useState } from "react"
import { ArrowLeft, CreditCard, Lock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BookingData } from "../traveler-flow"

interface PaymentScreenProps {
  data: BookingData
  onUpdate: (data: BookingData) => void
  onNext: () => void
  onBack: () => void
}

export function PaymentScreen({ data, onUpdate, onNext, onBack }: PaymentScreenProps) {
  const [paymentMethod, setPaymentMethod] = useState<"apple" | "google" | "card" | null>(null)
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [name, setName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const calculatePrice = () => {
    let total = 0
    for (const item of data.items) {
      if (item.size === "S") total += 2500
      if (item.size === "M") total += 3500
      if (item.size === "L") total += 4500
      if (item.size === "LL") total += 6000
    }
    return total
  }

  const totalPrice = calculatePrice()
  // Surcharge estimate (worst-case one size up per item)
  const maxSurcharge = data.items.length * 1500
  const estimatedMax = totalPrice + maxSurcharge

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  const handleWalletPay = (method: "apple" | "google") => {
    setPaymentMethod(method)
    setIsProcessing(true)
    setTimeout(() => {
      onUpdate({
        ...data,
        orderId: `BX-${Date.now().toString(36).toUpperCase()}`,
      })
      onNext()
    }, 1500)
  }

  const handleCardPay = () => {
    setPaymentMethod("card")
    setIsProcessing(true)
    setTimeout(() => {
      onUpdate({
        ...data,
        orderId: `BX-${Date.now().toString(36).toUpperCase()}`,
      })
      onNext()
    }, 1500)
  }

  const canSubmitCard = cardNumber.length >= 19 && expiry.length >= 5 && cvc.length >= 3 && name

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          disabled={isProcessing}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Payment</h1>
          <p className="text-sm text-muted-foreground">Step 5 of 6</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-5">

        {/* Pricing breakdown */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="space-y-2">
            {data.items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>Item {index + 1} ({item.size})</span>
                </div>
                <span className="text-muted-foreground">
                  {item.size === "S" ? "\u00a52,500" : item.size === "M" ? "\u00a53,500" : item.size === "L" ? "\u00a54,500" : "\u00a56,000"}
                </span>
              </div>
            ))}

            <div className="pt-3 mt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pay now</span>
                <span className="font-bold text-lg">{"\u00a5"}{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Estimated total (max)</span>
                <span>{"\u00a5"}{estimatedMax.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Auto-charge explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-3">
            <p className="text-sm font-semibold text-foreground leading-snug mb-1">
              Up to {"\u00a5"}{estimatedMax.toLocaleString()} may be charged automatically
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the carrier measures a different size, the difference (up to the estimated max) will be charged to this payment method automatically. No action needed from you. You{"'"}ll receive an email notification with the updated amount.
            </p>
          </div>
        </div>

        {/* Wallet payments - primary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Secure payment</span>
          </div>

          {/* Apple Pay */}
          <button
            onClick={() => handleWalletPay("apple")}
            disabled={isProcessing}
            className="w-full h-12 rounded-lg bg-foreground text-background font-medium text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isProcessing && paymentMethod === "apple" ? (
              "Processing..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Pay
              </>
            )}
          </button>

          {/* Google Pay */}
          <button
            onClick={() => handleWalletPay("google")}
            disabled={isProcessing}
            className="w-full h-12 rounded-lg bg-card border border-border font-medium text-base flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isProcessing && paymentMethod === "google" ? (
              "Processing..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Pay
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Credit card - always visible */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CreditCard className="w-4 h-4" />
            <span>Credit card</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Card number</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                className="pl-10"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Expiry</label>
              <Input
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                maxLength={5}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CVC</label>
              <Input
                placeholder="123"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={4}
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cardholder name</label>
            <Input
              placeholder="Name on card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <Button
            onClick={handleCardPay}
            disabled={!canSubmitCard || isProcessing}
            className="w-full h-12"
          >
            {isProcessing && paymentMethod === "card" ? "Processing..." : `Pay \u00a5${totalPrice.toLocaleString()}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
