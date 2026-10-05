import { ConflictException, NotFoundException, UnprocessableException } from "../../../shared/filter/http-exception.filter";

export class VariantNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Variant", id);
  }
}

export class MovementNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Stock movement", id);
  }
}

export class InsufficientStockException extends UnprocessableException {
  constructor(available: number) {
    super("Stock insuficiente para la operación", "INSUFFICIENT_STOCK", { available });
  }
}

export class MovementAlreadyVoidedException extends ConflictException {
  constructor() {
    super("El movimiento ya fue anulado", "MOVEMENT_ALREADY_VOIDED");
  }
}
