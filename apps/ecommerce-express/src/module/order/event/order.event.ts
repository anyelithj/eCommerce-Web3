import { TypedEventBus } from "../../../shared/util/event-bus.util";
import type { OrderStatus, RefundStatus, ShipmentStatus, LoyaltyTier } from "@prisma/client";

export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  totalCents: number;
  currency: string;
}

export type CommerceEvents = {
  "order.placed": OrderEventPayload;
  "order.status-changed": OrderEventPayload & { from: OrderStatus; to: OrderStatus };
  "order.cancelled": OrderEventPayload & { reason: string };
  "payment.failed": { userId: string; checkoutSessionId: string; reason: string };
  "shipment.updated": {
    userId: string;
    orderId: string;
    orderNumber: string;
    shipmentId: string;
    status: ShipmentStatus;
    trackingNumber: string | null;
  };
  "refund.updated": {
    userId: string;
    refundId: string;
    orderId: string;
    status: RefundStatus;
    amountCents: number;
    currency: string;
  };
  "invoice.issued": { userId: string; invoiceId: string; number: string; orderId: string };
  "loyalty.tier-upgraded": { userId: string; accountId: string; tier: LoyaltyTier };
  "loyalty.badge-minted": { userId: string; badgeId: string; tier: LoyaltyTier; txHash: string };
  "review.moderated": { userId: string; reviewId: string; productId: string; approved: boolean };
  "review.replied": { userId: string; reviewId: string; productId: string };
};

export const commerceEvents = new TypedEventBus<CommerceEvents>("commerce");
