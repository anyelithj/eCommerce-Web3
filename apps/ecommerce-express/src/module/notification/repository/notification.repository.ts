import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { NotificationModel, type NotificationChannel, type NotificationType } from "../model/notification.model";
import type { NotificationPreferencesDto } from "../dto/notification.dto";
import type { Locale } from "../../../shared/util/i18n.util";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: {
    userId: string;
    type: NotificationType;
    messageKey: string | null;
    params: unknown;
    title: string;
    body: string;
    url?: string | undefined;
    data?: Record<string, unknown> | undefined;
    channels: NotificationChannel[];
  }): Promise<NotificationRow> {
    const doc = await NotificationModel.create({ ...input, url: input.url ?? null, data: input.data ?? {} });
    return toRow(doc);
  }

  public async findMany(userId: string, unreadOnly: boolean, page: PageParams): Promise<Paginated<NotificationRow>> {
    const filter = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [docs, total] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
      NotificationModel.countDocuments(filter),
    ]);
    return { items: docs.map(toRow), total };
  }

  public async unreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, readAt: null });
  }

  public async markRead(id: string, userId: string): Promise<NotificationRow | null> {
    const doc = await NotificationModel.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true }).lean();
    return doc ? toRow(doc) : null;
  }

  public async markAllRead(userId: string): Promise<number> {
    return (await NotificationModel.updateMany({ userId, readAt: null }, { readAt: new Date() })).modifiedCount;
  }

  public async delete(id: string, userId: string): Promise<boolean> {
    return (await NotificationModel.deleteOne({ _id: id, userId })).deletedCount > 0;
  }

  public async clear(userId: string): Promise<number> {
    return (await NotificationModel.deleteMany({ userId })).deletedCount;
  }

  public async preferences(userId: string): Promise<NotificationPreferencesDto> {
    const row = await this.prisma.notificationPreference.upsert({ where: { userId }, update: {}, create: { userId } });
    return { email: row.email, push: row.push, inApp: row.inApp, marketing: row.marketing };
  }

  public async updatePreferences(userId: string, changes: Partial<NotificationPreferencesDto>): Promise<NotificationPreferencesDto> {
    const row = await this.prisma.notificationPreference.upsert({ where: { userId }, update: changes, create: { userId, ...changes } });
    return { email: row.email, push: row.push, inApp: row.inApp, marketing: row.marketing };
  }

  public async recipient(userId: string): Promise<{ email: string; firstName: string; isActive: boolean; locale: Locale } | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, isActive: true, locale: true } });
    return row ? { ...row, locale: row.locale === "en" ? "en" : "es" } : null;
  }

  public async pushTokens(userId: string): Promise<string[]> {
    return (await this.prisma.pushToken.findMany({ where: { userId }, select: { token: true } })).map((row) => row.token);
  }

  public async savePushToken(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.pushToken.upsert({ where: { token }, update: { userId, platform }, create: { userId, token, platform } });
  }

  public async deletePushTokens(tokens: string[]): Promise<void> {
    if (tokens.length > 0) await this.prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
  }
}

export interface NotificationRow {
  id: string;
  type: NotificationType;
  messageKey: string | null;
  params: unknown;
  title: string;
  body: string;
  url: string | null;
  readAt: Date | null;
  createdAt: Date;
}

function toRow(doc: { _id: unknown; type: string; messageKey?: string | null; params?: unknown; title: string; body: string; url?: string | null; readAt?: Date | null; createdAt?: Date }): NotificationRow {
  return {
    id: String(doc._id),
    type: doc.type as NotificationType,
    messageKey: doc.messageKey ?? null,
    params: doc.params ?? {},
    title: doc.title,
    body: doc.body,
    url: doc.url ?? null,
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt ?? new Date(),
  };
}

export const notificationRepository = new NotificationRepository(prisma);
