import type { LuggageSize } from "@/types";
import { env } from "@/lib/env";

const SHIPCO_API_BASE = env.SHIPCO_API_BASE_URL;
const SHIPCO_API_KEY  = env.SHIPCO_API_KEY;

interface ShipcoAddress {
  full_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface ShipcoParcel {
  width: number;
  height: number;
  depth: number;
  weight: number;
}

const SIZE_DIMENSIONS: Record<LuggageSize, ShipcoParcel> = {
  S:  { width: 38, height: 23, depth: 55, weight: 10 },
  M:  { width: 50, height: 30, depth: 70, weight: 15 },
  L:  { width: 60, height: 40, depth: 80, weight: 20 },
  LL: { width: 75, height: 50, depth: 100, weight: 25 },
};

export interface CreateShipmentParams {
  fromAddress: ShipcoAddress;
  toAddress: ShipcoAddress;
  size: LuggageSize;
  deliveryDate: string;
  orderId: string;
  guestName: string;
  checkInDate: string;
  carrier?: string; // Ship&Co carrier code, e.g. "yamato_business" or "sagawa_yu_pack"
}

export interface ShipcoShipment {
  id: string;
  tracking_number: string;
  label_url: string;
  carrier: string;
  status: string;
  rate?: number;
  cost?: number;
}

async function shipcoFetch(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15 s timeout

  let res: Response;
  try {
    res = await fetch(`${SHIPCO_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${SHIPCO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error(`Ship&Co API timeout after 15s (${path})`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let errorMessage = `Ship&Co API error ${res.status}`;
    try {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const errJson = await res.json();
        errorMessage += `: ${errJson?.message ?? errJson?.error ?? JSON.stringify(errJson)}`;
      } else {
        const text = await res.text();
        if (text && text.length < 500) errorMessage += `: ${text}`;
      }
    } catch {
      // ignore parse errors — use the status-only message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function createShipment(params: CreateShipmentParams): Promise<ShipcoShipment> {
  const parcel = SIZE_DIMENSIONS[params.size];

  const body = {
    shipment: {
      setup: {
        date: params.deliveryDate,
        type: "delivery",
        no_customer_notification: true,
        ...(params.carrier ? { carrier: params.carrier } : {}),
      },
      from_address: params.fromAddress,
      to_address: {
        ...params.toAddress,
        // Append reference info to address2 per spec
        address2: [
          params.toAddress.address2,
          `Ref: ${params.guestName} C/I: ${params.checkInDate}`,
        ]
          .filter(Boolean)
          .join(" "),
      },
      parcels: [parcel],
    },
  };

  const data = await shipcoFetch("/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    id: data.id ?? data.shipment?.id,
    tracking_number: data.tracking_number ?? data.shipment?.tracking_number,
    label_url: data.label_url ?? data.shipment?.label_url,
    carrier: data.carrier ?? "yamato",
    status: data.status ?? "created",
    rate: data.rate ?? data.shipment?.rate,
    cost: data.cost ?? data.shipment?.cost ?? data.rate?.total,
  };
}

export async function getLabel(shipmentId: string): Promise<{ pdf_url: string }> {
  const data = await shipcoFetch(`/shipments/${shipmentId}/label`);
  return { pdf_url: data.pdf_url ?? data.label_url };
}

export async function getShipment(shipmentId: string): Promise<ShipcoShipment> {
  return shipcoFetch(`/shipments/${shipmentId}`);
}
