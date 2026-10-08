// order.exception.ts => errores de dominio del módulo Order.
import type { OrderStatus } from "@prisma/client";
import { ConflictException, NotFoundException } from "../../../shared/filter/http-exception.filter";

export class OrderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Order", id);
  }
}

export class InvalidOrderTransitionException extends ConflictException {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`No se puede pasar el pedido de ${from} a ${to}`, "INVALID_ORDER_TRANSITION", {
      from,
      to,
    });
  }
}

export class OrderNotCancellableException extends ConflictException {
  constructor(status: OrderStatus) {
    super(
      `El pedido en estado ${status} ya no se puede cancelar; solicita una devolución`,
      "ORDER_NOT_CANCELLABLE"
    );
  }
}

// El pago aún no fue confirmado por Stripe (el webhook no ha llegado): el cliente debe reintentar en unos segundos
export class PaymentNotConfirmedException extends ConflictException {
  constructor() {
    super("El pago aún no ha sido confirmado", "PAYMENT_NOT_CONFIRMED");
  }
}
