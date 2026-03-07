"use client";
import { useState } from "react";
import { Search, MapPin } from "lucide-react";
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

const POPULAR = [
  { name: "Narita International Airport T1",   type: "airport" as DestinationType, zip: "282-0004", pref: "Chiba",  city: "Narita" },
  { name: "Haneda Airport T3 (International)", type: "airport" as DestinationType, zip: "144-0041", pref: "Tokyo",  city: "Ota" },
  { name: "Kyoto Station Hotel",               type: "hotel"   as DestinationType, zip: "600-8216", pref: "Kyoto",  city: "Kyoto" },
  { name: "Osaka Shin-Osaka Station",          type: "station" as DestinationType, zip: "533-0033", pref: "Osaka",  city: "Osaka" },
  { name: "Yamato Transport Depot – Shinjuku", type: "depot"   as DestinationType, zip: "160-0023", pref: "Tokyo",  city: "Shinjuku" },
];

const TYPE_ICON: Record<string, string> = {
  airport: "✈️", hotel: "🏨", station: "🚉", depot: "📦", other: "📍",
};

const inputClass =
  "w-full px-4 py-3 rounded-2xl border border-[#EDE8DF] bg-white text-sm text-[#1A120B] " +
  "placeholder:text-[#A89080] focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/30 focus:border-[#C8A96E]";

export function Step2Address({ booking, update, onNext }: Props) {
  const [mode, setMode]       = useState<InputMode>("search");
  const [query, setQuery]     = useState(booking.toAddress?.facilityName ?? "");
  const [filtered, setFiltered] = useState<typeof POPULAR>([]);

  const addr = booking.toAddress ?? {};

  const handleSearch = (q: string) => {
    setQuery(q);
    setFiltered(q.length > 1 ? POPULAR.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())) : []);
  };

  const selectDest = (dest: (typeof POPULAR)[0]) => {
    update({
      toAddress: { ...addr, facilityName: dest.name, postalCode: dest.zip, prefecture: dest.pref, city: dest.city, street: "" },
      destinationType: dest.type,
    });
    setQuery(dest.name);
    setFiltered([]);
  };

  const canContinue = !!(addr.recipientName && addr.postalCode && addr.prefecture && addr.city);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A120B] mb-1">Where to deliver?</h1>
        <p className="text-sm text-[#A89080]">Hotels, airports, stations, depots — anywhere in Japan</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-[#F8F3EC] rounded-2xl p-1 gap-1">
        {(["search", "manual"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
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
              placeholder="Hotel name, airport, station..."
              className={`pl-10 ${inputClass}`}
            />
            {filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#EDE8DF] shadow-xl z-10 overflow-hidden">
                {filtered.map((dest) => (
                  <button key={dest.name} onClick={() => selectDest(dest)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FEFCF8] transition-colors text-left"
                  >
                    <MapPin size={14} className="text-[#A89080] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1A120B]">{dest.name}</p>
                      <p className="text-xs text-[#A89080]">{dest.pref} – {dest.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!query && (
            <div>
              <p className="text-xs font-semibold text-[#A89080] uppercase tracking-wide mb-2">Popular destinations</p>
              <div className="flex flex-col gap-2">
                {POPULAR.slice(0, 4).map((dest) => (
                  <button key={dest.name} onClick={() => selectDest(dest)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left",
                      addr.facilityName === dest.name
                        ? "border-[#1A120B] bg-[#FEFCF8]"
                        : "border-[#EDE8DF] bg-white hover:border-[#C8A96E]"
                    )}
                  >
                    <span className="text-lg">{TYPE_ICON[dest.type]}</span>
                    <div>
                      <p className="text-sm font-medium text-[#1A120B]">{dest.name}</p>
                      <p className="text-xs text-[#A89080] capitalize">{dest.type}</p>
                    </div>
                  </button>
                ))}
              </div>
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
