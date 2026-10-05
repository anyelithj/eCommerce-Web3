import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const NotificationTypes = [
  "ORDER",
  "PAYMENT",
  "SHIPPING",
  "REFUND",
  "REVIEW",
  "LOYALTY",
  "SECURITY",
  "PROMOTION",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NotificationTypes)[number];

export const NotificationChannels = ["IN_APP", "EMAIL", "PUSH"] as const;
export type NotificationChannel = (typeof NotificationChannels)[number];

const RETENTION_SECONDS = 180 * 24 * 60 * 60;

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: NotificationTypes, required: true },
    messageKey: { type: String, default: null },
    params: { type: Schema.Types.Mixed, default: {} },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, required: true, maxlength: 1000 },
    url: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },
    channels: { type: [String], enum: NotificationChannels, default: ["IN_APP"] },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export type NotificationRecord = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<NotificationRecord>;

export const NotificationModel = model("Notification", notificationSchema);
