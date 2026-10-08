// order.event.ts => catálogo de eventos de dominio del flujo de comercio + bus tipado (patrón Observer / Pub-Sub).
// Coreografía de la saga post-pago: la orden publica "order.placed" y CADA módulo interesado reacciona por su
// cuenta (envío crea el shipment, facturación emite la factura, notificaciones avisa al cliente). Ningún módulo
// importa a los demás => sin dependencias circulares y cada módulo se puede evolucionar de forma independiente (OCP).
// Este archivo NO importa services: solo define el contrato; cada módulo registra sus suscriptores en el bootstrap.
import { TypedEventBus } from "../../../shared/util/event-bus.util";
import type { OrderStatus, RefundStatus, ShipmentStatus, LoyaltyTier } from "@prisma/client";

// Datos mínimos de la orden que viajan en los eventos (evita re-consultar en cada suscriptor)
export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  totalCents: number;
  currency: string;
}

// "type" (no interface): cumple la restricción Record<string, unknown> del TypedEventBus
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

// Bus único del dominio de comercio (Singleton de módulo)
export const commerceEvents = new TypedEventBus<CommerceEvents>("commerce");
