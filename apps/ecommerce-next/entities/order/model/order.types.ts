export type OrderStatus =
  "CONFIRMED" | "PREPARING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type ShipmentStatus =
  | "PENDING"
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";
export type CheckoutStatus =
  "OPEN" | "ADDRESS_SET" | "PAYMENT_PENDING" | "COMPLETED" | "ABANDONED" | "EXPIRED";

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  weightGrams: number;
}

export interface ShippingRate {
  code: string;
  carrier: string;
  service: string;
  costCents: number;
  estimatedDays: number;
  currency: string;
}

export interface CheckoutSession {
  id: string;
  status: CheckoutStatus;
  currency: string;
  items: CheckoutItem[];
  addressId: string | null;
  shippingAddress: ShippingAddress | null;
  shippingRateCode: string | null;
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt: string;
  orderId: string | null;
  shippingRates?: ShippingRate[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  itemCount: number;
  placedAt: string;
}

export interface ShipmentEvent {
  status: ShipmentStatus;
  description: string;
  location: string | null;
  occurredAt: string;
}

export interface Shipment {
  id: string;
  status: ShipmentStatus;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  events: ShipmentEvent[];
}

export interface OrderDetail extends OrderSummary {
  userId: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  shippingAddress: ShippingAddress;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    variantName: string;
    sku: string;
    imageUrl: string | null;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }>;
  statusHistory: Array<{
    from: OrderStatus | null;
    to: OrderStatus;
    note: string | null;
    at: string;
  }>;
  payments: Array<{
    id: string;
    status: string;
    amountCents: number;
    refundedCents: number;
    createdAt: string;
  }>;
  shipment: Shipment | null;
  invoice: { id: string; number: string } | null;
  refunds: Array<{ id: string; status: string; amountCents: number }>;
  cancelledAt: string | null;
}
