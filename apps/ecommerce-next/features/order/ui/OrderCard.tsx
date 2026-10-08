// OrderCard.tsx => resumen de un pedido en el listado (enlace al detalle).
import { Link } from "@/shared/lib/i18n/navigation";
import type { OrderSummary } from "@/entities/order/model/order.types";
import { OrderStatus } from "./OrderStatus";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/hook/useFormat";
import { routes } from "@/shared/constants/routes";

export function OrderCard({ order }: { order: OrderSummary }) {
  const t = useTranslations("order");
  const { money, date } = useFormat();
  return (
    <article className="relative flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 hover:border-slate-400">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-slate-900">
          <Link
            href={routes.order(order.id)}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-slate-900"
          >
            {t("number", { number: order.orderNumber })}
          </Link>
        </h3>
        <p className="text-sm text-slate-600">
          <time dateTime={order.placedAt}>{date(order.placedAt)}</time> ·{" "}
          {t("items", { count: order.itemCount })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <OrderStatus status={order.status} />
        <p className="font-semibold">{money(order.totalCents, order.currency)}</p>
      </div>
    </article>
  );
}
