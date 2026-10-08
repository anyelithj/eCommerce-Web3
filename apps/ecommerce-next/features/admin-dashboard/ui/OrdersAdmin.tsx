"use client";

import { useTranslations } from "next-intl";
import type { Invoice, Refund, Shipment } from "../api/dashboard.api";
import { downloadAuthed } from "../api/dashboard.api";
import { AdminResource, toOptions } from "./AdminResource";
import { AdminTabs } from "./AdminTabs";
import {
  creditNoteSchema,
  invoiceSchema,
  ORDER_STATUSES,
  orderStatusSchema,
  REFUND_STATUSES,
  refundReviewSchema,
  SHIPMENT_STATUSES,
  shipmentUpdateSchema,
} from "../lib/dashboard.validator";
import type { OrderSummary } from "@/entities/order/model/order.types";
import { useFormat } from "@/shared/hook/useFormat";
import { useAuth } from "@/shared/hook/useAuth";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/Toast";

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DELIVERED: "success",
  APPROVED: "success",
  PROCESSED: "success",
  ISSUED: "success",
  ACCEPTED: "success",
  CANCELLED: "danger",
  REJECTED: "danger",
  RETURNED: "danger",
  FAILED: "danger",
  REQUESTED: "warning",
  PENDING: "warning",
  SENT: "success",
  COMPLETED: "success",
  COMPENSATED: "warning",
  QUEUED: "warning",
  SCHEDULED: "info",
  SENDING: "info",
  RUNNING: "info",
  SHIPPED: "info",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "info",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{label}</Badge>;
}

export function OrdersAdmin() {
  const t = useTranslations("admin.orders");
  return (
    <AdminTabs
      section="orders"
      label={t("tabs.label")}
      tabs={[
        { id: "orders", label: t("tabs.orders"), render: () => <OrdersTab /> },
        { id: "shipments", label: t("tabs.shipments"), render: () => <ShipmentsTab /> },
        { id: "invoices", label: t("tabs.invoices"), render: () => <InvoicesTab /> },
        { id: "refunds", label: t("tabs.refunds"), render: () => <RefundsTab /> },
      ]}
    />
  );
}

function OrdersTab() {
  const t = useTranslations("admin.orders");
  const tOrder = useTranslations("order");
  const format = useFormat();
  const statusOptions = toOptions(ORDER_STATUSES, (value) => tOrder(`status.${value}`));
  return (
    <AdminResource<OrderSummary, typeof orderStatusSchema, typeof orderStatusSchema>
      resource="orders"
      path="/order"
      title={t("tabs.orders")}
      invalidate={["kpi"]}
      rowLabel={(row) => row.orderNumber}
      filters={[{ name: "status", label: t("status"), options: statusOptions }]}
      columns={[
        {
          key: "number",
          header: t("number"),
          cell: (row) => <span className="font-medium">{row.orderNumber}</span>,
        },
        {
          key: "status",
          header: t("status"),
          cell: (row) => <StatusBadge status={row.status} label={tOrder(`status.${row.status}`)} />,
        },
        { key: "items", header: t("items"), cell: (row) => row.itemCount, className: "text-right" },
        {
          key: "total",
          header: t("total"),
          cell: (row) => format.money(row.totalCents, row.currency),
          className: "text-right",
        },
        { key: "date", header: t("date"), cell: (row) => format.dateTime(row.placedAt) },
      ]}
      edit={{
        schema: orderStatusSchema,
        path: (row) => `/order/${row.id}/status`,
        toValues: (row) => ({ status: row.status, note: "" }),
        fields: [
          { name: "status", label: t("status"), type: "select", options: statusOptions },
          { name: "note", label: t("note"), type: "textarea" },
        ],
      }}
    />
  );
}

function ShipmentsTab() {
  const t = useTranslations("admin.orders");
  const tOrder = useTranslations("order");
  const format = useFormat();
  const { accessToken } = useAuth();
  const statusOptions = toOptions(SHIPMENT_STATUSES, (value) => tOrder(`tracking.status.${value}`));
  return (
    <AdminResource<Shipment, typeof shipmentUpdateSchema, typeof shipmentUpdateSchema>
      resource="shipments"
      path="/shipping"
      title={t("tabs.shipments")}
      invalidate={["orders"]}
      rowLabel={(row) => row.orderNumber}
      filters={[{ name: "status", label: t("status"), options: statusOptions }]}
      columns={[
        { key: "order", header: t("number"), cell: (row) => row.orderNumber },
        {
          key: "status",
          header: t("status"),
          cell: (row) => (
            <StatusBadge status={row.status} label={tOrder(`tracking.status.${row.status}`)} />
          ),
        },
        { key: "carrier", header: t("carrier"), cell: (row) => row.carrier ?? "—" },
        { key: "tracking", header: t("tracking"), cell: (row) => row.trackingNumber ?? "—" },
        {
          key: "eta",
          header: t("eta"),
          cell: (row) => (row.estimatedDelivery ? format.date(row.estimatedDelivery) : "—"),
        },
      ]}
      actions={(row, run) =>
        row.trackingNumber ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              accessToken &&
              downloadAuthed(
                `/shipping/${row.id}/label`,
                `guia-${row.orderNumber}.pdf`,
                accessToken
              ).catch(() => toast.error(t("downloadError")))
            }
          >
            {t("label")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void run(
                { path: "/shipping/label", method: "POST", body: { shipmentId: row.id } },
                t("labelCreated")
              )
            }
          >
            {t("createLabel")}
          </Button>
        )
      }
      edit={{
        schema: shipmentUpdateSchema,
        toValues: (row) => ({
          status: row.status as (typeof SHIPMENT_STATUSES)[number],
          description: "",
          location: "",
        }),
        fields: [
          { name: "status", label: t("status"), type: "select", options: statusOptions },
          { name: "description", label: t("eventDescription") },
          { name: "location", label: t("location") },
        ],
      }}
    />
  );
}

