export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "CHECKED_IN"
  | "HANDED_TO_CARRIER"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "AUTO_CANCELLED"
  | "CARRIER_REFUSED";

export type LuggageSize = "S" | "M" | "L" | "LL";

export type DestinationType = "hotel" | "airport" | "depot" | "station" | "other";

export interface SizeInfo {
  code: LuggageSize;
  label: string;
  description: string;
  maxSize: string;
  maxWeight: string;
  price: number;
  maxPrice: number;
}

export interface Address {
  facilityName?: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
  recipientName: string;
  phone?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  size: LuggageSize;
  fromHotel: string;
  fromHotelId?: string;
  toAddress: Address;
  deliveryDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  basePrice: number;
  totalPrice: number;
  trackingNumber?: string;
  carrier?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  destinationType: DestinationType;
  paymentIntentId?: string;
  labelUrl?: string;
  shipcoShipmentId?: string;
  photoUrls?: string[];
  flagged?: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  branchName?: string;
  address: string;
  status: "active" | "paused";
  dailyOrderCount: number;
  carrier: "yamato" | "sagawa";
  cutoffTime: string;
  printerType: "bluetooth_thermal" | "usb_thermal" | "none";
  labelSize: "62mm" | "100mm";
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  collectionMethod?: "fixed_time" | "on_demand" | "drop_off";
  sameDayDelivery?: boolean;
  maxDailyItems?: number;
  storageLocation?: string;
  operationalNotes?: string;
}

export interface BookingState {
  step: number;
  size?: LuggageSize;
  conditionPhotos: string[];
  toAddress?: Partial<Address>;
  deliveryDate?: string;
  guestName?: string;
  guestEmail?: string;
  guestEmailConfirm?: string;
  guestPhone?: string;
  agreedToTerms: boolean;
  fromHotel: string;
  fromHotelId?: string;
  destinationType?: DestinationType;
}
