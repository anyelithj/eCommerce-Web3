// inventory.service.ts => control de stock (sprint 7.2): niveles con alertas, ajuste manual por conteo físico,
// movimientos de entrada/salida/merma/devolución/traslado, anulación y pronóstico simple de agotamiento.
// Patrones: Command (cada movimiento con su inversa al anularse), Strategy (signo por tipo de movimiento: MOVEMENT_SIGN),
// Observer (publica inventory.adjusted / inventory.low) y Repository. PostgreSQL es la fuente de verdad del stock.
import {
  inventoryRepository,
  type InventoryRepository,
  type NewMovement,
} from "../repository/inventory.repository";
import {
  MOVEMENT_SIGN,
  type MovementType,
  type StockLevel,
  type Warehouse,
} from "../model/inventory.model";
import { inventoryEvents } from "../event/inventory.event";
import {
  InsufficientStockException,
  MovementAlreadyVoidedException,
  MovementNotFoundException,
  VariantNotFoundException,
} from "../exception/inventory.exception";
import type {
  AdjustStockDto,
  ForecastDto,
  InventoryDetailDto,
  MovementDto,
  StockLevelDto,
} from "../dto/inventory.dto";
import type {
  ListInventoryQuery,
  MovementInput,
  StockAdjustInput,
} from "../schema/inventory.schema";
import { appConfig } from "../../../config/app.config";
import { buildPaginationMeta, toPageParams } from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import { logger } from "../../../shared/middleware/logger.middleware";

const DAY_MS = 24 * 60 * 60 * 1000;
const FORECAST_WINDOW_DAYS = 30; // Ventana del promedio móvil de ventas
const LEAD_TIME_DAYS = 14; // Días de reposición asumidos + stock de seguridad (sin proveedor asignado a la variante)

// forecast => función PURA: promedio diario de 30 días -> días de cobertura y unidades sugeridas.
// ponytail: promedio móvil simple; el forecasting ML (FastAPI /ml/prediction) lo reemplaza si se necesita estacionalidad.
export function forecast(
  available: number,
  unitsSold: number,
  windowDays = FORECAST_WINDOW_DAYS,
  leadTimeDays = LEAD_TIME_DAYS
): ForecastDto {
  const avgDailySales = unitsSold / windowDays;
  if (avgDailySales === 0) return { avgDailySales: 0, daysOfCover: null, reorderQuantity: 0 };
  return {
    avgDailySales: Number(avgDailySales.toFixed(2)),
    daysOfCover: Math.floor(available / avgDailySales),
    // "Math.ceil" => se redondea hacia arriba: mejor sobrar una unidad que quedarse sin stock
    reorderQuantity: Math.max(0, Math.ceil(avgDailySales * leadTimeDays - available)),
  };
}

