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

export const PlaceOrderSchema = z.object({ checkoutSessionId: z.string().uuid() });

export const ListOrdersQuerySchema = PaginationQuerySchema.extend({
  status: OrderStatusEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusEnum,
  note: z.string().trim().max(500).optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().trim().max(500).default("Cancelado por el cliente"),
});

export const ManualOrderSchema = z.object({
  customerEmail: z.string().trim().toLowerCase().email(),
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
  shippingCents: z.coerce.number().int().min(0).default(0),
  note: z.string().trim().max(500).optional(),
});

export type ManualOrderInput = z.infer<typeof ManualOrderSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
