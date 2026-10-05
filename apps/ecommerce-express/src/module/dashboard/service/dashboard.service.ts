import { dashboardRepository, type DashboardRepository, type WidgetWrite } from "../repository/dashboard.repository";
import { DEFAULT_LAYOUT, MAX_WIDGETS_PER_USER } from "../model/dashboard.model";
import { WidgetLimitException, WidgetNotFoundException } from "../exception/dashboard.exception";
import type { KPIQueryDto, KpiDto, WidgetDto } from "../dto/dashboard.dto";
import type { KPIQuery, UpdateWidgetInput, WidgetInput } from "../schema/dashboard.schema";
import { analyticsService, periodKey, resolveRange } from "../../analytics/service/analytics.service";
import { inventoryService } from "../../inventory/service/inventory.service";
import { cached } from "../../../shared/interceptor/cache.interceptor";
import { RedisKeys } from "../../../config/redis.config";

const KPI_TTL_SECONDS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export function kpi(value: number, previous: number): KpiDto {
  return { value, previous, change: previous > 0 ? Number(((value - previous) / previous).toFixed(4)) : 0 };
}

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  public async listDashboardConfigs(userId: string): Promise<WidgetDto[]> {
    const widgets = await this.repository.findWidgets(userId);
    return widgets.length > 0 ? widgets : DEFAULT_LAYOUT.map((widget) => ({ ...widget, id: null, config: { ...widget.config } }));
  }

  public listDashboardKPIs(query: KPIQuery): Promise<KPIQueryDto> {
    const { from, to } = resolveRange({ from: query.from ?? new Date(Date.now() - 7 * DAY_MS), to: query.to });
    const load = () => this.computeKpis(from, to);
    return query.realtime ? load() : cached(RedisKeys.report("kpi", `${periodKey(from)}:${Math.floor(to.getTime() / 60_000)}`), KPI_TTL_SECONDS, load);
  }

  public async createDashboardWidget(userId: string, input: WidgetInput): Promise<WidgetDto> {
    const count = await this.repository.countWidgets(userId);
    if (count >= MAX_WIDGETS_PER_USER) throw new WidgetLimitException(MAX_WIDGETS_PER_USER);
    if (count === 0) await Promise.all(DEFAULT_LAYOUT.map((widget) => this.repository.createWidget(userId, { ...widget, config: { ...widget.config } })));
    return this.repository.createWidget(userId, input);
  }

  public async updateDashboardWidget(id: string, userId: string, input: UpdateWidgetInput): Promise<WidgetDto> {
    const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as WidgetWrite;
    const updated = await this.repository.updateWidget(id, userId, changes);
    if (!updated) throw new WidgetNotFoundException(id);
    return updated;
  }

  public async deleteDashboardWidgetById(id: string, userId: string): Promise<void> {
    if (!(await this.repository.deleteWidget(id, userId))) throw new WidgetNotFoundException(id);
  }

  private async computeKpis(from: Date, to: Date): Promise<KPIQueryDto> {
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);
    const prevTo = from;
    const [sales, prevSales, newCustomers, prevNewCustomers, conversion, prevConversion, activeOrders, pendingRefunds, lowStock, series, top] = await Promise.all([
      analyticsService.salesTotals(from, to),
      analyticsService.salesTotals(prevFrom, prevTo),
      this.repository.countNewCustomers(from, to),
      this.repository.countNewCustomers(prevFrom, prevTo),
      analyticsService.conversion(from, to),
      analyticsService.conversion(prevFrom, prevTo),
      this.repository.countActiveOrders(),
      this.repository.countPendingRefunds(),
      inventoryService.countLowStock(),
      analyticsService.salesSeries(from, to, span > 92 * DAY_MS ? "month" : span > 31 * DAY_MS ? "week" : "day"),
      analyticsService.listAnalyticReports({ dimension: "product", from, to, limit: 5 }),
    ]);
    const aov = (totals: { orders: number; revenueCents: number }) => (totals.orders > 0 ? Math.round(totals.revenueCents / totals.orders) : 0);
    return {
      from,
      to,
      generatedAt: new Date(),
      kpis: {
        revenueCents: kpi(sales.revenueCents, prevSales.revenueCents),
        orders: kpi(sales.orders, prevSales.orders),
        aovCents: kpi(aov(sales), aov(prevSales)),
        newCustomers: kpi(newCustomers, prevNewCustomers),
        conversionRate: kpi(conversion, prevConversion),
      },
      operations: { activeOrders, pendingRefunds, lowStock },
      series,
      topProducts: top.rows,
    };
  }
}

export const dashboardService = new DashboardService(dashboardRepository);
