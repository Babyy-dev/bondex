"use client"

import { CheckCircle, Printer, Tag, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Order } from "../hotel-staff-flow"
import { useI18n } from "../i18n"

interface AcceptSuccessScreenProps {
  order: Order
  onDone: () => void
}

export function AcceptSuccessScreen({ order, onDone }: AcceptSuccessScreenProps) {
  const { t } = useI18n()

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Success header */}
      <div className="p-8 bg-foreground text-background text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-1">{t("success.title")}</h1>
        <p className="text-background/70">{order.guestName}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* System-completed actions */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="font-medium text-foreground mb-3">{t("success.auto")}</h3>
          <div className="space-y-3">
            {[
              { icon: CheckCircle, text: t("success.statusUpdated") },
              { icon: CheckCircle, text: t("success.labelGenerated") },
              { icon: Printer, text: t("success.labelSent") },
              { icon: Truck, text: t("success.trackingAssigned") },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Label preview */}
        <div className="p-4 rounded-lg bg-muted border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{t("success.shippingLabel")}</span>
          </div>
          <div className="aspect-[3/2] rounded-lg bg-card border-2 border-dashed border-border flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 bg-foreground/5 rounded-lg flex items-center justify-center">
                <div className="w-14 h-14 grid grid-cols-4 grid-rows-4 gap-0.5">
                  {[...Array(16)].map((_, i) => (
                    <div key={`qr-${i}`} className={`${Math.random() > 0.3 ? "bg-foreground/30" : ""}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm font-mono text-muted-foreground">{order.id}</p>
              <p className="text-xs text-muted-foreground mt-1">{order.itemCount} {order.itemCount > 1 ? t("orders.items") : t("orders.item")} ({order.size})</p>
            </div>
          </div>
        </div>

        {/* Next step - declarative, system-authoritative */}
        <div className="p-4 rounded-lg bg-foreground/5 border border-foreground/20">
          <h3 className="font-semibold text-foreground mb-2">{t("success.nextStepTitle")}</h3>
          <ol className="space-y-2 text-sm">
            {[t("success.step1"), t("success.step2"), t("success.step3")].map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 border-t border-border bg-card">
        <Button onClick={onDone} className="w-full h-12">{t("success.done")}</Button>
      </div>
    </div>
  )
}
