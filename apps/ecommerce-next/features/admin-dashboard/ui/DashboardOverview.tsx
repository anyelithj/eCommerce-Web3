// DashboardOverview.tsx (Client Component) => portada del panel: KPIs con tendencia, contadores operativos, gráfico
// de ventas, productos top y widgets personalizables por administrador (GET/POST/DELETE /dashboard/widget).
// Patrones: Facade (una sola petición /dashboard/kpi alimenta todo), Strategy (cada tipo de widget se dibuja con su
// componente: tabla WIDGETS) y Observer (modo "en vivo": Socket.io invalida los KPIs al llegar actividad).
// Rendimiento: SalesChart (Recharts) se carga con next/dynamic solo aquí; "en vivo" está apagado por defecto.
"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  useAdminGet,
  useAdminMutation,
  useKpis,
  useLiveMetrics,
  type KpiResponse,
  type Widget,
} from "../api/dashboard.api";
import { RANGES, rangeToDates, useAdminDashboard, type Range } from "../model/dashboard.store";
import { KPICard } from "./KPICard";
import { DataTable } from "./DataTable";
import { SectionHeader, SelectField } from "./AdminFields";
import { useFormat } from "@/shared/hook/useFormat";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Link } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";

// "ssr: false" => el gráfico solo existe en el navegador (Recharts mide el contenedor); placeholder sin saltos (CLS)
const SalesChart = dynamic(() => import("./SalesChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

type KpiKey = keyof KpiResponse["kpis"];
const WIDGET_TYPES: Widget["type"][] = [
  "KPI",
  "SALES_CHART",
  "TOP_PRODUCTS",
  "LOW_STOCK",
  "RECENT_ORDERS",
];

export function DashboardOverview() {
  const t = useTranslations("admin.overview");
  const format = useFormat();
  const { range, realtime, setRange, toggleRealtime } = useAdminDashboard();
  const kpis = useKpis(rangeToDates(range), realtime);
  const widgets = useAdminGet<Widget[]>("dashboard-config", "/dashboard/config");
  const [lastTick, setLastTick] = useState<string | null>(null);
  useLiveMetrics(realtime, (tick) =>
    setLastTick(t("tick", { events: tick.events, orders: tick.orders }))
  );

  // formatKpi => Factory de formato por indicador (dinero, porcentaje o número)
  const formatKpi = (key: KpiKey, value: number) =>
    key === "revenueCents" || key === "aovCents"
      ? format.money(value)
      : key === "conversionRate"
        ? `${(value * 100).toFixed(2)} %`
        : value.toLocaleString();
  const data = kpis.data;

  // WIDGETS => estrategia de render por tipo de widget (agregar un tipo = agregar una entrada: OCP)
  const WIDGETS: Record<Widget["type"], (widget: Widget) => ReactNode> = {
    KPI: (widget) => {
      const key = (widget.config["metric"] as KpiKey | undefined) ?? "orders";
      const value = data?.kpis[key];
      return value ? (
        <KPICard
          label={widget.title}
          value={formatKpi(key, value.value)}
          change={value.change}
          trendLabel={t("vsPrevious")}
        />
      ) : (
        <Skeleton className="h-24" />
      );
    },
    SALES_CHART: (widget) => <SalesChart data={data?.series ?? []} title={widget.title} />,
    TOP_PRODUCTS: (widget) => (
      <DataTable
        caption={widget.title}
        loading={kpis.isLoading}
        rows={data?.topProducts}
        rowKey={(row) => row.key}
        columns={[
          { key: "name", header: t("product"), cell: (row) => row.label },
          {
            key: "units",
            header: t("units"),
            cell: (row) => row.units ?? 0,
            className: "text-right",
          },
          {
            key: "revenue",
            header: t("revenue"),
            cell: (row) => format.money(row.value),
            className: "text-right",
          },
        ]}
      />
    ),
    LOW_STOCK: (widget) => (
      <KPICard label={widget.title} value={String(data?.operations.lowStock ?? "—")} />
    ),
    RECENT_ORDERS: (widget) => (
      <KPICard label={widget.title} value={String(data?.operations.activeOrders ?? "—")} />
    ),
    FUNNEL: (widget) => (
      <Link href={routes.adminAnalytics} className="text-sm underline">
        {widget.title}
      </Link>
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("title")}
        description={
          data ? t("generatedAt", { date: format.dateTime(data.generatedAt) }) : undefined
        }
        actions={
          <>
            <SelectField
              label={t("range")}
              value={range}
              onChange={(event) => setRange(event.target.value as Range)}
              options={RANGES.map((value) => ({ value, label: t(`ranges.${value}`) }))}
            />
            <Button
              variant={realtime ? "primary" : "secondary"}
              size="sm"
              aria-pressed={realtime}
              onClick={() => toggleRealtime()}
              className="self-end"
            >
              {realtime ? t("liveOn") : t("liveOff")}
            </Button>
          </>
        }
      />
      {/* aria-live => el lector de pantalla anuncia la actividad nueva sin mover el foco */}
      <p aria-live="polite" className="text-xs text-slate-500">
        {realtime ? (lastTick ?? t("waiting")) : ""}
      </p>

      {/* Contadores operativos con acceso directo a su sección (acciones rápidas) */}
      <section aria-label={t("operations")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OperationLink
          href={routes.adminOrders}
          label={t("activeOrders")}
          value={data?.operations.activeOrders}
        />
        <OperationLink
          href={routes.adminOrders}
          label={t("pendingRefunds")}
          value={data?.operations.pendingRefunds}
        />
        <OperationLink
          href={routes.adminInventory}
          label={t("lowStock")}
          value={data?.operations.lowStock}
        />
      </section>

      {/* Cuadrícula de 12 columnas (escritorio) con la posición guardada de cada widget; una columna en móvil */}
      <section aria-label={t("widgets")} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {(widgets.data ?? []).map((widget, index) => (
          <div
            key={widget.id ?? `default-${index}`}
            className="flex flex-col gap-2 rounded-lg border p-3"
            style={{ gridColumn: `span ${widget.position.w} / span ${widget.position.w}` }}
          >
            {WIDGETS[widget.type](widget)}
            {widget.id && <RemoveWidget id={widget.id} />}
          </div>
        ))}
      </section>
      <AddWidget />
    </div>
  );
}

function OperationLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number | undefined;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value ?? "—"}</span>
    </Link>
  );
}

