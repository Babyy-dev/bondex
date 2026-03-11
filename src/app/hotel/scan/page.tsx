"use client";
import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Flag, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/types";
import toast from "react-hot-toast";

function ScanContent() {
  const searchParams   = useSearchParams();
  const prefillId      = searchParams.get("orderId") ?? "";

  const [inputId,   setInputId]   = useState(prefillId);
  const [order,     setOrder]     = useState<Order | null>(null);
  const [stage,     setStage]     = useState<"input"|"found"|"captured"|"done">("input");
  const [loading,   setLoading]   = useState(false);
  const [labelUrl,  setLabelUrl]  = useState<string | null>(null);
  const [cameraOn,  setCameraOn]  = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      toast.error("Camera permission denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // QR scan via jsQR on animation frame
  useEffect(() => {
    if (!cameraOn || stage !== "input") return;
    let raf: number;
    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) { raf = requestAnimationFrame(tick); return; }
      const canvas = document.createElement("canvas");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import("jsqr")).default;
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          stopCamera();
          // Parse BondEx QR payload
          let orderId = result.data;
          try {
            const parsed = JSON.parse(result.data);
            if (parsed.orderId) orderId = parsed.orderId;
          } catch { /* raw orderId string */ }
          setInputId(orderId);
          lookup(orderId);
          return;
        }
      } catch { /* jsQR not ready yet */ }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraOn, stage, stopCamera]);

  const lookup = async (id = inputId) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id.trim()}`);
      if (!res.ok) throw new Error("Not found");
      const data: Order = await res.json();
      setOrder(data);
      setStage("found");
    } catch {
      toast.error("Order not found. Check the order ID.");
    } finally {
      setLoading(false);
    }
  };

  // Capture photo via camera
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track  = stream.getVideoTracks()[0];
      const capture = new (window as unknown as { ImageCapture: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture(track);
      const blob   = await capture.takePhoto();
      const url    = URL.createObjectURL(blob);
      setPhotoData(url);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // Fallback if ImageCapture not supported
      setPhotoData("demo-photo");
    }
    setStage("captured");
  };

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

  const confirmCheckin = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shipco/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, photoUrls: [photoData ?? "/demo.jpg"] }),
      });
      if (!res.ok) throw new Error("Check-in failed");
      const data = await res.json();
      setLabelUrl(data.labelUrl);
      setStage("done");
    } catch {
      toast.error("Check-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]";

  return (
    <div className="min-h-screen bg-[#FEFCF8]">
      <div className="bg-[#1A120B] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href="/hotel/orders" className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} /> Back to list
          </Link>
          <h1 className="text-xl font-black">QR Scan & Check-in</h1>
          <p className="text-white/50 text-sm">Scan order QR, then take luggage photo</p>
        </div>
      </div>

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
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {/* Scan overlay */}
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
                    <p className="text-white/30 text-xs">Requires camera permission</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#EDE8DF]" />
                <span className="text-xs text-[#A89080] font-medium">or enter ID manually</span>
                <div className="flex-1 h-px bg-[#EDE8DF]" />
              </div>

              <div className="flex gap-3">
                <input value={inputId} onChange={(e) => setInputId(e.target.value)}
                  placeholder="e.g. ORD-001" className={inputCls}
                  onKeyDown={(e) => e.key === "Enter" && lookup()} />
                <Button onClick={() => lookup()} loading={loading}>Lookup</Button>
              </div>

              <p className="text-xs text-[#7A6252] bg-[#F8F3EC] border border-[#EDE8DF] rounded-2xl px-4 py-3">
                Demo: Try order IDs <strong>ORD-DEMO1</strong> or <strong>ORD-DEMO2</strong>
              </p>
            </motion.div>
          )}

          {/* ── Stage: Found ── */}
          {stage === "found" && order && (
            <motion.div key="found"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="bg-white border-2 border-[#C8A96E] rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-[#C8A96E]" />
                  <p className="font-bold text-[#1A120B]">Order found</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Guest"       value={order.guestName} />
                  <Detail label="Size"        value={`Size ${order.size}`} />
                  <Detail label="Destination" value={order.toAddress.facilityName ?? order.toAddress.city} />
                  <Detail label="Delivery"    value={order.deliveryDate} />
                </div>
              </div>

              {/* Guest photo reference */}
              <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl p-5 text-center">
                <p className="text-xs text-[#A89080] mb-1">Guest reference photos</p>
                <p className="text-sm text-[#A89080] italic">No photos provided</p>
              </div>

              {/* Photo capture area */}
              <div className="bg-white border-2 border-dashed border-[#EDE8DF] rounded-3xl p-8 text-center flex flex-col items-center gap-3">
                <Camera size={32} className="text-[#C8A96E]" />
                <p className="text-sm font-semibold text-[#1A120B]">Take luggage photo</p>
                <p className="text-xs text-[#A89080]">
                  This officially records the luggage. Check-in completes automatically once photo is taken.
                </p>
                <Button onClick={capturePhoto} className="mt-2">
                  <Camera size={16} className="mr-2" /> Capture photo
                </Button>
              </div>

              <button onClick={() => { setStage("input"); setOrder(null); }}
                className="flex items-center justify-center gap-2 text-sm text-[#A89080] hover:text-[#7A6252]">
                <RefreshCw size={13} /> Scan different order
              </button>

              <button onClick={flagOrder} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
                <Flag size={12} /> Flag an issue (no reason required)
              </button>
            </motion.div>
          )}

          {/* ── Stage: Captured ── */}
          {stage === "captured" && order && (
            <motion.div key="captured"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl p-5 text-center">
                <p className="text-lg mb-1">📸</p>
                <p className="font-bold text-[#1A120B]">Photo captured</p>
                <p className="text-sm text-[#7A6252] mt-1">Confirm to complete check-in and print label</p>
              </div>

              {photoData && photoData !== "demo-photo" ? (
                <img src={photoData} alt="Luggage" className="w-full rounded-3xl object-cover aspect-video" />
              ) : (
                <div className="bg-[#EDE8DF] rounded-3xl aspect-video flex items-center justify-center">
                  <p className="text-[#7A6252] text-sm">📦 Luggage photo captured</p>
                </div>
              )}

              <Button onClick={confirmCheckin} loading={loading} size="lg" className="w-full">
                Confirm & print label
              </Button>
              <button onClick={() => setStage("found")}
                className="text-sm text-[#A89080] text-center hover:text-[#7A6252]">
                Retake photo
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
                  Give the sticker to the guest and have them apply it themselves.
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
