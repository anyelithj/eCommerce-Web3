// inventory.model.ts => entidad Inventory: el stock vive en PostgreSQL (product_variants.stock / reservedStock, fuente
// de verdad transaccional) y el HISTORIAL de movimientos en MongoDB (StockMovement: alto volumen, sin JOINs, auditable).
// Separación (matriz): Express = fuente de verdad PostgreSQL · Rust (Fase 9) = caché DashMap < 10 ms.
import { Schema, model, type InferSchemaType } from "mongoose";

// Tipos de movimiento (patrón Command: cada movimiento es una orden con su signo y su inversa al anularse)
export const MovementTypes = ["IN", "OUT", "RETURN", "DAMAGE", "ADJUSTMENT", "TRANSFER"] as const;
export type MovementType = (typeof MovementTypes)[number];

// Bodegas de la matriz: principal, tienda física y consignación.
// ponytail: el stock total es uno solo por variante; la bodega queda como etiqueta del movimiento.
// Saldos por bodega => tabla stock_by_warehouse cuando haya más de una bodega física real.
export const Warehouses = ["MAIN", "STORE", "CONSIGNMENT"] as const;
export type Warehouse = (typeof Warehouses)[number];

// MOVEMENT_SIGN => signo que cada tipo aplica al stock (TRANSFER mueve entre bodegas: el total no cambia).
// ADJUSTMENT no está: su delta lo calcula el ajuste manual (stock nuevo - stock anterior).
export const MOVEMENT_SIGN: Record<Exclude<MovementType, "ADJUSTMENT">, -1 | 0 | 1> = {
  IN: 1,
  RETURN: 1,
  OUT: -1,
  DAMAGE: -1,
  TRANSFER: 0,
};

// StockLevel => foto del stock de una variante (Value Object inmutable que viaja en DTOs y eventos)
export interface StockLevel {
  readonly variantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly variantName: string;
  readonly stock: number; // Unidades físicas
  readonly reserved: number; // Apartadas por checkouts abiertos
  readonly available: number; // stock - reserved (lo que se puede vender)
}

const RETENTION_SECONDS = 3 * 365 * 24 * 60 * 60; // 3 años de historial (auditoría de inventario); luego TTL

const stockMovementSchema = new Schema(
  {
    variantId: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: MovementTypes, required: true },
    delta: { type: Number, required: true }, // Cambio aplicado al stock (+ entra, - sale, 0 traslado)
    quantity: { type: Number, required: true, min: 0 }, // Unidades del movimiento (siempre positivas)
    warehouse: { type: String, enum: Warehouses, default: "MAIN" },
    toWarehouse: { type: String, enum: [...Warehouses, null], default: null }, // Solo TRANSFER
    reason: { type: String, required: true, maxlength: 200 },
    reference: { type: String, default: null, maxlength: 100 }, // Orden de compra, guía, ID de saga...
    stockAfter: { type: Number, required: true }, // Stock resultante (trazabilidad sin recalcular)
    actorId: { type: String, default: null },
    voidedAt: { type: Date, default: null }, // Anulado (DELETE): el registro se conserva para auditoría
    voidedBy: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
stockMovementSchema.index({ variantId: 1, createdAt: -1 }); // Historial de una variante, más reciente primero
stockMovementSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS }); // TTL

export type StockMovementRecord = InferSchemaType<typeof stockMovementSchema>;
export const StockMovementModel = model("StockMovement", stockMovementSchema);
