import { z } from "zod";

export const InitCheckoutSchema = z.object({
  couponCode: z.string().trim().toUpperCase().optional(),
});

export const UpdateCheckoutAddressSchema = z.object({
  addressId: z.string().uuid(),
  shippingRateCode: z.string().min(1),
  couponCode: z.string().trim().toUpperCase().nullable().optional(),
});

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
