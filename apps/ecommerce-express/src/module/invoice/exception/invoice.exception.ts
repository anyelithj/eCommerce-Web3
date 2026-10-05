import { ConflictException, NotFoundException } from "../../../shared/filter/http-exception.filter";

export class InvoiceNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Invoice", id);
  }
}

export class CreditNoteExceedsInvoiceException extends ConflictException {
  constructor(availableCents: number) {
    super(`La nota crédito supera el saldo facturado (${availableCents})`, "CREDIT_NOTE_EXCEEDS_INVOICE", { availableCents });
  }
}

export class OrderNotInvoiceableException extends ConflictException {
  constructor() {
    super("Solo se facturan pedidos confirmados (no cancelados)", "ORDER_NOT_INVOICEABLE");
  }
}
