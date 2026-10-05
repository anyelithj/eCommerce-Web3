import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { DashboardWidgetModel, type WidgetRecord, type WidgetType } from "../model/dashboard.model";
import type { WidgetDto } from "../dto/dashboard.dto";
import { Roles } from "../../../shared/constants/roles.constants";

export type WidgetWrite = Partial<Omit<WidgetDto, "id">>;

export class DashboardRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  public async findWidgets(userId: string): Promise<WidgetDto[]> {
    return (await DashboardWidgetModel.find({ userId }).sort({ "position.y": 1, "position.x": 1 }).lean()).map(toWidget);
  }

  public countWidgets(userId: string): Promise<number> {
    return DashboardWidgetModel.countDocuments({ userId });
  }

  public async createWidget(userId: string, data: Omit<WidgetDto, "id">): Promise<WidgetDto> {
    return toWidget((await DashboardWidgetModel.create({ ...data, userId })).toObject());
  }

  public async updateWidget(id: string, userId: string, changes: WidgetWrite): Promise<WidgetDto | null> {
    const doc = await DashboardWidgetModel.findOneAndUpdate({ _id: id, userId }, { $set: changes }, { new: true }).lean();
    return doc ? toWidget(doc) : null;
  }

  public async deleteWidget(id: string, userId: string): Promise<boolean> {
    return (await DashboardWidgetModel.deleteOne({ _id: id, userId })).deletedCount === 1;
  }

  public countActiveOrders(): Promise<number> {
    return this.db.order.count({ where: { status: { in: ["CONFIRMED", "PREPARING", "PACKED", "SHIPPED"] } } });
  }

  public countPendingRefunds(): Promise<number> {
    return this.db.refund.count({ where: { status: "REQUESTED" } });
  }

  public countNewCustomers(from: Date, to: Date): Promise<number> {
    return this.db.user.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null, roles: { some: { role: { name: Roles.CUSTOMER } } } } });
  }
}

function toWidget(doc: Partial<WidgetRecord> & { _id: unknown }): WidgetDto {
  const position = doc.position ?? { x: 0, y: 0, w: 3, h: 1 };
  return {
    id: String(doc._id),
    type: (doc.type ?? "KPI") as WidgetType,
    title: doc.title ?? "",
    position: { x: position.x ?? 0, y: position.y ?? 0, w: position.w ?? 3, h: position.h ?? 1 },
    config: (doc.config ?? {}) as Record<string, unknown>,
  };
}

export const dashboardRepository = new DashboardRepository();
