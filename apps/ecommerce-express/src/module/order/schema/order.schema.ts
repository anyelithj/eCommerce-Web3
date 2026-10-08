// order.schema.ts => validación Zod del módulo Order.
import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";
import { ShippingAddressSnapshotSchema } from "../../checkout/schema/checkout.schema";

const OrderStatusEnum = z.enum([
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

// PlaceOrderSchema => POST /api/v1/order ("crear orden desde checkout confirmado")
export const PlaceOrderSchema = z.object({ checkoutSessionId: z.string().uuid() });

// ListOrdersQuerySchema => filtros por estado y rango de fechas
export const ListOrdersQuerySchema = PaginationQuerySchema.extend({
  status: OrderStatusEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// UpdateOrderStatusSchema => PATCH /api/v1/order/:id/status
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusEnum,
  note: z.string().trim().max(500).optional(),
});

// CancelOrderSchema => DELETE /api/v1/order/:id (motivo opcional para auditoría)
export const CancelOrderSchema = z.object({
  reason: z.string().trim().max(500).default("Cancelado por el cliente"),
});

// ManualOrderSchema => POST /api/v1/order/manual (ADMIN): venta asistida o pruebas sin pasar por Stripe.
// "z.object" (Zod) => contrato del body; ".min(1)" exige al menos un ítem; ".extend" reutiliza la dirección del
// checkout (DRY) y vuelve opcional la segunda línea.
export const ManualOrderSchema = z.object({
  customerEmail: z.string().trim().toLowerCase().email(), // Cliente existente al que se asigna el pedido
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive().max(999),
      })
    )
    .min(1)
    .max(50),
  shippingAddress: ShippingAddressSnapshotSchema.extend({
    line2: z.string().trim().nullable().default(null),
  }),
  shippingCents: z.coerce.number().int().min(0).default(0), // Costo de envío acordado (centavos)
  note: z.string().trim().max(500).optional(), // Queda en la bitácora de estados
});

export type ManualOrderInput = z.infer<typeof ManualOrderSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
