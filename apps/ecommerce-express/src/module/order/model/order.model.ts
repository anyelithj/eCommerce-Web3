// order.model.ts => ciclo de vida del pedido como MÁQUINA DE ESTADOS (patrón State expresado como tabla de transiciones).
// Matriz: CONFIRMED → PREPARING → PACKED → SHIPPED → DELIVERED | CANCELLED. Funciones puras (testeables sin DB).
import type { OrderStatus } from "@prisma/client";
import { randomCode } from "../../../shared/util/crypto.util";
import { yyyymmdd } from "../../../shared/util/date.util";

// "Record<OrderStatus, OrderStatus[]>" => el compilador exige declarar TODOS los estados (sin olvidos)
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"], // Una vez despachado ya no se cancela: se gestiona como devolución (módulo Refund)
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// canBeCancelled => "cancelar orden antes del envío"
export function canBeCancelled(status: OrderStatus): boolean {
  return TRANSITIONS[status].includes("CANCELLED");
}

// generateOrderNumber => "ORD-20260929-4F2A7K": fecha legible + sufijo aleatorio sin caracteres ambiguos
export function generateOrderNumber(now: Date = new Date()): string {
  return `ORD-${yyyymmdd(now)}-${randomCode(6)}`;
}
