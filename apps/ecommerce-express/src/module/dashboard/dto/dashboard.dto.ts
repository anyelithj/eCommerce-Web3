import type { WidgetType } from "../model/dashboard.model";
import type { MetricPointDto, ReportRowDto } from "../../analytics/service/analytics.service";

export interface WidgetDto {
  id: string | null;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface KpiDto {
  value: number;
  previous: number;
  change: number;
}

export interface KPIQueryDto {
  from: Date;
  to: Date;
  generatedAt: Date;
  kpis: {
    revenueCents: KpiDto;
    orders: KpiDto;
    aovCents: KpiDto;
    newCustomers: KpiDto;
    conversionRate: KpiDto;
  };
  operations: {
    activeOrders: number;
    pendingRefunds: number;
    lowStock: number;
  };
  series: MetricPointDto[];
  topProducts: ReportRowDto[];
}
