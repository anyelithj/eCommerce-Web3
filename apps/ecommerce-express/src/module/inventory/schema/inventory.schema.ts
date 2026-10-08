// inventory.schema.ts => validación Zod del módulo Inventory (StockAdjustSchema, MovementSchema, filtros).
import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";
import { queryBoolean } from "../../../shared/pipe/transform.pipe";
import { Warehouses } from "../model/inventory.model";

const MAX_UNITS = 1_000_000; // Tope de sanidad: evita errores de dedo (un cero de más) en ajustes manuales
const Reason = z.string().trim().min(3).max(200);

// ListInventoryQuerySchema => GET /inventory?q=&lowStock=true&threshold=&page=
export const ListInventoryQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(), // SKU o nombre del producto
  lowStock: queryBoolean, // Solo variantes en alerta
  threshold: z.coerce.number().int().min(0).max(MAX_UNITS).optional(), // Sin valor => LOW_STOCK_THRESHOLD
});

// StockAdjustSchema => PATCH /inventory/:id: stock ABSOLUTO contado en el conteo físico + motivo (corrección)
export const StockAdjustSchema = z.object({
  stock: z.number().int().min(0).max(MAX_UNITS),
  reason: Reason,
});

// MovementSchema => POST /inventory/movement: entrada/salida/devolución/merma/traslado
export const MovementSchema = z
  .object({
    variantId: z.string().uuid(),
    type: z.enum(["IN", "OUT", "RETURN", "DAMAGE", "TRANSFER"]), // ADJUSTMENT solo por PATCH (stock absoluto)
    quantity: z.number().int().min(1).max(MAX_UNITS),
    reason: Reason,
    reference: z.string().trim().max(100).optional(),
    warehouse: z.enum(Warehouses).default("MAIN"),
    toWarehouse: z.enum(Warehouses).optional(),
  })
  // Regla cruzada: un traslado necesita bodega destino distinta de la de origen
  .refine(
    (value) =>
      value.type !== "TRANSFER" ||
      (value.toWarehouse !== undefined && value.toWarehouse !== value.warehouse),
    {
      message: "TRANSFER requiere toWarehouse distinta de warehouse",
      path: ["toWarehouse"],
    }
  );

export type ListInventoryQuery = z.infer<typeof ListInventoryQuerySchema>;
export type StockAdjustInput = z.infer<typeof StockAdjustSchema>;
export type MovementInput = z.infer<typeof MovementSchema>;
