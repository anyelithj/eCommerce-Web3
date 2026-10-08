// checkout.model.ts => reglas puras del checkout: totales, estados abiertos y pasos permitidos.
// Saga de checkout (matriz: "address→payment→confirm→UPDATE no CREATE"): UNA sesión que avanza por pasos,
// cada paso es un PATCH sobre la misma sesión (nunca se crean sesiones nuevas por paso).
import type { CheckoutStatus } from "@prisma/client";

// Estados en los que la sesión aún retiene stock reservado
export const OPEN_STATUSES: CheckoutStatus[] = ["OPEN", "ADDRESS_SET", "PAYMENT_PENDING"];

export function isOpen(status: CheckoutStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

// Totales del checkout (todo en centavos). IVA sobre (subtotal - descuento); el envío se factura aparte sin IVA
export interface CheckoutTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

// computeTotals => función pura: mismo input => mismo total (fácil de auditar y testear)
export function computeTotals(input: {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxRate: number;
}): CheckoutTotals {
  const taxable = Math.max(0, input.subtotalCents - input.discountCents);
  const taxCents = Math.round(taxable * input.taxRate); // Redondeo bancario simple al centavo
  return {
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    shippingCents: input.shippingCents,
    taxCents,
    totalCents: taxable + taxCents + input.shippingCents,
  };
}
