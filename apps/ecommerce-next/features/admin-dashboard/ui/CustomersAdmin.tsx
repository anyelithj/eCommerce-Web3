// CustomersAdmin.tsx (Client Component) => CRM: clientes con segmento (VIP/regular/nuevo/inactivo), valor de vida
// (LTV), puntaje, etiquetas y notas; vista 360° (pedidos recientes, categorías favoritas, fidelidad y próxima compra
// estimada). Express sincroniza con SuiteCRM por un Adapter (D-DIP): esta vista no sabe si el CRM externo existe.
// Patrones: Facade (GET /crm/customer/:id arma la vista 360 en una petición) + Composite (configuración de la tabla).
"use client";

import { useTranslations } from "next-intl";
import { useAdminGet, type Customer, type Customer360 } from "../api/dashboard.api";
import { AdminResource, DialogButton, toOptions } from "./AdminResource";
import { DataTable } from "./DataTable";
import { KPICard } from "./KPICard";
import { customerSchema, customerUpdateSchema } from "../lib/dashboard.validator";
import { useFormat } from "@/shared/hook/useFormat";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";

const SEGMENTS = ["VIP", "REGULAR", "NEW", "INACTIVE"] as const;
const SEGMENT_TONE = {
  VIP: "brand",
  REGULAR: "neutral",
  NEW: "info",
  INACTIVE: "warning",
} as const;

export function CustomersAdmin() {
  const t = useTranslations("admin.customers");
  const format = useFormat();
  const segment = (value: Customer["segment"]) => (
    <Badge tone={SEGMENT_TONE[value]}>{t(`segments.${value}`)}</Badge>
  );
  return (
    <AdminResource<Customer, typeof customerSchema, typeof customerUpdateSchema>
      resource="customers"
      path="/crm/customer"
      title={t("title")}
      search="q"
      rowLabel={(row) => `${row.firstName} ${row.lastName}`}
      filters={[
        {
          name: "segment",
          label: t("segment"),
          options: toOptions(SEGMENTS, (value) => t(`segments.${value}`)),
        },
        { name: "archived", label: t("state"), options: [{ value: "true", label: t("archived") }] },
      ]}
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => (
            <span className="flex flex-col">
              <span className="font-medium">{`${row.firstName} ${row.lastName}`}</span>
              <span className="text-xs text-slate-500">{row.email}</span>
            </span>
          ),
        },
        { key: "segment", header: t("segment"), cell: (row) => segment(row.segment) },
        {
          key: "orders",
          header: t("orders"),
          cell: (row) => row.orders,
          className: "text-right tabular-nums",
        },
        {
          key: "ltv",
          header: t("ltv"),
          cell: (row) => format.money(row.ltvCents),
          className: "text-right",
        },
        {
          key: "score",
          header: t("score"),
          cell: (row) => `${row.score.value}${row.score.source === "RFM" ? " · RFM" : ""}`,
          className: "text-right",
        },
        { key: "tags", header: t("tags"), cell: (row) => row.tags.join(", ") || "—" },
      ]}
      actions={(row) => (
        <DialogButton label={t("view360")} title={`${row.firstName} ${row.lastName}`}>
          {() => <Customer360View id={row.id} />}
        </DialogButton>
      )}
      create={{
        schema: customerSchema,
        initialValues: { email: "", firstName: "", lastName: "", phone: "", tags: "", note: "" },
        fields: [
          { name: "email", label: t("email"), type: "email" },
          { name: "firstName", label: t("firstName") },
          { name: "lastName", label: t("lastName") },
          { name: "phone", label: t("phone") },
          { name: "tags", label: t("tags"), hint: t("tagsHint") },
          { name: "note", label: t("note"), type: "textarea" },
        ],
      }}
      edit={{
        schema: customerUpdateSchema,
        toValues: (row) => ({
          tags: row.tags.join(", "),
          score: row.score.source === "MANUAL" ? row.score.value : "",
          note: "",
        }),
        fields: [
          { name: "tags", label: t("tags"), hint: t("tagsHint") },
          { name: "score", label: t("score"), type: "number", hint: t("scoreHint") },
          { name: "note", label: t("addNote"), type: "textarea" },
        ],
      }}
      remove={(row) => !row.archived} // DELETE = archivar (los datos se conservan para reportes)
    />
  );
}

// Customer360View => ficha completa del cliente (se consulta solo al abrir el diálogo)
function Customer360View({ id }: { id: string }) {
  const t = useTranslations("admin.customers");
  const tOrder = useTranslations("order");
  const format = useFormat();
  const { data, isLoading } = useAdminGet<Customer360>("customers", `/crm/customer/${id}`);
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <KPICard label={t("ltv")} value={format.money(data.ltvCents)} />
        <KPICard label={t("avgOrder")} value={format.money(data.avgOrderCents)} />
        <KPICard
          label={t("loyalty")}
          value={data.loyalty ? `${data.loyalty.tier} · ${data.loyalty.pointsBalance}` : "—"}
        />
        <KPICard
          label={t("nextPurchase")}
          value={data.nextPurchaseAt ? format.date(data.nextPurchaseAt) : "—"}
        />
      </div>
      {data.favoriteCategories.length > 0 && (
        <p className="text-sm">
          <span className="font-medium">{t("favorites")}: </span>
          {data.favoriteCategories.map((category) => category.name).join(", ")}
        </p>
      )}
      <DataTable
        caption={t("recentOrders")}
        rows={data.recentOrders}
        rowKey={(row) => row.id}
        columns={[
          { key: "number", header: t("orders"), cell: (row) => row.orderNumber },
          { key: "status", header: t("state"), cell: (row) => tOrder(`status.${row.status}`) },
          {
            key: "total",
            header: t("ltv"),
            cell: (row) => format.money(row.totalCents, row.currency),
            className: "text-right",
          },
          { key: "date", header: t("date"), cell: (row) => format.date(row.placedAt) },
        ]}
      />
      {data.notes.length > 0 && (
        <section aria-labelledby="crm-notes" className="flex flex-col gap-2">
          <h3 id="crm-notes" className="text-sm font-semibold">
            {t("notes")}
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {data.notes.map((note) => (
              <li key={note.at} className="rounded-md bg-muted p-2">
                <p>{note.text}</p>
                <time dateTime={note.at} className="text-xs text-slate-500">
                  {format.dateTime(note.at)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
