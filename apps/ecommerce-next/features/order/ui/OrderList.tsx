// OrderList.tsx => "Mis pedidos": filtros por estado (pestañas) + lista paginada.
"use client";

import { useOrders } from "../api/order.api";
import { useOrderFilter } from "../model/order.store";
import { OrderCard } from "./OrderCard";
import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/entities/order/model/order.types";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { routes } from "@/shared/constants/routes";

const FILTERS: Array<OrderStatus | undefined> = [
  undefined,
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export function OrderList() {
  const t = useTranslations("order");
  const { status, page, setStatus, setPage } = useOrderFilter();
  const { data, isLoading, isFetching } = useOrders({ page, status });

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros como botones con aria-pressed (grupo de alternancia) */}
      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter ?? "all"}
            type="button"
            aria-pressed={status === filter}
            onClick={() => setStatus(filter)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === filter
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 hover:bg-slate-50"
            )}
          >
            {filter ? t(`status.${filter}`) : t("all")}
          </button>
        ))}
      </div>
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && data.data.length === 0 && (
        <EmptyState
          icon="📦"
          title={t("empty.title")}
          description={t("empty.description")}
          action={{ label: t("empty.action"), href: routes.products }}
        />
      )}
      <ul className="flex flex-col gap-3" aria-busy={isFetching}>
        {data?.data.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-sm text-slate-600">
            {t("page", { page, total: data.meta.totalPages })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
