import type { AppNotification } from "../api/notification.api";

export const NOTIFICATION_META: Record<AppNotification["type"], { icon: string }> = {
  ORDER: { icon: "📦" },
  PAYMENT: { icon: "💳" },
  SHIPPING: { icon: "🚚" },
  REFUND: { icon: "↩️" },
  REVIEW: { icon: "⭐" },
  LOYALTY: { icon: "🏆" },
  SECURITY: { icon: "🔒" },
  PROMOTION: { icon: "🎁" },
  SYSTEM: { icon: "ℹ️" },
};
