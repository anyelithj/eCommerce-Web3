import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";
import { queryBoolean } from "../../../shared/pipe/transform.pipe";
import { NotificationChannels, NotificationTypes } from "../model/notification.model";

export const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, { message: "id de notificación inválido" });

export const CreateNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  type: z.enum(NotificationTypes),
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(1000),
  url: z.string().startsWith("/").optional(),
  channels: z.array(z.enum(NotificationChannels)).min(1).optional(),
});

export const ListNotificationsQuerySchema = PaginationQuerySchema.extend({ unread: queryBoolean });

export const UpdatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export const PushTokenSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
