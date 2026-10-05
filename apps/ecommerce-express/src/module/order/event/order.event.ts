import type { LoyaltyTier, OrderStatus, RefundStatus, ShipmentStatus } from "@prisma/client";
import { TypedEventBus } from "../../../shared/util/event-bus.util";

export interface CommerceEvents extends Record<string, unknown> {
  "order.placed": { userId: string; orderId: string; orderNumber: string; totalCents: number; currency: string };
  "order.status-changed": { userId: string; orderId: string; orderNumber: string; to: OrderStatus };
  "order.cancelled": { userId: string; orderId: string; orderNumber: string; reason: string };
  "payment.failed": { userId: string; checkoutSessionId: string; reason: string };
  "shipment.updated": { userId: string; orderId: string; orderNumber: string; status: ShipmentStatus; trackingNumber?: string | null };
  "refund.updated": { userId: string; orderId: string; refundId: string; amountCents: number; currency: string; status: RefundStatus };
  "invoice.issued": { userId: string; invoiceId: string; number: string; orderId: string };
  "loyalty.tier-upgraded": { userId: string; tier: LoyaltyTier };
  "loyalty.badge-minted": { userId: string; tier: LoyaltyTier; txHash: string };
  "review.moderated": { userId: string; approved: boolean };
  "review.replied": { userId: string };
}

export const commerceEvents = new TypedEventBus<CommerceEvents>("commerce");