function InvoicesTab() {
  const t = useTranslations("admin.orders");
  const format = useFormat();
  const { accessToken } = useAuth();
  return (
    <AdminResource<Invoice, typeof invoiceSchema, typeof creditNoteSchema>
      resource="invoices"
      path="/invoice"
      title={t("tabs.invoices")}
      rowLabel={(row) => row.number}
      columns={[
        {
          key: "number",
          header: t("invoiceNumber"),
          cell: (row) => <span className="font-medium">{row.number}</span>,
        },
        {
          key: "status",
          header: t("status"),
          cell: (row) => (
            <StatusBadge status={row.status} label={t(`invoiceStatus.${row.status}`)} />
          ),
        },
        {
          key: "total",
          header: t("total"),
          cell: (row) => format.money(row.totalCents, row.currency),
          className: "text-right",
        },
        {
          key: "issued",
          header: t("date"),
          cell: (row) => (row.issuedAt ? format.date(row.issuedAt) : "—"),
        },
      ]}
      actions={(row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            accessToken &&
            downloadAuthed(`/invoice/${row.id}/pdf`, `${row.number}.pdf`, accessToken).catch(() =>
              toast.error(t("downloadError"))
            )
          }
        >
          PDF<span className="sr-only"> {row.number}</span>
        </Button>
      )}
      create={{
        schema: invoiceSchema,
        initialValues: { orderId: "" },
        fields: [{ name: "orderId", label: t("orderId"), hint: t("orderIdHint") }],
      }}
      edit={{
        schema: creditNoteSchema,
        path: (row) => `/invoice/${row.id}/credit-note`,
        toValues: () => ({ amount: 0, reason: "" }),
        toBody: (values) => ({ amountCents: values.amount, reason: values.reason }),
        fields: [
          { name: "amount", label: t("creditAmount"), type: "number", hint: t("creditHint") },
          { name: "reason", label: t("reason"), type: "textarea" },
        ],
      }}
    />
  );
}

function RefundsTab() {
  const t = useTranslations("admin.orders");
  const tOrder = useTranslations("order");
  const format = useFormat();
  return (
    <AdminResource<Refund, typeof refundReviewSchema, typeof refundReviewSchema>
      resource="refunds"
      path="/refund"
      title={t("tabs.refunds")}
      invalidate={["kpi"]}
      rowLabel={(row) => row.orderNumber}
      filters={[
        {
          name: "status",
          label: t("status"),
          options: toOptions(REFUND_STATUSES, (value) => t(`refundStatus.${value}`)),
        },
      ]}
      columns={[
        { key: "order", header: t("number"), cell: (row) => row.orderNumber },
        {
          key: "reason",
          header: t("reason"),
          cell: (row) => (
            <span title={row.description}>{tOrder(`refundReasons.${row.reason}`)}</span>
          ),
        },
        {
          key: "amount",
          header: t("total"),
          cell: (row) => format.money(row.amountCents, row.currency),
          className: "text-right",
        },
        {
          key: "status",
          header: t("status"),
          cell: (row) => (
            <StatusBadge status={row.status} label={t(`refundStatus.${row.status}`)} />
          ),
        },
        { key: "date", header: t("date"), cell: (row) => format.date(row.createdAt) },
      ]}
      edit={{
        schema: refundReviewSchema,
        path: (row) => `/refund/${row.id}/approve`,
        when: (row) => row.status === "REQUESTED",
        toValues: () => ({ approve: "true", note: "" }),
        fields: [
          {
            name: "approve",
            label: t("decision"),
            type: "select",
            options: [
              { value: "true", label: t("approve") },
              { value: "false", label: t("reject") },
            ],
          },
          { name: "note", label: t("note"), type: "textarea" },
        ],
      }}
    />
  );
}
