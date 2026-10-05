import type { NotificationChannel, NotificationType } from "../model/notification.model";
import type { NotificationKey, NotificationParams } from "../../../shared/constants/messages.constants";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: Date;
}

export type KeyedMessage = { [K in NotificationKey]: { key: K; params: NotificationParams[K] } }[NotificationKey];
export interface FreeTextMessage {
  title: string;
  body: string;
}

export type NotifyInput = {
  type: NotificationType;
  message: KeyedMessage | FreeTextMessage;
  url?: string | undefined;
  data?: Record<string, unknown> | undefined;
  channels?: NotificationChannel[] | undefined;
};

export interface NotificationPreferencesDto {
  email: boolean;
  push: boolean;
  inApp: boolean;
  marketing: boolean;
}
