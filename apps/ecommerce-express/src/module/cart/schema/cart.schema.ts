import { z } from "zod";

const MAX_QUANTITY_PER_LINE = 99;

export const AddCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
