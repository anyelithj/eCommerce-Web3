// OrderStatus.tsx => estado del pedido como Badge (texto + color: el color nunca es el único indicador).
import { Badge } from "@/shared/ui/Badge";
import { useTranslations } from "next-intl";
import type { OrderStatus as Status } from "@/entities/order/model/order.types";

const TONE: Record<Status, "info" | "warning" | "success" | "danger" | "neutral"> = {
  CONFIRMED: "info",
  PREPARING: "warning",
  PACKED: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function OrderStatus({ status }: { status: Status }) {
  const t = useTranslations("order.status");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
