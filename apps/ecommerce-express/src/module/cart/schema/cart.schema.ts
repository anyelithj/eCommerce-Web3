// cart.schema.ts => validación Zod del módulo Cart.
import { z } from "zod";

const MAX_QUANTITY_PER_LINE = 99; // Tope por línea: evita pedidos absurdos y agotamiento de inventario por error

// AddCartItemSchema => POST /api/v1/cart/item ("agregar producto al carrito con validación de stock")
export const AddCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).default(1),
});

// UpdateCartItemSchema => PATCH /api/v1/cart/item/:id ("cambiar cantidad del ítem")
export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
