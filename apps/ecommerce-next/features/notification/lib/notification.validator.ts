// notification.validator.ts => ícono por tipo (mapa declarativo; el color no es el único indicador).
// La etiqueta de cada tipo se traduce: messages/*.json -> notification.types.<TIPO>
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
