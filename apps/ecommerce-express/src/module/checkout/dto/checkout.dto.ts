import type { CheckoutStatus } from "@prisma/client";
import type { CheckoutItemSnapshot, ShippingAddressSnapshot } from "../schema/checkout.schema";

export interface ShippingRateDto {
  code: string;
  label: string;
  costCents: number;
}

export interface CheckoutSessionDto {
  id: string;
  status: CheckoutStatus;
  currency: string;
  items: CheckoutItemSnapshot[];
  addressId: string | null;
  shippingAddress: ShippingAddressSnapshot | null;
  shippingRateCode: string | null;
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt: Date;
  orderId: string | null;
  shippingRates?: ShippingRateDto[] | undefined;
}
