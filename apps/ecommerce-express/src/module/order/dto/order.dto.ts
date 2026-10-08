import type { OrderStatus, PaymentStatus, RefundStatus, ShipmentStatus } from "@prisma/client";

export interface ShipmentDto {
  id: string;
  orderId: string;
  orderNumber: string;
  status: ShipmentStatus;
  rateCode: string;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  costCents: number;
  estimatedDelivery: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  events: Array<{
    status: ShipmentStatus;
    description: string;
    location: string | null;
    occurredAt: Date;
  }>;
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
}

export interface ShippingAddressDto {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  itemCount: number;
  placedAt: Date;
}

export interface OrderDetailDto extends OrderSummaryDto {
  userId: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  shippingAddress: ShippingAddressDto;
  items: OrderItemDto[];
  statusHistory: Array<{
    from: OrderStatus | null;
    to: OrderStatus;
    note: string | null;
    at: Date;
  }>;
  payments: Array<{
    id: string;
    status: PaymentStatus;
    amountCents: number;
    refundedCents: number;
    createdAt: Date;
  }>;
  shipment: ShipmentDto | null;
  invoice: { id: string; number: string } | null;
  refunds: Array<{ id: string; status: RefundStatus; amountCents: number }>;
  cancelledAt: Date | null;
}
