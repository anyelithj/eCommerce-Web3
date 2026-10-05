import type { MovementType, StockLevel, Warehouse } from "../model/inventory.model";

export interface StockLevelDto extends StockLevel {
  low: boolean;
}

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

export interface ForecastDto {
  avgDailySales: number;
  daysOfCover: number | null;
  reorderQuantity: number;
}

export interface InventoryDetailDto extends StockLevelDto {
  movements: MovementDto[];
  forecast: ForecastDto;
}

export interface AdjustStockDto {
  level: StockLevelDto;
  movement: MovementDto;
}
