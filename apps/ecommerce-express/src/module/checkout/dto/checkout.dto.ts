// checkout.dto.ts => contrato de salida de la sesión de checkout (lo consume el CheckoutStepper de Next.js).
import type { CheckoutStatus } from "@prisma/client";
import type { CheckoutItemSnapshot, ShippingAddressSnapshot } from "../schema/checkout.schema";

// Tarifa de envío ofrecida en el paso de envío
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
  orderId: string | null; // Presente cuando el pago se confirmó y el pedido ya existe
  // Tarifas disponibles para el destino elegido (el paso de envío muestra las opciones)
  shippingRates?: ShippingRateDto[] | undefined;
}
