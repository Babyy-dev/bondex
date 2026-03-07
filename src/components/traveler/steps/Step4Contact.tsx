"use client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { BookingState } from "@/types";

interface Props {
  booking: BookingState;
  update: (p: Partial<BookingState>) => void;
  onNext: () => void;
}

export function Step4Contact({ booking, update, onNext }: Props) {
  const emailsMatch = !!booking.guestEmail && booking.guestEmail === booking.guestEmailConfirm;
  const phoneValid  = !!booking.guestPhone && booking.guestPhone.length >= 7;
  const canContinue = emailsMatch && phoneValid;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Contact details</h1>
        <p className="text-sm text-[#A89080]">We'll send your confirmation and tracking updates here.</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input label="Email address" type="email" required autoComplete="email"
          placeholder="you@example.com"
          value={booking.guestEmail ?? ""}
          onChange={(e) => update({ guestEmail: e.target.value })} />

        <Input label="Confirm email" type="email" required
          placeholder="Confirm your email"
          value={booking.guestEmailConfirm ?? ""}
          onChange={(e) => update({ guestEmailConfirm: e.target.value })}
          error={
            booking.guestEmailConfirm && booking.guestEmail !== booking.guestEmailConfirm
              ? "Emails do not match" : undefined
          } />

        <Input label="Phone number" type="tel" required autoComplete="tel"
          placeholder="+81 90-0000-0000"
          value={booking.guestPhone ?? ""}
          onChange={(e) => update({ guestPhone: e.target.value })}
          hint="For delivery notifications only — no marketing" />
      </div>

      <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-2xl px-4 py-3">
        <p className="text-sm text-[#7A6252]">
          📧 Tracking updates and receipts will be sent to your email.
          Yamato Transport automatic notifications are disabled to prevent spam.
        </p>
      </div>

      <Button onClick={onNext} disabled={!canContinue} size="lg" className="w-full">
        Continue to payment
      </Button>
    </div>
  );
}