// RemoveWidget / AddWidget => personalización del panel (los widgets por defecto no se guardan hasta personalizar)
function RemoveWidget({ id }: { id: string }) {
  const t = useTranslations("admin.overview");
  const remove = useAdminMutation<void>(["dashboard-config"], () => ({
    path: `/dashboard/widget/${id}`,
    method: "DELETE",
  }));
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={remove.isPending}
      onClick={() => remove.mutate()}
      className="self-end"
    >
      {t("removeWidget")}
    </Button>
  );
}

function AddWidget() {
  const t = useTranslations("admin.overview");
  const [type, setType] = useState<Widget["type"]>("KPI");
  const add = useAdminMutation<Widget["type"]>(["dashboard-config"], (value) => ({
    path: "/dashboard/widget",
    method: "POST",
    body: {
      type: value,
      title: t(`widgetTypes.${value}`),
      position: { x: 0, y: 99, w: value === "KPI" ? 3 : 6, h: 2 },
      config: value === "KPI" ? { metric: "revenueCents" } : {},
    },
  }));
  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField
        label={t("addWidget")}
        value={type}
        onChange={(event) => setType(event.target.value as Widget["type"])}
        options={WIDGET_TYPES.map((value) => ({ value, label: t(`widgetTypes.${value}`) }))}
      />
      <Button
        size="sm"
        variant="secondary"
        loading={add.isPending}
        onClick={() => add.mutate(type)}
      >
        {t("add")}
      </Button>
    </div>
  );
}
