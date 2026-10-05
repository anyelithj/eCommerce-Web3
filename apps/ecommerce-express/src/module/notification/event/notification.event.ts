import { commerceEvents } from "../../order/event/order.event";
import { notificationService } from "../service/notification.service";

export function registerNotificationSubscribers(): void {
  commerceEvents.on("order.placed", (event) =>
    notificationService.notify(event.userId, {
      type: "ORDER",
      message: { key: "orderPlaced", params: { orderNumber: event.orderNumber, totalCents: event.totalCents, currency: event.currency } },
      url: `/account/orders/${event.orderId}`,
      data: { orderId: event.orderId },
    })
  );
  commerceEvents.on("order.status-changed", (event) =>
    notificationService.notify(event.userId, {
      type: "ORDER",
      message: { key: "orderStatus", params: { orderNumber: event.orderNumber, status: event.to } },
      url: `/account/orders/${event.orderId}`,
      channels: event.to === "SHIPPED" || event.to === "DELIVERED" ? undefined : ["IN_APP"],
    })
  );
  commerceEvents.on("order.cancelled", (event) =>
    notificationService.notify(event.userId, {
      type: "ORDER",
      message: { key: "orderCancelled", params: { orderNumber: event.orderNumber, reason: event.reason } },
      url: `/account/orders/${event.orderId}`,
    })
  );
  commerceEvents.on("payment.failed", (event) =>
    notificationService.notify(event.userId, {
      type: "PAYMENT",
      message: { key: "paymentFailed", params: { reason: event.reason } },
      url: `/checkout/${event.checkoutSessionId}/payment`,
    })
  );
  commerceEvents.on("shipment.updated", (event) =>
    notificationService.notify(event.userId, {
      type: "SHIPPING",
      message: { key: "shipmentUpdated", params: { orderNumber: event.orderNumber, status: event.status, trackingNumber: event.trackingNumber ?? null } },
      url: `/account/orders/${event.orderId}`,
    })
  );
  commerceEvents.on("refund.updated", (event) =>
    notificationService.notify(event.userId, {
      type: "REFUND",
      message: { key: "refundUpdated", params: { amountCents: event.amountCents, currency: event.currency, status: event.status } },
      url: `/account/orders/${event.orderId}`,
    })
  );
  commerceEvents.on("invoice.issued", (event) =>
    notificationService.notify(event.userId, {
      type: "ORDER",
      message: { key: "invoiceIssued", params: { number: event.number } },
      url: `/account/orders/${event.orderId}`,
      channels: ["IN_APP"],
    })
  );
  commerceEvents.on("loyalty.tier-upgraded", (event) =>
    notificationService.notify(event.userId, { type: "LOYALTY", message: { key: "tierUpgraded", params: { tier: event.tier } }, url: "/account/loyalty" })
  );
  commerceEvents.on("loyalty.badge-minted", (event) =>
    notificationService.notify(event.userId, { type: "LOYALTY", message: { key: "badgeMinted", params: { tier: event.tier, txHash: event.txHash } }, url: "/account/loyalty" })
  );
  commerceEvents.on("review.moderated", (event) =>
    notificationService.notify(event.userId, { type: "REVIEW", message: { key: "reviewModerated", params: { approved: event.approved } }, url: "/account/reviews" })
  );
  commerceEvents.on("review.replied", (event) =>
    notificationService.notify(event.userId, { type: "REVIEW", message: { key: "reviewReplied", params: {} }, url: "/account/reviews" })
  );
}
