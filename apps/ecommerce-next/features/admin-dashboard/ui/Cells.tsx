"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { get, type ColumnDef, type Row } from "../lib/resources";
import { useFormat } from "@/shared/hook/useFormat";
import { Badge } from "@/shared/ui/Badge";

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  APPROVED: "success",
  DELIVERED: "success",
  PROCESSED: "success",
  ISSUED: "success",
  ACCEPTED: "success",
  SENT: "success",
  COMPLETED: "success",
  SUCCEEDED: "success",
  VIP: "success",
  DRAFT: "neutral",
  PENDING: "warning",
  REQUESTED: "warning",
  QUEUED: "warning",
  WARNING: "warning",
  COMPENSATED: "warning",
  INACTIVE: "warning",
  CANCELLED: "danger",
  REJECTED: "danger",
  FAILED: "danger",
  RETURNED: "danger",
  ARCHIVED: "danger",
  CRITICAL: "danger",
  SHIPPED: "info",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "info",
  SCHEDULED: "info",
  SENDING: "info",
  RUNNING: "info",
  PREPARING: "info",
  PACKED: "info",
  NEW: "info",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{label}</Badge>;
}

export function useValueLabel() {
  const t = useTranslations("admin.values");
  return (field: string, value: string) =>
    t.has(`${field}.${value}`) ? t(`${field}.${value}`) : value;
}

export const fieldOf = (column: ColumnDef) =>
  column.label ?? column.key.split(".").pop() ?? column.key;

export function CellValue({ column, row }: { column: ColumnDef; row: Row }): ReactNode {
  const t = useTranslations("admin.common");
  const format = useFormat();
  const valueLabel = useValueLabel();
  const value = column.value ? column.value(row) : get(row, column.key);
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-400">—</span>;

  switch (column.type) {
    case "money":
      return (
        <span className="tabular-nums">
          {format.money(Number(value), String(get(row, column.currencyKey ?? "currency") ?? "COP"))}
        </span>
      );
    case "date":
      return <time dateTime={String(value)}>{format.date(String(value))}</time>;
    case "datetime":
      return <time dateTime={String(value)}>{format.dateTime(String(value))}</time>;
    case "badge":
      return (
        <StatusBadge status={String(value)} label={valueLabel(fieldOf(column), String(value))} />
      );
    case "bool":
      return value ? <Badge tone="success">{t("yes")}</Badge> : <Badge>{t("no")}</Badge>;
    case "count":
      return (
        <span className="tabular-nums">{Array.isArray(value) ? value.length : String(value)}</span>
      );
    case "list":
      return (
        <span className="text-xs">
          {Array.isArray(value) ? value.map(String).join(", ") : String(value)}
        </span>
      );
    case "percent":
      return <span className="tabular-nums">{`${(Number(value) * 100).toFixed(1)} %`}</span>;
    case "rating":
      return (
        <span aria-label={t("rating", { value: Number(value).toFixed(1) })}>
          {"★".repeat(Math.round(Number(value)))}
          <span className="text-slate-300">{"★".repeat(5 - Math.round(Number(value)))}</span>
        </span>
      );
    case "image":
      return (
        <img
          src={String(value)}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          className="size-10 rounded-md object-cover"
        />
      );
    case "code":
      return <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{String(value)}</code>;
    case "long":
      return <p className="whitespace-pre-line text-sm">{String(value)}</p>;
    case "title":
      return <span className="font-medium text-slate-900">{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}
