"use client";
import { useState } from "react";
import { Search, MapPin, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { BookingState, DestinationType } from "@/types";

interface Props {
  booking: BookingState;
  update: (p: Partial<BookingState>) => void;
  onNext: () => void;
}

type InputMode = "search" | "manual";

interface Destination {
  name: string;
  type: DestinationType;
  zip: string;
  pref: string;
  city: string;
  area?: string;
}

// ── Comprehensive Japan destinations ─────────────────────────────────────────
const DESTINATIONS: Destination[] = [
  // Airports
  { name: "Narita International Airport T1",    type: "airport",  zip: "282-0004", pref: "Chiba",    city: "Narita",    area: "Chiba" },
  { name: "Narita International Airport T2",    type: "airport",  zip: "282-0004", pref: "Chiba",    city: "Narita",    area: "Chiba" },
  { name: "Narita International Airport T3",    type: "airport",  zip: "282-0004", pref: "Chiba",    city: "Narita",    area: "Chiba" },
  { name: "Haneda Airport T1",                  type: "airport",  zip: "144-0041", pref: "Tokyo",    city: "Ota",       area: "Tokyo" },
  { name: "Haneda Airport T2",                  type: "airport",  zip: "144-0041", pref: "Tokyo",    city: "Ota",       area: "Tokyo" },
  { name: "Haneda Airport T3 (International)",  type: "airport",  zip: "144-0041", pref: "Tokyo",    city: "Ota",       area: "Tokyo" },
  { name: "Kansai International Airport T1",    type: "airport",  zip: "549-0001", pref: "Osaka",    city: "Izumisano", area: "Osaka" },
  { name: "Kansai International Airport T2",    type: "airport",  zip: "549-0001", pref: "Osaka",    city: "Izumisano", area: "Osaka" },
  { name: "Osaka Itami Airport",                type: "airport",  zip: "560-0082", pref: "Osaka",    city: "Itami",     area: "Osaka" },
  { name: "Chubu Centrair International Airport", type: "airport", zip: "479-0881", pref: "Aichi",   city: "Tokoname",  area: "Nagoya" },
  { name: "New Chitose Airport (Sapporo)",       type: "airport",  zip: "066-0012", pref: "Hokkaido", city: "Chitose",  area: "Hokkaido" },
  { name: "Fukuoka Airport",                    type: "airport",  zip: "812-0003", pref: "Fukuoka",  city: "Fukuoka",   area: "Fukuoka" },
  { name: "Naha Airport (Okinawa)",             type: "airport",  zip: "901-0142", pref: "Okinawa",  city: "Naha",      area: "Okinawa" },
  // Stations
  { name: "Tokyo Station",                      type: "station",  zip: "100-0005", pref: "Tokyo",    city: "Chiyoda",   area: "Tokyo" },
  { name: "Shinjuku Station",                   type: "station",  zip: "160-0022", pref: "Tokyo",    city: "Shinjuku",  area: "Tokyo" },
  { name: "Shibuya Station",                    type: "station",  zip: "150-0002", pref: "Tokyo",    city: "Shibuya",   area: "Tokyo" },
  { name: "Ueno Station",                       type: "station",  zip: "110-0005", pref: "Tokyo",    city: "Taito",     area: "Tokyo" },
  { name: "Ikebukuro Station",                  type: "station",  zip: "171-0022", pref: "Tokyo",    city: "Toshima",   area: "Tokyo" },
  { name: "Shin-Osaka Station",                 type: "station",  zip: "533-0033", pref: "Osaka",    city: "Osaka",     area: "Osaka" },
  { name: "Osaka Station (Umeda)",              type: "station",  zip: "530-0001", pref: "Osaka",    city: "Osaka",     area: "Osaka" },
  { name: "Kyoto Station",                      type: "station",  zip: "600-8216", pref: "Kyoto",    city: "Kyoto",     area: "Kyoto" },
  { name: "Nagoya Station",                     type: "station",  zip: "450-0002", pref: "Aichi",    city: "Nagoya",    area: "Nagoya" },
  { name: "Sapporo Station",                    type: "station",  zip: "060-0005", pref: "Hokkaido", city: "Sapporo",   area: "Hokkaido" },
  { name: "Hakata Station (Fukuoka)",           type: "station",  zip: "812-0012", pref: "Fukuoka",  city: "Fukuoka",   area: "Fukuoka" },
  { name: "Hiroshima Station",                  type: "station",  zip: "732-0822", pref: "Hiroshima",city: "Hiroshima", area: "Hiroshima" },
  { name: "Sendai Station",                     type: "station",  zip: "980-0021", pref: "Miyagi",   city: "Sendai",    area: "Tohoku" },
  { name: "Kanazawa Station",                   type: "station",  zip: "920-0031", pref: "Ishikawa", city: "Kanazawa",  area: "Hokuriku" },
  { name: "Naha Station (Okinawa Monorail)",    type: "station",  zip: "900-0006", pref: "Okinawa",  city: "Naha",      area: "Okinawa" },
  // Hotels
  { name: "Park Hyatt Tokyo",                   type: "hotel",    zip: "163-1055", pref: "Tokyo",    city: "Shinjuku",  area: "Tokyo" },
  { name: "The Ritz-Carlton Tokyo",             type: "hotel",    zip: "107-6245", pref: "Tokyo",    city: "Minato",    area: "Tokyo" },
  { name: "Andaz Tokyo Toranomon Hills",        type: "hotel",    zip: "105-0001", pref: "Tokyo",    city: "Minato",    area: "Tokyo" },
  { name: "Hotel New Otani Tokyo",              type: "hotel",    zip: "102-8578", pref: "Tokyo",    city: "Chiyoda",   area: "Tokyo" },
  { name: "Imperial Hotel Tokyo",               type: "hotel",    zip: "100-8558", pref: "Tokyo",    city: "Chiyoda",   area: "Tokyo" },
  { name: "Hilton Osaka",                       type: "hotel",    zip: "530-0001", pref: "Osaka",    city: "Osaka",     area: "Osaka" },
  { name: "InterContinental Osaka",             type: "hotel",    zip: "530-0001", pref: "Osaka",    city: "Osaka",     area: "Osaka" },
  { name: "The Westin Miyako Kyoto",            type: "hotel",    zip: "605-0052", pref: "Kyoto",    city: "Kyoto",     area: "Kyoto" },
  { name: "Hotel Granvia Kyoto",                type: "hotel",    zip: "600-8216", pref: "Kyoto",    city: "Kyoto",     area: "Kyoto" },
  { name: "Nagoya Marriott Associa Hotel",      type: "hotel",    zip: "450-0002", pref: "Aichi",    city: "Nagoya",    area: "Nagoya" },
  { name: "JR Tower Hotel Nikko Sapporo",       type: "hotel",    zip: "060-0005", pref: "Hokkaido", city: "Sapporo",   area: "Hokkaido" },
  // Yamato depots
  { name: "Yamato Transport Depot – Shinjuku",  type: "depot",    zip: "160-0023", pref: "Tokyo",    city: "Shinjuku",  area: "Tokyo" },
  { name: "Yamato Transport Depot – Shibuya",   type: "depot",    zip: "150-0043", pref: "Tokyo",    city: "Shibuya",   area: "Tokyo" },
  { name: "Yamato Transport Depot – Osaka",     type: "depot",    zip: "553-0001", pref: "Osaka",    city: "Osaka",     area: "Osaka" },
  { name: "Yamato Transport Depot – Kyoto",     type: "depot",    zip: "604-0997", pref: "Kyoto",    city: "Kyoto",     area: "Kyoto" },
  { name: "Yamato Transport Depot – Nagoya",    type: "depot",    zip: "460-0015", pref: "Aichi",    city: "Nagoya",    area: "Nagoya" },
  { name: "Yamato Transport Depot – Sapporo",   type: "depot",    zip: "003-0801", pref: "Hokkaido", city: "Sapporo",   area: "Hokkaido" },
  { name: "Yamato Transport Depot – Fukuoka",   type: "depot",    zip: "810-0022", pref: "Fukuoka",  city: "Fukuoka",   area: "Fukuoka" },
  { name: "Sagawa Express Depot – Tokyo",       type: "depot",    zip: "120-0006", pref: "Tokyo",    city: "Adachi",    area: "Tokyo" },
  { name: "Sagawa Express Depot – Osaka",       type: "depot",    zip: "567-0005", pref: "Osaka",    city: "Ibaraki",   area: "Osaka" },
];

const POPULAR_KEYS = [
  "Narita International Airport T1",
  "Haneda Airport T3 (International)",
  "Kansai International Airport T1",
  "Kyoto Station",
  "Osaka Station (Umeda)",
  "Park Hyatt Tokyo",
  "Yamato Transport Depot – Shinjuku",
];
const POPULAR = DESTINATIONS.filter((d) => POPULAR_KEYS.includes(d.name));

const TYPE_ICON: Record<string, string> = {
  airport: "✈️", hotel: "🏨", station: "🚉", depot: "📦", other: "📍",
};

const inputClass =
  "w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] " +
  "placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]";

// ── Step 2.5: Confirmation when multiple similar facilities exist ─────────────
function SimilarFacilityConfirm({
  candidate,
  similar,
  onConfirm,
  onPickOther,
}: {
  candidate: Destination;
  similar: Destination[];
  onConfirm: (d: Destination) => void;
  onPickOther: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4">
        <p className="text-sm font-bold text-amber-800 mb-1">Multiple similar facilities found</p>
        <p className="text-xs text-amber-700">Please confirm the correct destination.</p>
      </div>

      <div className="flex flex-col gap-2">
        {[candidate, ...similar].map((d) => (
          <button key={d.name} onClick={() => onConfirm(d)}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[#EDE8DF] hover:border-[#C8A96E] transition-all text-left shadow-sm hover:shadow-md">
            <span className="text-2xl">{TYPE_ICON[d.type]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1A120B]">{d.name}</p>
              <p className="text-xs text-[#A89080]">{d.pref} · {d.zip} · {d.type}</p>
            </div>
            <ChevronRight size={16} className="text-[#A89080]" />
          </button>
        ))}
      </div>

      <button onClick={onPickOther}
        className="flex items-center justify-center gap-2 text-sm text-[#A89080] hover:text-[#7A6252] py-2">
        <X size={13} /> None of these — search again
      </button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function Step2Address({ booking, update, onNext }: Props) {
  const [mode,          setMode]          = useState<InputMode>("search");
  const [query,         setQuery]         = useState(booking.toAddress?.facilityName ?? "");
  const [results,       setResults]       = useState<Destination[]>([]);
  const [confirmStep,   setConfirmStep]   = useState<{ candidate: Destination; similar: Destination[] } | null>(null);

  const addr = booking.toAddress ?? {};

  // Fuzzy search against full destination list
  const handleSearch = (q: string) => {
    setQuery(q);
    setConfirmStep(null);
    if (q.length < 2) { setResults([]); return; }
    const lower = q.toLowerCase();
    const hits = DESTINATIONS.filter(
      (d) => d.name.toLowerCase().includes(lower) || d.area?.toLowerCase().includes(lower) || d.pref.toLowerCase().includes(lower) || d.city.toLowerCase().includes(lower)
    ).slice(0, 8);
    setResults(hits);
  };

  // When user taps a destination, check for similar facilities (same area + type)
  const selectDest = (dest: Destination) => {
    setResults([]);
    // Find similar facilities (same type + same area, different name)
    const similar = DESTINATIONS.filter(
      (d) => d !== dest && d.type === dest.type && d.area === dest.area && d.name !== dest.name
    ).slice(0, 3);

    // Only trigger Step 2.5 for airports/depots (where terminal/branch matters)
    if (similar.length > 0 && (dest.type === "airport" || dest.type === "depot")) {
      setConfirmStep({ candidate: dest, similar });
    } else {
      applyDest(dest);
    }
  };

  const applyDest = (dest: Destination) => {
    update({
      toAddress: { ...addr, facilityName: dest.name, postalCode: dest.zip, prefecture: dest.pref, city: dest.city, street: "" },
      destinationType: dest.type,
    });
    setQuery(dest.name);
    setConfirmStep(null);
  };

  const canContinue = !!(addr.recipientName && addr.postalCode && addr.prefecture && addr.city);

  // ── Step 2.5 active ───────────────────────────────────────────────────────
  if (confirmStep) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1A120B] mb-1">Confirm destination</h1>
          <p className="text-sm text-[#A89080]">Multiple locations match — please select the right one</p>
        </div>
        <SimilarFacilityConfirm
          candidate={confirmStep.candidate}
          similar={confirmStep.similar}
          onConfirm={(d) => applyDest(d)}
          onPickOther={() => { setConfirmStep(null); setQuery(""); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Where to deliver?</h1>
        <p className="text-sm text-[#A89080]">Hotels, airports, stations, depots — anywhere in Japan</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-[#F8F3EC] rounded-2xl p-1 gap-1">
        {(["search", "manual"] as InputMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200",
              mode === m ? "bg-white shadow-sm text-[#1A120B]" : "text-[#7A6252] hover:text-[#44342A]"
            )}
          >
            {m === "search" ? "🔍 Search" : "✏️ Enter address"}
          </button>
        ))}
      </div>

      {mode === "search" ? (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89080]" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Hotel name, airport, station, city..."
              className={`pl-10 ${inputClass}`}
            />
            {/* Dropdown results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#EDE8DF] shadow-xl z-20 overflow-hidden"
                >
                  {results.map((dest) => (
                    <button key={dest.name} onClick={() => selectDest(dest)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FEFCF8] transition-colors text-left border-b border-[#F8F3EC] last:border-0">
                      <span className="text-xl">{TYPE_ICON[dest.type]}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1A120B]">{dest.name}</p>
                        <p className="text-xs text-[#A89080]">{dest.pref} · {dest.type}</p>
                      </div>
                      <MapPin size={13} className="text-[#C8A96E] flex-shrink-0" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Popular destinations (shown when no query) */}
          {!query && (
            <div>
              <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-2">Popular destinations</p>
              <div className="flex flex-col gap-2">
                {POPULAR.map((dest) => (
                  <button key={dest.name} onClick={() => selectDest(dest)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left",
                      addr.facilityName === dest.name
                        ? "border-[#1A120B] bg-[#FEFCF8]"
                        : "border-[#EDE8DF] bg-white hover:border-[#C8A96E]"
                    )}
                  >
                    <span className="text-xl">{TYPE_ICON[dest.type]}</span>
                    <div>
                      <p className="text-sm font-medium text-[#1A120B]">{dest.name}</p>
                      <p className="text-xs text-[#A89080] capitalize">{dest.type} · {dest.pref}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected destination confirmation */}
          {addr.facilityName && query && (
            <div className="flex items-center gap-3 bg-[#F8F3EC] border border-[#EDE8DF] rounded-2xl px-4 py-3">
              <span className="text-xl">{TYPE_ICON[booking.destinationType ?? "other"]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1A120B]">{addr.facilityName}</p>
                <p className="text-xs text-[#A89080]">{addr.prefecture} {addr.postalCode}</p>
              </div>
              <button onClick={() => { setQuery(""); update({ toAddress: { ...addr, facilityName: undefined, postalCode: "", prefecture: "", city: "", street: "" } }); }}
                className="text-[#A89080] hover:text-red-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input label="Postal Code" required placeholder="e.g. 160-0023"
            value={addr.postalCode ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, postalCode: e.target.value } })} />
          <Input label="Prefecture" required placeholder="e.g. Tokyo"
            value={addr.prefecture ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, prefecture: e.target.value } })} />
          <Input label="City" required placeholder="e.g. Shinjuku"
            value={addr.city ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, city: e.target.value } })} />
          <Input label="Street address" required placeholder="e.g. 1-2-3 Kabukicho"
            value={addr.street ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, street: e.target.value } })} />
          <Input label="Building / Room (optional)" placeholder="e.g. Room 501"
            value={addr.building ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, building: e.target.value } })} />
          <Input label="Facility name (optional)" placeholder="e.g. Park Hyatt Tokyo"
            value={addr.facilityName ?? ""}
            onChange={(e) => update({ toAddress: { ...addr, facilityName: e.target.value } })} />
        </div>
      )}

      <Input label="Recipient name" required placeholder="Full name"
        value={addr.recipientName ?? ""}
        onChange={(e) => update({ toAddress: { ...addr, recipientName: e.target.value } })} />

      {booking.destinationType === "airport" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          ✈️ <strong>Note:</strong> Your flight time must be after 14:00 on the delivery date.
        </div>
      )}

      <Button onClick={onNext} disabled={!canContinue} size="lg" className="w-full">
        Continue
      </Button>
    </div>
  );
}
