"use client";

import { useTranslations } from "next-intl";
import {
  useAdminGet,
  type InventoryDetail,
  type StockLevel,
  type Supplier,
} from "../api/dashboard.api";
import { AdminResource, DialogButton, FormAction, toOptions } from "./AdminResource";
import { AdminTabs } from "./AdminTabs";
import { DataTable } from "./DataTable";
import { KPICard } from "./KPICard";
import { movementSchema, stockAdjustSchema, supplierSchema } from "../lib/dashboard.validator";
import { useFormat } from "@/shared/hook/useFormat";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";

const MOVEMENT_TYPES = ["IN", "OUT", "RETURN", "DAMAGE"] as const;

export function InventoryAdmin() {
  const t = useTranslations("admin.inventory");
  return (
    <AdminTabs
      section="inventory"
      label={t("tabs.label")}
      tabs={[
        { id: "stock", label: t("tabs.stock"), render: () => <StockTab /> },
        { id: "suppliers", label: t("tabs.suppliers"), render: () => <SuppliersTab /> },
      ]}
    />
  );
}

function StockTab() {
  const t = useTranslations("admin.inventory");
  return (
    <AdminResource<StockLevel, typeof stockAdjustSchema, typeof stockAdjustSchema>
      resource="inventory"
      path="/inventory"
      title={t("tabs.stock")}
      search="q"
      invalidate={["kpi"]}
      rowKey={(row) => row.variantId}
      rowLabel={(row) => row.sku}
      filters={[
        { name: "lowStock", label: t("alert"), options: [{ value: "true", label: t("lowOnly") }] },
      ]}
      columns={[
        {
          key: "product",
          header: t("product"),
          cell: (row) => <span className="font-medium">{row.productName}</span>,
        },
        { key: "variant", header: t("variant"), cell: (row) => `${row.variantName} · ${row.sku}` },
        {
          key: "stock",
          header: t("stock"),
          cell: (row) => row.stock,
          className: "text-right tabular-nums",
        },
        {
          key: "reserved",
          header: t("reserved"),
          cell: (row) => row.reserved,
          className: "text-right tabular-nums",
        },
        {
          key: "available",
          header: t("available"),
          className: "text-right",
          cell: (row) =>
            row.low ? (
              <Badge tone="warning">{t("low", { count: row.available })}</Badge>
            ) : (
              <span className="tabular-nums">{row.available}</span>
            ),
        },
      ]}
      actions={(row) => (
        <>
          <DialogButton label={t("history")} title={t("historyTitle", { sku: row.sku })}>
            {() => <StockDetail variantId={row.variantId} />}
          </DialogButton>
          <FormAction
            label={t("movement")}
            title={t("movementTitle", { sku: row.sku })}
            resources={["inventory", "kpi"]}
            schema={movementSchema}
            initialValues={{ type: "IN", quantity: 1, reason: "", reference: "" }}
            fields={[
              {
                name: "type",
                label: t("movementType"),
                type: "select",
                options: toOptions(MOVEMENT_TYPES, (value) => t(`movementTypes.${value}`)),
              },
              { name: "quantity", label: t("quantity"), type: "number" },
              { name: "reason", label: t("reason") },
              { name: "reference", label: t("reference"), hint: t("referenceHint") },
            ]}
            toRequest={(values) => ({
              path: "/inventory/movement",
              method: "POST",
              body: { ...values, variantId: row.variantId },
            })}
          />
        </>
      )}
      edit={{
        schema: stockAdjustSchema,
        toValues: (row) => ({ stock: row.stock, reason: "" }),
        fields: [
          { name: "stock", label: t("newStock"), type: "number", hint: t("adjustHint") },
          { name: "reason", label: t("reason") },
        ],
      }}
    />
  );
}

