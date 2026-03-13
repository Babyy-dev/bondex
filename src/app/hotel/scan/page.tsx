"use client";
import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Flag, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/types";
import toast from "react-hot-toast";

function ScanContent() {
  const searchParams = useSearchParams();
  const prefillId    = searchParams.get("orderId") ?? "";

  const [inputId,  setInputId]  = useState(prefillId);
  const [order,    setOrder]    = useState<Order | null>(null);
  const [stage,    setStage]    = useState<"input" | "found" | "done">("input");
  const [loading,  setLoading]  = useState(false);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);

  // Camera state
  const [cameraOn,      setCameraOn]      = useState(false);
  const [photoStage,    setPhotoStage]    = useState<"idle" | "previewing" | "processing">("idle");
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const qrRafRef    = useRef<number>(0);

  // ── Camera helpers ───────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(qrRafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Attach stream to video element once it is rendered
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  // Clean up on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOn(true); // renders video element → useEffect attaches stream
    } catch {
      toast.error("Camera permission denied. Please allow camera access.");
    }
  }, []);

  // ── QR scanning loop (only in "input" stage) ─────────────────────────────

  useEffect(() => {
    if (!cameraOn || stage !== "input") return;
    let cancelled = false;

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (!cancelled) qrRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { if (!cancelled) qrRafRef.current = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR   = (await import("jsqr")).default;
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          stopCamera();
          let orderId = result.data;
          try { const p = JSON.parse(result.data); if (p.orderId) orderId = p.orderId; } catch { /* raw id */ }
          setInputId(orderId);
          lookupOrder(orderId);
          return;
        }
      } catch { /* jsQR not ready */ }
      if (!cancelled) qrRafRef.current = requestAnimationFrame(tick);
    };

    qrRafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(qrRafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, stage]);

  // ── Order lookup ─────────────────────────────────────────────────────────

  const lookupOrder = async (id = inputId) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id.trim()}`);
      if (!res.ok) throw new Error("Not found");
      const data: Order = await res.json();
      setOrder(data);
      setPhotoStage("idle");
      setStage("found");
    } catch {
      toast.error("Order not found. Check the order ID.");
    } finally {
      setLoading(false);
    }
  };

  const MAX_PHOTOS = 3;

  // ── Photo capture (canvas-based — works in all browsers) ─────────────────

  const startPhotoCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setPhotoStage("previewing");
    } catch {
      toast.error("Camera permission denied. Please allow camera access.");
    }
  };

  // Capture a photo frame and add to capturedPhotos; auto-confirm on first capture (Decision OS)
  const capturePhoto = async () => {
    if (!order) return;

    // Capture frame from video as base64 JPEG
    let photoData = "";
    const video   = videoRef.current;
    if (video && video.readyState >= 2) {
      const canvas  = document.createElement("canvas");
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx     = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        photoData = canvas.toDataURL("image/jpeg", 0.8);
      }
    }

    const newPhotos = [...capturedPhotos, photoData];
    setCapturedPhotos(newPhotos);

    // If this is the first photo, auto-confirm check-in (Decision OS: photo = confirmation)
    if (newPhotos.length === 1) {
      stopCamera();
      setPhotoStage("processing");
      try {
        const res = await fetch("/api/shipco/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, photoUrls: newPhotos }),
        });
        if (!res.ok) throw new Error("Check-in failed");
        const data = await res.json();
        setLabelUrl(data.labelUrl);
        setStage("done");
      } catch {
        toast.error("Check-in failed. Please try again.");
        setCapturedPhotos([]);
        setPhotoStage("previewing");
      }
    } else {
      // Additional photos (2nd, 3rd) — update order photos silently, stop camera if max reached
      if (newPhotos.length >= MAX_PHOTOS) stopCamera();
      fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrls: newPhotos }),
      }).catch(() => {/* non-fatal */});
    }
  };


  // ── Flag order ────────────────────────────────────────────────────────────

  const flagOrder = async () => {
    if (!order) return;
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: true }),
      });
      toast.success("Order flagged — CS will follow up");
      setStage("input");
      setOrder(null);
    } catch {
      toast.error("Failed to flag order");
    }
  };

  const resetToInput = () => {
    stopCamera();
    setStage("input");
    setOrder(null);
    setPhotoStage("idle");
    setInputId("");
    setCapturedPhotos([]);
  };

  const inputCls = "w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]";

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      {/* Header */}
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href="/hotel/orders" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Back to list
          </Link>
          <h1 className="text-xl font-black">QR Scan & Check-in</h1>
          <p className="text-white/50 text-sm">Scan guest QR code, then take luggage photo</p>
        </div>
      </div>

      {/* Video element — always in DOM so ref is always available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ── Stage: Input ── */}
          {stage === "input" && (
            <motion.div key="input"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              {/* Camera viewfinder */}
              <div className="bg-[#1A120B] rounded-3xl overflow-hidden aspect-square relative flex items-center justify-center">
                {cameraOn ? (
                  <>
                    {/* Show video feed in viewfinder when camera is on */}
                    <video
                      autoPlay playsInline muted
                      ref={(el) => {
                        // Secondary ref for inline display in viewfinder
                        if (el && streamRef.current) el.srcObject = streamRef.current;
                      }}
                      className="w-full h-full object-cover"
                    />
                    {/* Corner overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-52 h-52 relative">
                        <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#C8A96E] rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#C8A96E] rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#C8A96E] rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#C8A96E] rounded-br-lg" />
                        <motion.div
                          animate={{ y: [-80, 80, -80] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-0.5 bg-[#C8A96E] opacity-90"
                          style={{ top: "50%" }}
                        />
                      </div>
                    </div>
                    <button onClick={stopCamera}
                      className="absolute top-4 right-4 bg-black/50 text-white rounded-xl px-3 py-1.5 text-xs">
                      Stop
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 border-4 border-white/20 rounded-3xl flex items-center justify-center">
                      <Camera size={32} className="text-white/40" />
                    </div>
                    <button onClick={startCamera}
                      className="bg-[#C8A96E] text-[#1A120B] font-bold px-6 py-3 rounded-2xl text-sm hover:bg-[#B89558] transition-colors">
                      Start camera scan
                    </button>
                    <p className="text-white/30 text-xs">Point at guest QR code</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#EDE8DF]" />
                <span className="text-xs text-[#A89080] font-medium">or enter ID manually</span>
                <div className="flex-1 h-px bg-[#EDE8DF]" />
              </div>

              <div className="flex gap-3">
                <input
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  placeholder="e.g. ORD-XXXXXXXX"
                  className={inputCls}
                  onKeyDown={(e) => e.key === "Enter" && lookupOrder()}
                />
                <Button onClick={() => lookupOrder()} loading={loading}>Lookup</Button>
              </div>

            </motion.div>
          )}

          {/* ── Stage: Found ── */}
          {stage === "found" && order && (
            <motion.div key="found"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              {/* Order details */}
              <div className="bg-white border-2 border-[#C8A96E] rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-[#C8A96E]" />
                  <p className="font-bold text-[#1A120B]">Order found</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Guest"       value={order.guestName} />
                  <Detail label="Size"        value={`Size ${order.size}`} />
                  <Detail label="Destination" value={order.toAddress?.facilityName ?? order.toAddress?.city ?? "—"} />
                  <Detail label="Delivery"    value={order.deliveryDate} />
                </div>
              </div>

              {/* Guest reference photos */}
              <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl p-4">
                <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-2">Guest reference photos</p>
                {order.photoUrls && order.photoUrls.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {order.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Guest photo ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-[#EDE8DF]" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#A89080] italic">No photos provided</p>
                )}
              </div>

              {/* Photo capture area */}
              <div className="bg-white border-2 border-dashed border-[#EDE8DF] rounded-3xl overflow-hidden">
                {photoStage === "idle" && (
                  <div className="p-8 flex flex-col items-center gap-3 text-center">
                    <Camera size={32} className="text-[#C8A96E]" />
                    <p className="text-sm font-semibold text-[#1A120B]">Take luggage photo</p>
                    <p className="text-xs text-[#A89080]">
                      1st photo auto-confirms check-in. Up to {MAX_PHOTOS} photos allowed.
                    </p>
                    <Button onClick={startPhotoCamera} className="mt-2">
                      <Camera size={16} className="mr-2" /> Open camera
                    </Button>
                  </div>
                )}

                {photoStage === "previewing" && (
                  <div className="relative">
                    {/* Live preview for luggage photo */}
                    <video
                      autoPlay playsInline muted
                      ref={(el) => {
                        if (el && streamRef.current) el.srcObject = streamRef.current;
                      }}
                      className="w-full aspect-video object-cover"
                    />
                    {/* Captured photo thumbnails */}
                    {capturedPhotos.length > 0 && (
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {capturedPhotos.map((src, i) => (
                          <img key={i} src={src} alt={`Photo ${i + 1}`}
                            className="w-12 h-12 object-cover rounded-lg border-2 border-white shadow" />
                        ))}
                        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-white/60 flex items-center justify-center text-white/60 text-xs">
                          {capturedPhotos.length}/{MAX_PHOTOS}
                        </div>
                      </div>
                    )}
                    <div className="p-4 flex flex-col gap-3">
                      <p className="text-xs text-center text-[#7A6252]">
                        {capturedPhotos.length === 0
                          ? "Point at the luggage and tap capture — check-in completes instantly"
                          : `Photo ${capturedPhotos.length + 1} of ${MAX_PHOTOS} (optional)`}
                      </p>
                      <Button onClick={capturePhoto} size="lg" className="w-full">
                        <Camera size={16} className="mr-2" />
                        {capturedPhotos.length === 0 ? "Capture photo" : `Add photo ${capturedPhotos.length + 1}`}
                      </Button>
                    </div>
                  </div>
                )}

                {photoStage === "processing" && (
                  <div className="p-10 flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-[#C8A96E] animate-spin" />
                    <p className="text-sm font-semibold text-[#1A120B]">Recording luggage…</p>
                    <p className="text-xs text-[#A89080]">Generating shipping label</p>
                  </div>
                )}
              </div>

              <button onClick={resetToInput}
                className="flex items-center justify-center gap-2 text-sm text-[#A89080] hover:text-[#7A6252]">
                <RefreshCw size={13} /> Scan different order
              </button>

              <button onClick={flagOrder}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
                <Flag size={12} /> Flag an issue (no reason required)
              </button>
            </motion.div>
          )}

          {/* ── Stage: Done ── */}
          {stage === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-5 items-center text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 bg-[#F8F3EC] rounded-full flex items-center justify-center"
              >
                <CheckCircle2 size={40} className="text-[#C8A96E]" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-black text-[#1A120B]">Luggage recorded</h2>
                <p className="text-[#A89080] mt-1">Label has been sent to printer</p>
              </div>

              <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl px-6 py-5 w-full text-left">
                <p className="text-sm font-bold text-[#1A120B] mb-2">Self-Labeling instructions</p>
                <p className="text-sm text-[#7A6252]">
                  Tear off the sticker and hand it to the guest. Guest applies it to their luggage themselves.
                </p>
              </div>

              {labelUrl && (
                <a href={labelUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[#C8A96E] underline">
                  View / reprint label →
                </a>
              )}

              <Link href="/hotel/orders" className="w-full">
                <Button variant="outline" size="lg" className="w-full">Back to order list</Button>
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default function HotelScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#A89080]">{label}</p>
      <p className="text-sm font-semibold text-[#1A120B] mt-0.5">{value}</p>
    </div>
  );
}
