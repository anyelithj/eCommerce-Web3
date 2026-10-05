import axios, { AxiosError } from "axios";
import jwt from "jsonwebtoken";
import { notificationRepository, type NotificationRepository, type NotificationRow } from "../repository/notification.repository";
import { NotificationNotFoundException } from "../exception/notification.exception";
import type { NotificationChannel, NotificationType } from "../model/notification.model";
import type { NotificationDto, NotificationPreferencesDto, NotifyInput } from "../dto/notification.dto";
import { renderNotification, renderStoredNotification, type NotificationKey, type NotificationParams, type RenderedNotification } from "../../../shared/constants/messages.constants";
import { localizedPath, type Locale } from "../../../shared/util/i18n.util";
import { emailService } from "../../email/service/email.service";
import { EmailTemplates } from "../../email/util/template.util";
import { TypedEventBus } from "../../../shared/util/event-bus.util";
import { appConfig } from "../../../config/app.config";
import { buildPaginationMeta, toPageParams, type PaginationQuery } from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import { logger } from "../../../shared/middleware/logger.middleware";
import type { PartialUpdate } from "../../../shared/types/common.types";

interface Delivery {
  userId: string;
  email: string;
  locale: Locale;
  text: RenderedNotification;
  input: NotifyInput;
  saved: NotificationDto | null;
}

const renderKeyed = <K extends NotificationKey>(message: { key: K; params: NotificationParams[K] }, locale: Locale) =>
  renderNotification(locale, message.key, message.params);

function render(message: NotifyInput["message"], locale: Locale): RenderedNotification {
  return "key" in message ? renderKeyed(message, locale) : message;
}

export function present(row: NotificationRow, locale: Locale): NotificationDto {
  const text = renderStoredNotification(locale, row.messageKey, row.params) ?? { title: row.title, body: row.body };
  return { id: row.id, type: row.type, title: text.title, body: text.body, url: row.url, read: Boolean(row.readAt), createdAt: row.createdAt };
}

const deepLink = (delivery: Delivery): string | undefined =>
  delivery.input.url ? `${appConfig.FRONTEND_URL}${localizedPath(delivery.locale, delivery.input.url)}` : undefined;

interface ChannelStrategy {
  send(delivery: Delivery): Promise<void>;
}

export const liveNotifications = new TypedEventBus<{ "notification.created": { userId: string; notification: NotificationDto } }>(
  "notification-live"
);

class InAppChannel implements ChannelStrategy {
  public async send(delivery: Delivery): Promise<void> {
    if (delivery.saved) liveNotifications.emit("notification.created", { userId: delivery.userId, notification: delivery.saved });
  }
}

class EmailChannel implements ChannelStrategy {
  public async send(delivery: Delivery): Promise<void> {
    await emailService.send(delivery.email, EmailTemplates.notification(delivery.locale, { ...delivery.text, url: deepLink(delivery) }));
  }
}

