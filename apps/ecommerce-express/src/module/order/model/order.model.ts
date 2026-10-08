import type { OrderStatus } from "@prisma/client";
import { randomCode } from "../../../shared/util/crypto.util";
import { yyyymmdd } from "../../../shared/util/date.util";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canBeCancelled(status: OrderStatus): boolean {
  return TRANSITIONS[status].includes("CANCELLED");
}

export function generateOrderNumber(now: Date = new Date()): string {
  return `ORD-${yyyymmdd(now)}-${randomCode(6)}`;
}
