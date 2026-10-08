import type { CheckoutStatus } from "@prisma/client";

export const OPEN_STATUSES: CheckoutStatus[] = ["OPEN", "ADDRESS_SET", "PAYMENT_PENDING"];

export function isOpen(status: CheckoutStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export interface CheckoutTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeTotals(input: {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxRate: number;
}): CheckoutTotals {
  const taxable = Math.max(0, input.subtotalCents - input.discountCents);
  const taxCents = Math.round(taxable * input.taxRate);
  return {
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    shippingCents: input.shippingCents,
    taxCents,
    totalCents: taxable + taxCents + input.shippingCents,
  };
}