class PushChannel implements ChannelStrategy {
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly repository: NotificationRepository) {}

  public async send(delivery: Delivery): Promise<void> {
    const tokens = await this.repository.pushTokens(delivery.userId);
    if (tokens.length === 0) return;
    await this.repository.deletePushTokens(await this.sendFcm(tokens, delivery));
  }

  private async sendFcm(tokens: string[], delivery: Delivery): Promise<string[]> {
    const { FCM_PROJECT_ID } = appConfig;
    if (!FCM_PROJECT_ID || tokens.length === 0) return [];

    const accessToken = await this.accessToken();
    const invalid: string[] = [];
    await Promise.all(
      tokens.map(async (token) => {
        try {
          await axios.post(
            `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
            {
              message: {
                token,
                notification: { title: delivery.text.title, body: delivery.text.body },
                webpush: delivery.input.url ? { fcm_options: { link: deepLink(delivery) } } : undefined,
              },
            },
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 5000 }
          );
        } catch (error) {
          if (error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 400)) invalid.push(token);
        }
      })
    );
    return invalid;
  }

  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) return this.cachedToken.value;
    const privateKey = (appConfig.FCM_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
    const assertion = jwt.sign(
      { scope: "https://www.googleapis.com/auth/firebase.messaging" },
      privateKey,
      { algorithm: "RS256", issuer: appConfig.FCM_CLIENT_EMAIL, audience: "https://oauth2.googleapis.com/token", expiresIn: "1h" }
    );
    const { data } = await axios.post<{ access_token: string; expires_in: number }>(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
    );
    this.cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }
}

const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  ORDER: ["IN_APP", "EMAIL", "PUSH"],
  PAYMENT: ["IN_APP", "EMAIL"],
  SHIPPING: ["IN_APP", "EMAIL", "PUSH"],
  REFUND: ["IN_APP", "EMAIL"],
  REVIEW: ["IN_APP"],
  LOYALTY: ["IN_APP", "PUSH"],
  SECURITY: ["IN_APP", "EMAIL"],
  PROMOTION: ["IN_APP", "EMAIL", "PUSH"],
  SYSTEM: ["IN_APP"],
};

export class NotificationService {
  private readonly channels: Record<NotificationChannel, ChannelStrategy>;

  constructor(private readonly repository: NotificationRepository) {
    this.channels = { IN_APP: new InAppChannel(), EMAIL: new EmailChannel(), PUSH: new PushChannel(repository) };
  }

  public async notify(userId: string, input: NotifyInput): Promise<void> {
    const recipient = await this.repository.recipient(userId);
    if (!recipient?.isActive) return;

    const prefs = await this.repository.preferences(userId);
    const channels = this.resolveChannels(input.type, input.channels ?? DEFAULT_CHANNELS[input.type], prefs);
    if (channels.length === 0) return;

    const text = render(input.message, recipient.locale);
    const saved = channels.includes("IN_APP") ? present(await this.saveInApp(userId, input, text, channels), recipient.locale) : null;
    const delivery = { userId, email: recipient.email, locale: recipient.locale, text, input, saved };
    const results = await Promise.allSettled(channels.map((channel) => this.channels[channel].send(delivery)));
    results.forEach((result, index) => {
      if (result.status === "rejected") logger.warn("notification_channel_failed", { channel: channels[index], userId, reason: String(result.reason) });
    });
  }

  private saveInApp(userId: string, input: NotifyInput, text: RenderedNotification, channels: NotificationChannel[]): Promise<NotificationRow> {
    const keyed = "key" in input.message ? input.message : null;
    return this.repository.create({ userId, type: input.type, messageKey: keyed?.key ?? null, params: keyed?.params ?? {}, ...text, url: input.url, data: input.data, channels });
  }

  public async broadcast(userIds: string[], input: NotifyInput): Promise<{ queued: number }> {
    for (let index = 0; index < userIds.length; index += 50) {
      await Promise.all(userIds.slice(index, index + 50).map((userId) => this.notify(userId, input)));
    }
    return { queued: userIds.length };
  }

  public async listNotifications(userId: string, query: PaginationQuery & { unread?: boolean | undefined }, locale: Locale): Promise<{ items: NotificationDto[]; meta: PaginationMeta; unreadCount: number }> {
    const page = toPageParams(query);
    const [{ items, total }, unreadCount] = await Promise.all([
      this.repository.findMany(userId, query.unread ?? false, page),
      this.repository.unreadCount(userId),
    ]);
    return { items: items.map((row) => present(row, locale)), meta: buildPaginationMeta(page, total), unreadCount };
  }

  public async unreadCount(userId: string): Promise<number> {
    return this.repository.unreadCount(userId);
  }

  public async markRead(id: string, userId: string, locale: Locale): Promise<NotificationDto> {
    const updated = await this.repository.markRead(id, userId);
    if (!updated) throw new NotificationNotFoundException(id);
    return present(updated, locale);
  }

  public async markAllRead(userId: string): Promise<{ updated: number }> {
    return { updated: await this.repository.markAllRead(userId) };
  }

  public async deleteNotification(id: string, userId: string): Promise<void> {
    if (!(await this.repository.delete(id, userId))) throw new NotificationNotFoundException(id);
  }

  public async clearInbox(userId: string): Promise<{ deleted: number }> {
    return { deleted: await this.repository.clear(userId) };
  }

  public async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    return this.repository.preferences(userId);
  }

  public async updatePreferences(userId: string, changes: PartialUpdate<NotificationPreferencesDto>): Promise<NotificationPreferencesDto> {
    const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as Partial<NotificationPreferencesDto>;
    return this.repository.updatePreferences(userId, defined);
  }

  public async registerPushToken(userId: string, token: string, platform: string): Promise<void> {
    await this.repository.savePushToken(userId, token, platform);
  }

  public async removePushToken(token: string): Promise<void> {
    await this.repository.deletePushTokens([token]);
  }

  private resolveChannels(type: NotificationType, requested: NotificationChannel[], prefs: NotificationPreferencesDto): NotificationChannel[] {
    if (type === "PROMOTION" && !prefs.marketing) return [];
    return requested.filter((channel) => {
      if (channel === "EMAIL") return prefs.email || type === "SECURITY";
      if (channel === "PUSH") return prefs.push;
      return prefs.inApp;
    });
  }
}

export const notificationService = new NotificationService(notificationRepository);
