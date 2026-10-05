import { Schema, model, type InferSchemaType } from "mongoose";

export const MovementTypes = ["IN", "OUT", "RETURN", "DAMAGE", "ADJUSTMENT", "TRANSFER"] as const;
export type MovementType = (typeof MovementTypes)[number];

export const Warehouses = ["MAIN", "STORE", "CONSIGNMENT"] as const;
export type Warehouse = (typeof Warehouses)[number];

export const MOVEMENT_SIGN: Record<Exclude<MovementType, "ADJUSTMENT">, -1 | 0 | 1> = { IN: 1, RETURN: 1, OUT: -1, DAMAGE: -1, TRANSFER: 0 };

export interface StockLevel {
  readonly variantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly variantName: string;
  readonly stock: number;
  readonly reserved: number;
  readonly available: number;
}

const RETENTION_SECONDS = 3 * 365 * 24 * 60 * 60;

const stockMovementSchema = new Schema(
  {
    variantId: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: MovementTypes, required: true },
    delta: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 0 },
    warehouse: { type: String, enum: Warehouses, default: "MAIN" },
    toWarehouse: { type: String, enum: [...Warehouses, null], default: null },
    reason: { type: String, required: true, maxlength: 200 },
    reference: { type: String, default: null, maxlength: 100 },
    stockAfter: { type: Number, required: true },
    actorId: { type: String, default: null },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
stockMovementSchema.index({ variantId: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export type StockMovementRecord = InferSchemaType<typeof stockMovementSchema>;
export const StockMovementModel = model("StockMovement", stockMovementSchema);
