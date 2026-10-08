// inventory.exception.ts => errores de dominio del módulo Inventory (mapeados por error.middleware).
import {
  ConflictException,
  NotFoundException,
  UnprocessableException,
} from "../../../shared/filter/http-exception.filter";

export class VariantNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Variant", id); // 404 VARIANT_NOT_FOUND
  }
}

export class MovementNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Stock movement", id); // 404 STOCK_MOVEMENT_NOT_FOUND
  }
}

// 422 => la salida dejaría el stock por debajo de lo reservado por checkouts abiertos (nunca stock negativo)
export class InsufficientStockException extends UnprocessableException {
  constructor(available: number) {
    super("Stock insuficiente para la operación", "INSUFFICIENT_STOCK", { available });
  }
}

// 409 => el movimiento ya fue anulado (la anulación no se repite)
export class MovementAlreadyVoidedException extends ConflictException {
  constructor() {
    super("El movimiento ya fue anulado", "MOVEMENT_ALREADY_VOIDED");
  }
}
