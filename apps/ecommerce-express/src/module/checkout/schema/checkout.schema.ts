// checkout.schema.ts => validación Zod del Checkout + contratos de los SNAPSHOTS JSON que guarda la sesión.
// Las columnas Json de Postgres no tienen tipo: al LEERLAS se validan con estos schemas (defensa en profundidad).
import { z } from "zod";

// InitCheckoutSchema => POST /api/v1/checkout ("iniciar sesión checkout con ítems del carrito")
export const InitCheckoutSchema = z.object({
  couponCode: z.string().trim().toUpperCase().optional(),
});

// UpdateCheckoutAddressSchema => PATCH /api/v1/checkout/:id/address ("seleccionar dirección de envío")
// couponCode: string => aplicar | null => quitar | ausente => sin cambios
export const UpdateCheckoutAddressSchema = z.object({
  addressId: z.string().uuid(),
  shippingRateCode: z.string().min(1),
  couponCode: z.string().trim().toUpperCase().nullable().optional(),
});

// CheckoutItemSnapshotSchema => ítem congelado al abrir el checkout (precio y datos del producto en ese instante)
export const CheckoutItemSnapshotSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  variantName: z.string(),
  sku: z.string(),
  imageUrl: z.string().nullable(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int().positive(),
  weightGrams: z.number().int(),
});
export const CheckoutItemsSchema = z.array(CheckoutItemSnapshotSchema);

// ShippingAddressSnapshotSchema => copia de la dirección elegida (la orden no cambia si el usuario edita su libreta)
export const ShippingAddressSnapshotSchema = z.object({
  recipientName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export type CheckoutItemSnapshot = z.infer<typeof CheckoutItemSnapshotSchema>;
export type ShippingAddressSnapshot = z.infer<typeof ShippingAddressSnapshotSchema>;
