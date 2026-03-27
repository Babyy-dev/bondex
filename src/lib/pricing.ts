import type { LuggageSize, SizeInfo } from "@/types";

export const SIZES: SizeInfo[] = [
  {
    code: "S",
    label: "Small",
    description: "Cabin-size suitcase / Carry-on luggage",
    maxSize: "100cm total",
    maxWeight: "10 kg",
    price: 2500,
    maxPrice: 3500,
    carrierCost: 1500,
  },
  {
    code: "M",
    label: "Medium",
    description: "Standard suitcase / Most travelers",
    maxSize: "120cm total",
    maxWeight: "15 kg",
    price: 3500,
    maxPrice: 4500,
    carrierCost: 2200,
  },
  {
    code: "L",
    label: "Large",
    description: "Large suitcase / Family trips",
    maxSize: "160cm total",
    maxWeight: "20 kg",
    price: 4500,
    maxPrice: 5500,
    carrierCost: 2800,
  },
  {
    code: "LL",
    label: "Extra Large",
    description: "Large or special items (golf bags, ski cases, etc.)",
    maxSize: "200cm total",
    maxWeight: "25 kg",
    price: 6000,
    maxPrice: 7000,
    carrierCost: 3500,
  },
];

export function getSizeInfo(code: LuggageSize): SizeInfo {
  return SIZES.find((s) => s.code === code) ?? SIZES[1];
}

export function calculatePrice(size: LuggageSize): { base: number; max: number } {
  const info = getSizeInfo(size);
  return { base: info.price, max: info.maxPrice };
}

// ── Zone-based pricing ────────────────────────────────────────────────────────

/**
 * Map postal code (first 3 digits) to one of 8 geographic regions of Japan.
 * Region numbering: 1=Hokkaido, 2=Tohoku, 3=Kanto, 4=Chubu,
 *                   5=Kinki, 6=Chugoku+Shikoku, 7=Kyushu, 8=Okinawa
 */
export function getRegionFromPostal(postal: string): number {
  const digits = postal.replace(/[^0-9]/g, "");
  // Japanese postal codes must be 7 digits (with or without hyphen)
  if (digits.length < 3) return 3; // default Kanto for clearly invalid input
  const p = parseInt(digits.slice(0, 3), 10);

  if (p >= 900 && p <= 909) return 8; // Okinawa (must check before Kyushu)
  if (p >= 910 && p <= 999) return 2; // Tohoku (Akita, Miyagi, Yamagata, Fukushima, Niigata, Hokuriku)
  if (p >= 800 && p <= 899) return 7; // Kyushu
  if (p >= 660 && p <= 799) return 6; // Chugoku + Shikoku
  if (p >= 510 && p <= 659) return 5; // Kinki
  if (p >= 400 && p <= 509) return 4; // Chubu (Shizuoka, Aichi, Gifu, Mie)
  if (p >= 100 && p <= 399) return 3; // Kanto + North Kanto
  if (p >= 1   && p <= 99)  return 1; // Hokkaido
  return 3; // default Kanto
}

/**
 * Zone distance matrix (8×8).
 * zone[from-1][to-1] = delivery zone (1-5)
 */
const ZONE_MATRIX: number[][] = [
  //  1  2  3  4  5  6  7  8
  [1, 2, 3, 4, 5, 5, 5, 5], // 1 Hokkaido
  [2, 1, 2, 3, 4, 4, 5, 5], // 2 Tohoku
  [3, 2, 1, 2, 3, 3, 4, 5], // 3 Kanto
  [4, 3, 2, 1, 2, 3, 3, 5], // 4 Chubu
  [5, 4, 3, 2, 1, 2, 3, 5], // 5 Kinki
  [5, 4, 3, 3, 2, 1, 2, 5], // 6 Chugoku/Shikoku
  [5, 5, 4, 3, 3, 2, 1, 5], // 7 Kyushu
  [5, 5, 5, 5, 5, 5, 5, 1], // 8 Okinawa
];

/** Zone surcharge (yen) added on top of size base price */
const ZONE_SURCHARGE: Record<number, number> = {
  1: 0,
  2: 300,
  3: 600,
  4: 900,
  5: 1500,
};

/** Carrier cost multiplier by zone (applied to base carrier cost) */
const ZONE_CARRIER_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.2,
  4: 1.35,
  5: 1.5,
};

/**
 * Determine the delivery zone (1-5) from sender and destination postal codes.
 * Falls back to zone 1 if either postal code is invalid.
 */
export function getZone(fromPostal: string, toPostal: string): number {
  if (!fromPostal || !toPostal) return 1;
  const from = getRegionFromPostal(fromPostal);
  const to   = getRegionFromPostal(toPostal);
  return ZONE_MATRIX[from - 1]?.[to - 1] ?? 1;
}

/**
 * Calculate user price and carrier cost for a given size + zone.
 */
export function calculatePriceWithZone(
  size: LuggageSize,
  zone: number = 1
): { base: number; max: number; carrierCost: number; payoutAmount: number } {
  if (zone < 1 || zone > 5 || !Number.isInteger(zone)) {
    throw new Error(`Invalid zone: ${zone}. Must be an integer between 1 and 5.`);
  }
  const info       = getSizeInfo(size);
  const surcharge  = ZONE_SURCHARGE[zone]!;
  const multiplier = ZONE_CARRIER_MULTIPLIER[zone]!;
  const carrierCost  = Math.round((info.carrierCost ?? 0) * multiplier);
  const base   = info.price + surcharge;
  const max    = info.maxPrice + surcharge;
  // Payout = 15% of user price (fixed reward) + actual carrier cost
  const payoutAmount = Math.round(base * 0.15) + carrierCost;
  return { base, max, carrierCost, payoutAmount };
}

// ── Delivery date helpers ─────────────────────────────────────────────────────

export function getEarliestDeliveryDate(): Date {
  // Evaluate the 17:00 cutoff against JST (UTC+9)
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstHour = nowJst.getUTCHours();
  const pastCutoff = jstHour >= 17;

  const daysToAdd = pastCutoff ? 2 : 1;
  return new Date(Date.UTC(
    nowJst.getUTCFullYear(),
    nowJst.getUTCMonth(),
    nowJst.getUTCDate() + daysToAdd,
  ));
}

export function getDeliveryDates(): Date[] {
  const earliest = getEarliestDeliveryDate();
  const dates: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(earliest);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}
