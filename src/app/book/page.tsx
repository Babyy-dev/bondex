"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Step1Luggage }   from "@/components/traveler/steps/Step1Luggage";
import { Step2Address }   from "@/components/traveler/steps/Step2Address";
import { Step3Date }      from "@/components/traveler/steps/Step3Date";
import { Step4Contact }   from "@/components/traveler/steps/Step4Contact";
import { Step5Payment }   from "@/components/traveler/steps/Step5Payment";
import { Step6Confirmed } from "@/components/traveler/steps/Step6Confirmed";
import type { BookingState } from "@/types";

const STEPS = ["Luggage", "Address", "Date", "Contact", "Payment"];

const defaultState: BookingState = {
  step: 1,
  conditionPhotos: [],
  agreedToTerms: false,
  fromHotel: "Sakura Hotel Shinjuku",
};

function BookContent() {
  const searchParams = useSearchParams();
  const hotelParam   = searchParams.get("hotel");

  const [booking, setBooking]               = useState<BookingState>(defaultState);
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [redirectError,   setRedirectError]   = useState<string | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const router = useRouter();

  // Handle Stripe 3DS redirect return (?payment_intent=...&redirect_status=...)
  useEffect(() => {
    const paymentIntentId  = searchParams.get("payment_intent");
    const redirectStatus   = searchParams.get("redirect_status");
    const orderId          = searchParams.get("order_id");
    if (!paymentIntentId || !redirectStatus) return;

    if (redirectStatus === "succeeded" && orderId) {
      fetch("/api/stripe/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, orderId }),
      })
        .then((r) => r.ok ? setConfirmedOrder({ id: orderId }) : r.json().then((d) => setRedirectError(d.error ?? "Payment verification failed")))
        .catch(() => setRedirectError("Payment verification failed"));
    } else if (redirectStatus === "failed") {
      setRedirectError("Your payment was declined. Please try again.");
    } else if (redirectStatus === "processing") {
      setRedirectError("Your payment is processing — you'll receive a confirmation email shortly.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve hotel name from URL param
  useEffect(() => {
    if (!hotelParam) return;
    fetch(`/api/hotels/${hotelParam}`)
      .then((r) => r.ok ? r.json() : null)
      .then((hotel) => {
        if (!hotel) return;
        const fullName = hotel.branchName ? `${hotel.name} ${hotel.branchName}` : hotel.name;
        setBooking((prev) => ({ ...prev, fromHotel: fullName, fromHotelId: hotel.id }));
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelParam]);

  const update = (partial: Partial<BookingState>) => setBooking((prev) => ({ ...prev, ...partial }));

  const next = () => {
    directionRef.current = 1;
    update({ step: booking.step + 1 });
  };

  const back = () => {
    if (booking.step === 1) {
      // On step 1, ask if they want to leave
      setShowExitConfirm(true);
      return;
    }
    directionRef.current = -1;
    update({ step: booking.step - 1 });
  };

  if (confirmedOrder) return <Step6Confirmed orderId={confirmedOrder.id} booking={booking} />;

  if (redirectError) return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-[#EDE8DF] rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">❌</div>
        <h2 className="text-lg font-black text-[#1A120B]">Payment issue</h2>
        <p className="text-sm text-[#7A6252]">{redirectError}</p>
        <button onClick={() => router.push("/")}
          className="w-full py-3 bg-[#1A120B] text-white font-semibold rounded-2xl hover:bg-[#2D1A0E] transition-colors">
          Back to home
        </button>
      </div>
    </div>
  );

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#EDE8DF]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {/* Back / Home button — always visible */}
            <button
              onClick={back}
              className="w-9 h-9 rounded-2xl bg-[#F8F3EC] flex items-center justify-center hover:bg-[#EDE8DF] transition-colors flex-shrink-0"
              aria-label={booking.step === 1 ? "Back to home" : "Back"}
            >
              <ChevronLeft size={18} className="text-[#1A120B]" />
            </button>

            <span className="text-lg font-black tracking-tight text-[#1A120B] flex-1">
              BondEx
            </span>

            <span className="text-sm text-[#A89080]">
              Step {booking.step} of {STEPS.length}
            </span>
          </div>

          {booking.step <= STEPS.length && (
            <StepIndicator steps={STEPS} currentStep={booking.step} />
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            key={booking.step}
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {booking.step === 1 && <Step1Luggage booking={booking} update={update} onNext={next} />}
            {booking.step === 2 && <Step2Address booking={booking} update={update} onNext={next} />}
            {booking.step === 3 && <Step3Date    booking={booking} update={update} onNext={next} />}
            {booking.step === 4 && <Step4Contact booking={booking} update={update} onNext={next} />}
            {booking.step === 5 && (
              <Step5Payment
                booking={booking}
                onSuccess={(id) => setConfirmedOrder({ id })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowExitConfirm(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 max-w-lg mx-auto"
            >
              <div className="bg-white rounded-3xl p-6 shadow-2xl border border-[#EDE8DF]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-black text-[#1A120B]">Leave booking?</h2>
                    <p className="text-sm text-[#A89080] mt-1">Your progress will be lost.</p>
                  </div>
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="w-8 h-8 rounded-xl bg-[#F8F3EC] flex items-center justify-center hover:bg-[#EDE8DF] transition-colors"
                  >
                    <X size={15} className="text-[#7A6252]" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => router.push("/")}
                    className="w-full py-3.5 bg-[#1A120B] text-white font-semibold rounded-2xl hover:bg-[#2D1A0E] transition-colors"
                  >
                    Yes, go back to home
                  </button>
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-3.5 bg-[#F8F3EC] text-[#1A120B] font-semibold rounded-2xl hover:bg-[#EDE8DF] transition-colors"
                  >
                    Continue booking
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
      </div>
    }>
      <BookContent />
    </Suspense>
  );
}
