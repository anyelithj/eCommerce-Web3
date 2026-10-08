import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import {
  StockMovementModel,
  type MovementType,
  type StockLevel,
  type StockMovementRecord,
  type Warehouse,
} from "../model/inventory.model";
import type { MovementDto } from "../dto/inventory.dto";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";

type LevelRow = Omit<StockLevel, "stock" | "reserved" | "available"> & {
  stock: number;
  reserved: number;
  available: number;
  total?: bigint;
};
type StockRow = { stock: number; reserved: number };

export interface StockFilters {
  q?: string | undefined;
  lowOnly: boolean;
  threshold: number;
}

export type NewMovement = Pick<
  MovementDto,
  | "variantId"
  | "sku"
  | "type"
  | "delta"
  | "quantity"
  | "warehouse"
  | "toWarehouse"
  | "reason"
  | "reference"
  | "stockAfter"
  | "actorId"
>;

const LEVEL_COLUMNS = Prisma.sql`v.id AS "variantId", p.id AS "productId", p.name AS "productName", v.sku, v.name AS "variantName",
  v.stock, v."reservedStock" AS reserved, (v.stock - v."reservedStock") AS available`;

export class InventoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  public async findLevels(filters: StockFilters, page: PageParams): Promise<Paginated<StockLevel>> {
    const conditions = [Prisma.sql`p."archivedAt" IS NULL`];
    if (filters.q)
      conditions.push(
        Prisma.sql`(v.sku ILIKE ${`%${filters.q}%`} OR p.name ILIKE ${`%${filters.q}%`})`
      );
    if (filters.lowOnly)
      conditions.push(Prisma.sql`(v.stock - v."reservedStock") <= ${filters.threshold}`);
    const rows = await this.db.$queryRaw<LevelRow[]>`
      SELECT ${LEVEL_COLUMNS}, COUNT(*) OVER() AS total
      FROM product_variants v JOIN products p ON p.id = v."productId"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY available ASC, p.name ASC
      LIMIT ${page.limit} OFFSET ${page.skip}`;
    return { items: rows.map(toLevel), total: Number(rows[0]?.total ?? 0) };
  }

  public async findLevel(variantId: string): Promise<StockLevel | null> {
    const [row] = await this.db.$queryRaw<LevelRow[]>`
      SELECT ${LEVEL_COLUMNS} FROM product_variants v JOIN products p ON p.id = v."productId" WHERE v.id = ${variantId}`;
    return row ? toLevel(row) : null;
  }

  public async countLow(threshold: number): Promise<number> {
    const [row] = await this.db.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM product_variants v JOIN products p ON p.id = v."productId"
      WHERE p."archivedAt" IS NULL AND v."isActive" AND (v.stock - v."reservedStock") <= ${threshold}`;
    return Number(row?.n ?? 0);
  }

  public async applyDelta(variantId: string, delta: number): Promise<StockRow | null> {
    const [row] = await this.db.$queryRaw<StockRow[]>`
      UPDATE product_variants SET stock = stock + ${delta}, "updatedAt" = NOW()
      WHERE id = ${variantId} AND stock + ${delta} >= "reservedStock"
      RETURNING stock, "reservedStock" AS reserved`;
    return row ?? null;
  }

  public async setStock(
    variantId: string,
    stock: number
  ): Promise<(StockRow & { previous: number }) | null> {
    const [row] = await this.db.$queryRaw<Array<StockRow & { previous: number }>>`
      WITH old AS (SELECT id, stock FROM product_variants WHERE id = ${variantId} FOR UPDATE)
      UPDATE product_variants v SET stock = ${stock}, "updatedAt" = NOW() FROM old
      WHERE v.id = old.id AND ${stock} >= v."reservedStock"
      RETURNING v.stock, v."reservedStock" AS reserved, old.stock AS previous`;
    return row ?? null;
  }

  public async reserve(variantId: string, quantity: number): Promise<StockRow | null> {
    const [row] = await this.db.$queryRaw<StockRow[]>`
      UPDATE product_variants SET "reservedStock" = "reservedStock" + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${variantId} AND stock - "reservedStock" >= ${quantity}
      RETURNING stock, "reservedStock" AS reserved`;
    return row ?? null;
  }

  public async release(variantId: string, quantity: number): Promise<void> {
    await this.db.$executeRaw`
      UPDATE product_variants SET "reservedStock" = GREATEST("reservedStock" - ${quantity}, 0), "updatedAt" = NOW() WHERE id = ${variantId}`;
  }

  public async unitsSoldSince(variantId: string, since: Date): Promise<number> {
    const result = await this.db.orderItem.aggregate({
      _sum: { quantity: true },
      where: { variantId, order: { placedAt: { gte: since }, status: { not: "CANCELLED" } } },
    });
    return result._sum.quantity ?? 0;
  }

  public async createMovement(movement: NewMovement): Promise<MovementDto> {
    return toMovement(await StockMovementModel.create(movement));
  }

  public async findMovement(id: string): Promise<MovementDto | null> {
    const doc = await StockMovementModel.findById(id).lean();
    return doc ? toMovement(doc) : null;
  }

  public async markVoided(id: string, actorId: string | null): Promise<boolean> {
    const result = await StockMovementModel.updateOne(
      { _id: id, voidedAt: null },
      { $set: { voidedAt: new Date(), voidedBy: actorId } }
    );
    return result.modifiedCount === 1;
  }

  public async recentMovements(variantId: string, limit = 20): Promise<MovementDto[]> {
    return (
      await StockMovementModel.find({ variantId }).sort({ createdAt: -1 }).limit(limit).lean()
    ).map(toMovement);
  }
}

function toLevel(row: LevelRow): StockLevel {
  return {
    variantId: row.variantId,
    productId: row.productId,
    productName: row.productName,
    sku: row.sku,
    variantName: row.variantName,
    stock: Number(row.stock),
    reserved: Number(row.reserved),
    available: Number(row.available),
  };
}

function toMovement(
  doc: Partial<StockMovementRecord> & { _id: unknown; createdAt?: Date }
): MovementDto {
  return {
    id: String(doc._id),
    variantId: doc.variantId ?? "",
    sku: doc.sku ?? "",
    type: (doc.type ?? "ADJUSTMENT") as MovementType,
    delta: doc.delta ?? 0,
    quantity: doc.quantity ?? 0,
    warehouse: (doc.warehouse ?? "MAIN") as Warehouse,
    toWarehouse: (doc.toWarehouse ?? null) as Warehouse | null,
    reason: doc.reason ?? "",
    reference: doc.reference ?? null,
    stockAfter: doc.stockAfter ?? 0,
    actorId: doc.actorId ?? null,
    voidedAt: doc.voidedAt ?? null,
    createdAt: doc.createdAt ?? new Date(),
  };
}

export const inventoryRepository = new InventoryRepository();
