// OrderTracking.tsx => timeline del envío (lista ordenada cronológica con marcadores) + guía y fecha estimada.
import type { Shipment, ShipmentStatus } from "@/entities/order/model/order.types";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/hook/useFormat";

export function OrderTracking({ shipment }: { shipment: Shipment | null }) {
  const t = useTranslations("order.tracking");
  const { date, dateTime } = useFormat();
  if (!shipment) return <p className="text-sm text-slate-600">{t("pending")}</p>;
  return (
    <section aria-labelledby="tracking-title" className="flex flex-col gap-3">
      <h2 id="tracking-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-slate-700">
        {shipment.carrier ? `${shipment.carrier} · ${shipment.service ?? ""}` : t("noCarrier")}
        {shipment.trackingNumber && (
          <>
            {" "}
            · {t("trackingNumber")} <strong>{shipment.trackingNumber}</strong>
          </>
        )}
        {shipment.estimatedDelivery && shipment.status !== "DELIVERED" && (
          <> · {t("eta", { date: date(shipment.estimatedDelivery) })}</>
        )}
      </p>
      {/* <ol> => el orden de los eventos es significativo (cronológico) */}
      <ol className="relative flex flex-col gap-4 border-l-2 border-slate-200 pl-6">
        {shipment.events.map((event, index) => (
          <li key={`${event.status}-${index}`} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-900"
            />
            <p className="text-sm font-medium text-slate-900">
              {t(`status.${event.status satisfies ShipmentStatus}`)}
            </p>
            <p className="text-sm text-slate-600">{event.description}</p>
            <p className="text-xs text-slate-500">
              <time dateTime={event.occurredAt}>{dateTime(event.occurredAt)}</time>
              {event.location && ` · ${event.location}`}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
