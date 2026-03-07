import type { LuggageSize, SizeInfo } from "@/types";

export const SIZES: SizeInfo[] = [
  {
    code: "S",
    label: "Small",
    description: "Cabin-size suitcase / Carry-on luggage",
    maxSize: "100cm total",
    maxWeight: "10 kg",
    price: 1500,
    maxPrice: 1800,
  },
  {
    code: "M",
    label: "Medium",
    description: "Standard suitcase / Most travelers",
    maxSize: "120cm total",
    maxWeight: "15 kg",
    price: 2000,
    maxPrice: 2500,
  },
  {
    code: "L",
    label: "Large",
    description: "Large suitcase / Family trips",
    maxSize: "160cm total",
    maxWeight: "20 kg",
    price: 2800,
    maxPrice: 3300,
  },
  {
    code: "LL",
    label: "Extra Large",
    description: "Large or special items (golf bags, ski cases, etc.)",
    maxSize: "200cm total",
    maxWeight: "25 kg",
    price: 3500,
    maxPrice: 4200,
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
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(17, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  return now < cutoff ? tomorrow : dayAfter;
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
