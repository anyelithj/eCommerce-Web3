import { prisma } from "../../../config/database.config";

export interface MetricPointDto {
  period: string;
  orders: number;
  revenueCents: number;
}

export interface ReportRowDto {
  key: string;
  label: string;
  units: number;
  revenueCents: number;
}

export type Granularity = "day" | "week" | "month";

const SOLD = { not: "CANCELLED" } as const;

export function resolveRange(range: { from: Date; to?: Date | undefined }): { from: Date; to: Date } {
  return { from: range.from, to: range.to ?? new Date() };
}

export const periodKey = (date: Date): string => date.toISOString().slice(0, 10);

export const analyticsService = {
  async salesTotals(from: Date, to: Date): Promise<{ orders: number; revenueCents: number }> {
    const result = await prisma.order.aggregate({
      where: { placedAt: { gte: from, lt: to }, status: SOLD },
      _count: { _all: true },
      _sum: { totalCents: true },
    });
    return { orders: result._count._all, revenueCents: result._sum.totalCents ?? 0 };
  },

  async conversion(from: Date, to: Date): Promise<number> {
    const range = { gte: from, lt: to };
    const [orders, checkouts] = await Promise.all([
      prisma.order.count({ where: { placedAt: range, status: SOLD } }),
      prisma.checkoutSession.count({ where: { createdAt: range } }),
    ]);
    return checkouts > 0 ? Number((orders / checkouts).toFixed(4)) : 0;
  },

  async salesSeries(from: Date, to: Date, granularity: Granularity): Promise<MetricPointDto[]> {
    const rows = await prisma.$queryRaw<Array<{ period: Date; orders: bigint; revenue: bigint | null }>>`
      SELECT date_trunc(${granularity}, "placedAt") AS period, COUNT(*) AS orders, SUM("totalCents") AS revenue
      FROM orders
      WHERE "placedAt" >= ${from} AND "placedAt" < ${to} AND status <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1`;
    return rows.map((row) => ({ period: row.period.toISOString(), orders: Number(row.orders), revenueCents: Number(row.revenue ?? 0) }));
  },

  async listAnalyticReports(query: { dimension: "product"; from: Date; to: Date; limit: number }): Promise<{ rows: ReportRowDto[] }> {
    const groups = await prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { productId: { not: null }, order: { placedAt: { gte: query.from, lt: query.to }, status: SOLD } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { totalCents: "desc" } },
      take: query.limit,
    });
    return {
      rows: groups.map((group) => ({
        key: group.productId ?? "",
        label: group.productName,
        units: group._sum.quantity ?? 0,
        revenueCents: group._sum.totalCents ?? 0,
      })),
    };
  },
};
