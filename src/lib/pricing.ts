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
  },
  {
    code: "M",
    label: "Medium",
    description: "Standard suitcase / Most travelers",
    maxSize: "120cm total",
    maxWeight: "15 kg",
    price: 3500,
    maxPrice: 4500,
  },
  {
    code: "L",
    label: "Large",
    description: "Large suitcase / Family trips",
    maxSize: "160cm total",
    maxWeight: "20 kg",
    price: 4500,
    maxPrice: 5500,
  },
  {
    code: "LL",
    label: "Extra Large",
    description: "Large or special items (golf bags, ski cases, etc.)",
    maxSize: "200cm total",
    maxWeight: "25 kg",
    price: 6000,
    maxPrice: 7000,
  },
];

export function getSizeInfo(code: LuggageSize): SizeInfo {
  return SIZES.find((s) => s.code === code) ?? SIZES[1];
}

export function calculatePrice(size: LuggageSize): { base: number; max: number } {
  const info = getSizeInfo(size);
  return { base: info.price, max: info.maxPrice };
}

export function getEarliestDeliveryDate(): Date {
  // Evaluate the 17:00 cutoff against JST (UTC+9), not server local time
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstHour = nowJst.getUTCHours(); // UTC hours of the JST-shifted timestamp = JST hour
  const pastCutoff = jstHour >= 17;

  // Return midnight UTC of the target JST calendar date so toISOString() and
  // getDate()/getMonth()/getFullYear() (on UTC server) both show the correct date
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
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}