function StockDetail({ variantId }: { variantId: string }) {
  const t = useTranslations("admin.inventory");
  const format = useFormat();
  const { data, isLoading } = useAdminGet<InventoryDetail>("inventory", `/inventory/${variantId}`);
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPICard label={t("avgDaily")} value={data.forecast.avgDailySales.toFixed(1)} />
        <KPICard
          label={t("daysOfCover")}
          value={data.forecast.daysOfCover === null ? "∞" : String(data.forecast.daysOfCover)}
        />
        <KPICard label={t("reorder")} value={String(data.forecast.reorderQuantity)} />
      </div>
      <DataTable
        caption={t("movements")}
        rows={data.movements}
        rowKey={(row) => row.id}
        columns={[
          { key: "date", header: t("date"), cell: (row) => format.dateTime(row.createdAt) },
          {
            key: "type",
            header: t("movementType"),
            cell: (row) =>
              row.voidedAt ? (
                <s>{t(`movementTypes.${row.type}`)}</s>
              ) : (
                t(`movementTypes.${row.type}`)
              ),
          },
          {
            key: "delta",
            header: t("quantity"),
            cell: (row) => (row.delta > 0 ? `+${row.delta}` : row.delta),
            className: "text-right tabular-nums",
          },
          {
            key: "after",
            header: t("stock"),
            cell: (row) => row.stockAfter,
            className: "text-right tabular-nums",
          },
          { key: "reason", header: t("reason"), cell: (row) => row.reason },
        ]}
      />
    </div>
  );
}

function SuppliersTab() {
  const t = useTranslations("admin.inventory");
  const fields = [
    { name: "name", label: t("supplierName") },
    { name: "taxId", label: t("taxId") },
    { name: "email", label: t("email"), type: "email" as const },
    { name: "phone", label: t("phone") },
    { name: "contactName", label: t("contact") },
    { name: "paymentTermsDays", label: t("paymentTerms"), type: "number" as const },
    { name: "leadTimeDays", label: t("leadTime"), type: "number" as const },
    { name: "rating", label: t("rating"), type: "number" as const },
    { name: "contractEndsAt", label: t("contractEnds"), type: "date" as const },
  ];
  const toValues = (row: Supplier) => ({
    name: row.name,
    taxId: row.taxId,
    email: row.email,
    phone: row.phone ?? "",
    contactName: row.contactName ?? "",
    paymentTermsDays: row.paymentTermsDays,
    leadTimeDays: row.leadTimeDays,
    rating: row.rating ?? ("" as const),
    contractEndsAt: row.contractEndsAt?.slice(0, 10) ?? "",
  });
  return (
    <AdminResource<Supplier, typeof supplierSchema, typeof supplierSchema>
      resource="suppliers"
      path="/supplier"
      title={t("tabs.suppliers")}
      search="q"
      rowLabel={(row) => row.name}
      filters={[
        {
          name: "active",
          label: t("state"),
          options: [
            { value: "true", label: t("active") },
            { value: "false", label: t("inactive") },
          ],
        },
      ]}
      columns={[
        {
          key: "name",
          header: t("supplierName"),
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        { key: "taxId", header: t("taxId"), cell: (row) => row.taxId },
        {
          key: "email",
          header: t("email"),
          cell: (row) => (
            <a className="underline" href={`mailto:${row.email}`}>
              {row.email}
            </a>
          ),
        },
        {
          key: "lead",
          header: t("leadTime"),
          cell: (row) => t("days", { count: row.leadTimeDays }),
          className: "text-right",
        },
        {
          key: "contract",
          header: t("contractEnds"),
          cell: (row) =>
            row.contractAlert ? (
              <Badge tone="warning">{row.contractEndsAt?.slice(0, 10)}</Badge>
            ) : (
              (row.contractEndsAt?.slice(0, 10) ?? "—")
            ),
        },
      ]}
      create={{
        schema: supplierSchema,
        fields,
        initialValues: {
          name: "",
          taxId: "",
          email: "",
          phone: "",
          contactName: "",
          paymentTermsDays: 30,
          leadTimeDays: 7,
          rating: "",
          contractEndsAt: "",
        },
      }}
      edit={{ schema: supplierSchema, fields, toValues }}
      remove
    />
  );
}
