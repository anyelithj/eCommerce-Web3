// inventory.dto.ts => contratos de salida del módulo Inventory (AdjustStockDto, MovementDto, AlertDto).
import type { MovementType, StockLevel, Warehouse } from "../model/inventory.model";

// StockLevelDto => fila del listado: nivel de stock + alerta de stock bajo (AlertDto embebido)
export interface StockLevelDto extends StockLevel {
  low: boolean;
}

// MovementDto => un movimiento del historial (MongoDB)
export interface MovementDto {
  id: string;
  variantId: string;
  sku: string;
  type: MovementType;
  delta: number;
  quantity: number;
  warehouse: Warehouse;
  toWarehouse: Warehouse | null;
  reason: string;
  reference: string | null;
  stockAfter: number;
  actorId: string | null;
  voidedAt: Date | null;
  createdAt: Date;
}

// ForecastDto => "predicción de cuándo se agotará" y sugerencia de reabastecimiento (promedio móvil de 30 días)
export interface ForecastDto {
  avgDailySales: number;
  daysOfCover: number | null; // null => sin ventas recientes (no se puede estimar)
  reorderQuantity: number; // Unidades sugeridas para cubrir el tiempo de reposición + stock de seguridad
}

// InventoryDetailDto => GET /inventory/:id: disponibilidad, reservas, historial y pronóstico
export interface InventoryDetailDto extends StockLevelDto {
  movements: MovementDto[];
  forecast: ForecastDto;
}

// AdjustStockDto => resultado de un ajuste o movimiento: nivel nuevo + el movimiento registrado
export interface AdjustStockDto {
  level: StockLevelDto;
  movement: MovementDto;
}
