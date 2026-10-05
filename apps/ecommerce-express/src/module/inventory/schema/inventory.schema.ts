import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";
import { queryBoolean } from "../../../shared/pipe/transform.pipe";
import { Warehouses } from "../model/inventory.model";

const MAX_UNITS = 1_000_000;
const Reason = z.string().trim().min(3).max(200);

export const ListInventoryQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  lowStock: queryBoolean,
  threshold: z.coerce.number().int().min(0).max(MAX_UNITS).optional(),
});

export const StockAdjustSchema = z.object({
  stock: z.number().int().min(0).max(MAX_UNITS),
  reason: Reason,
});

export const MovementSchema = z
  .object({
    variantId: z.string().uuid(),
    type: z.enum(["IN", "OUT", "RETURN", "DAMAGE", "TRANSFER"]),
    quantity: z.number().int().min(1).max(MAX_UNITS),
    reason: Reason,
    reference: z.string().trim().max(100).optional(),
    warehouse: z.enum(Warehouses).default("MAIN"),
    toWarehouse: z.enum(Warehouses).optional(),
  })
  .refine((value) => value.type !== "TRANSFER" || (value.toWarehouse !== undefined && value.toWarehouse !== value.warehouse), {
    message: "TRANSFER requiere toWarehouse distinta de warehouse",
    path: ["toWarehouse"],
  });

export type ListInventoryQuery = z.infer<typeof ListInventoryQuerySchema>;
export type StockAdjustInput = z.infer<typeof StockAdjustSchema>;
export type MovementInput = z.infer<typeof MovementSchema>;
