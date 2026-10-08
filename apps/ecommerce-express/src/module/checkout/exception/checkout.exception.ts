// checkout.exception.ts => errores de dominio del módulo Checkout.
import type { CheckoutStatus } from "@prisma/client";
import {
  ConflictException,
  NotFoundException,
  UnprocessableException,
} from "../../../shared/filter/http-exception.filter";

export class CheckoutNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Checkout session", id);
  }
}

export class EmptyCartException extends UnprocessableException {
  constructor() {
    super("El carrito está vacío", "EMPTY_CART");
  }
}

// Algún ítem ya no tiene stock suficiente al reservar (otro cliente lo compró antes)
export class StockReservationException extends UnprocessableException {
  constructor(sku: string) {
    super(`No hay stock suficiente de ${sku} para reservar`, "STOCK_RESERVATION_FAILED", { sku });
  }
}

export class CheckoutClosedException extends ConflictException {
  constructor(status: CheckoutStatus) {
    super(`La sesión de checkout está ${status} y ya no admite cambios`, "CHECKOUT_CLOSED", {
      status,
    });
  }
}

export class InvalidShippingRateException extends UnprocessableException {
  constructor(code: string) {
    super(`La tarifa ${code} no está disponible para esa dirección`, "INVALID_SHIPPING_RATE");
  }
}
