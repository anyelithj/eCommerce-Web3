// cart.exception.ts => errores de dominio del módulo Cart.
import {
  NotFoundException,
  UnprocessableException,
} from "../../../shared/filter/http-exception.filter";

export class CartItemNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Cart item", id);
  }
}

// Stock insuficiente: "details.available" permite a la UI ajustar la cantidad automáticamente
export class InsufficientStockException extends UnprocessableException {
  constructor(sku: string, available: number) {
    super(`Stock insuficiente para ${sku}: disponibles ${available}`, "INSUFFICIENT_STOCK", {
      sku,
      available,
    });
  }
}

export class ProductUnavailableException extends UnprocessableException {
  constructor() {
    super("El producto no está disponible para la venta", "PRODUCT_UNAVAILABLE");
  }
}

export class CurrencyMismatchException extends UnprocessableException {
  constructor(expected: string, received: string) {
    super(`El carrito opera en ${expected}; el producto está en ${received}`, "CURRENCY_MISMATCH");
  }
}