// MovementRequest => lo que necesita "move" (POST /movement y la saga MCP comparten este camino: DRY)
export interface MovementRequest {
  variantId: string;
  type: MovementType;
  delta: number;
  quantity: number;
  reason: string;
  reference?: string | undefined;
  warehouse?: Warehouse | undefined;
  toWarehouse?: Warehouse | undefined;
}

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly threshold = appConfig.LOW_STOCK_THRESHOLD
  ) {}

  // listInventorys => "stock por producto con alertas de nivel — fuente de verdad PostgreSQL"
  public async listInventorys(
    query: ListInventoryQuery
  ): Promise<{ items: StockLevelDto[]; meta: PaginationMeta }> {
    const page = toPageParams(query);
    const threshold = query.threshold ?? this.threshold;
    const { items, total } = await this.repository.findLevels(
      { q: query.q, lowOnly: query.lowStock ?? false, threshold },
      page
    );
    return {
      items: items.map((level) => this.withAlert(level, threshold)),
      meta: buildPaginationMeta(page, total),
    };
  }

  // getInventoryById => "disponibilidad y reservas del producto" + historial y pronóstico
  public async getInventoryById(variantId: string): Promise<InventoryDetailDto> {
    const level = await this.findLevel(variantId);
    const [movements, unitsSold] = await Promise.all([
      this.repository.recentMovements(variantId),
      this.repository.unitsSoldSince(
        variantId,
        new Date(Date.now() - FORECAST_WINDOW_DAYS * DAY_MS)
      ),
    ]);
    return { ...this.withAlert(level), movements, forecast: forecast(level.available, unitsSold) };
  }

  // updateInventory => "ajustar stock manualmente — PATCH parcial; Express = fuente de verdad" (conteo físico)
  public async updateInventory(
    variantId: string,
    input: StockAdjustInput,
    actorId: string | null
  ): Promise<AdjustStockDto> {
    const level = await this.findLevel(variantId);
    const result = await this.repository.setStock(variantId, input.stock);
    if (!result) throw new InsufficientStockException(level.reserved); // El conteo no puede quedar bajo lo reservado
    const delta = result.stock - result.previous;
    const movement = await this.record({
      variantId,
      sku: level.sku,
      type: "ADJUSTMENT",
      delta,
      quantity: Math.abs(delta),
      warehouse: "MAIN",
      toWarehouse: null,
      reason: input.reason,
      reference: null,
      stockAfter: result.stock,
      actorId,
    });
    return {
      level: this.publish(
        {
          ...level,
          stock: result.stock,
          reserved: result.reserved,
          available: result.stock - result.reserved,
        },
        "ADJUSTMENT",
        delta
      ),
      movement,
    };
  }

  // createStockMovement => "registrar movimiento de stock entrada/salida"
  public createStockMovement(
    input: MovementInput,
    actorId: string | null
  ): Promise<AdjustStockDto> {
    return this.move({ ...input, delta: MOVEMENT_SIGN[input.type] * input.quantity }, actorId);
  }

  // move => aplica el delta en PostgreSQL (guarda atómica) y registra el movimiento en MongoDB
  public async move(request: MovementRequest, actorId: string | null): Promise<AdjustStockDto> {
    const level = await this.findLevel(request.variantId);
    const result = await this.repository.applyDelta(request.variantId, request.delta);
    if (!result) throw new InsufficientStockException(level.available);
    const movement = await this.record({
      variantId: request.variantId,
      sku: level.sku,
      type: request.type,
      delta: request.delta,
      quantity: request.quantity,
      warehouse: request.warehouse ?? "MAIN",
      toWarehouse: request.toWarehouse ?? null,
      reason: request.reason,
      reference: request.reference ?? null,
      stockAfter: result.stock,
      actorId,
    }).catch(async (error: unknown) => {
      // Compensación: sin historial no queda rastro del cambio => se revierte el stock y se propaga el error
      await this.repository.applyDelta(request.variantId, -request.delta);
      throw error;
    });
    return {
      level: this.publish(
        {
          ...level,
          stock: result.stock,
          reserved: result.reserved,
          available: result.stock - result.reserved,
        },
        request.type,
        request.delta
      ),
      movement,
    };
  }

  // deleteStockMovementById => "anular movimiento de stock": aplica el delta inverso y marca el registro
  public async deleteStockMovementById(id: string, actorId: string | null): Promise<StockLevelDto> {
    const movement = await this.repository.findMovement(id);
    if (!movement) throw new MovementNotFoundException(id);
    if (movement.voidedAt) throw new MovementAlreadyVoidedException();
    if (!(await this.repository.markVoided(id, actorId)))
      throw new MovementAlreadyVoidedException(); // Carrera: otro lo anuló
    const level = await this.findLevel(movement.variantId);
    const result = await this.repository.applyDelta(movement.variantId, -movement.delta);
    if (!result) throw new InsufficientStockException(level.available);
    return this.publish(
      {
        ...level,
        stock: result.stock,
        reserved: result.reserved,
        available: result.stock - result.reserved,
      },
      movement.type,
      -movement.delta
    );
  }

  // reserve / release => apartados de la saga MCP (sin movimiento: reservar no cambia el stock físico)
  public async reserve(variantId: string, quantity: number): Promise<void> {
    const level = await this.findLevel(variantId);
    if (!(await this.repository.reserve(variantId, quantity)))
      throw new InsufficientStockException(level.available);
  }

  public release(variantId: string, quantity: number): Promise<void> {
    return this.repository.release(variantId, quantity);
  }

  // countLowStock => KPI del dashboard
  public countLowStock(): Promise<number> {
    return this.repository.countLow(this.threshold);
  }

  private async findLevel(variantId: string): Promise<StockLevel> {
    const level = await this.repository.findLevel(variantId);
    if (!level) throw new VariantNotFoundException(variantId);
    return level;
  }

  private record(movement: NewMovement): Promise<MovementDto> {
    return this.repository.createMovement(movement).catch((error: unknown) => {
      logger.error("inventory_movement_log_failed", { variantId: movement.variantId, error });
      throw error;
    });
  }

  // withAlert => agrega la bandera de stock bajo (AlertDto embebido)
  private withAlert(level: StockLevel, threshold = this.threshold): StockLevelDto {
    return { ...level, low: level.available <= threshold };
  }

  // publish => Observer: avisa del cambio y, si cruzó el umbral, de la alerta de stock bajo
  private publish(level: StockLevel, movementType: MovementType, delta: number): StockLevelDto {
    inventoryEvents.emit("inventory.adjusted", { ...level, movementType, delta });
    if (level.available <= this.threshold)
      inventoryEvents.emit("inventory.low", { ...level, threshold: this.threshold });
    return this.withAlert(level);
  }
}

export const inventoryService = new InventoryService(inventoryRepository);
