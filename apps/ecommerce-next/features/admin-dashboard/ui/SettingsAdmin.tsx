// SettingsAdmin.tsx (Client Component) => configuración e integraciones: roles y permisos (RBAC), webhooks salientes
// (firmados con HMAC), flujos de automatización n8n, bitácora de auditoría (Winston + MongoDB) y transacciones MCP
// con compensación Saga (rollback manual).
// Patrones: Composite (pestañas) + Command (probar webhook, ejecutar flujo, rollback) + Guard (Express vuelve a
// validar el rol ADMIN en cada petición: la UI nunca es la única barrera).
"use client";

import { useTranslations } from "next-intl";
import {
  useAdminList,
  type AuditLog,
  type McpTransaction,
  type Permission,
  type Role,
  type WebhookEndpoint,
  type Workflow,
} from "../api/dashboard.api";
import { AdminResource, FormAction, toOptions } from "./AdminResource";
import { AdminTabs } from "./AdminTabs";
import { StatusBadge } from "./OrdersAdmin";
import {
  PERMISSION_ACTIONS,
  permissionSchema,
  permissionUpdateSchema,
  roleSchema,
  rollbackSchema,
  TRIGGER_TYPES,
  webhookSchema,
  workflowSchema,
} from "../lib/dashboard.validator";
import { useFormat } from "@/shared/hook/useFormat";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";

// Eventos de dominio que Express publica (mismos nombres que AUTOMATION_EVENTS / WEBHOOK_EVENTS del backend)
const EVENTS = [
  "order.placed",
  "order.status-changed",
  "order.cancelled",
  "payment.failed",
  "shipment.updated",
  "refund.updated",
  "invoice.issued",
  "loyalty.tier-upgraded",
  "review.moderated",
] as const;
const WEBHOOK_EVENTS = [...EVENTS, "inventory.low", "cms.updated"] as const;
const SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
const MCP_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "COMPENSATING",
  "COMPENSATED",
  "FAILED",
  "CANCELLED",
] as const;
const SEVERITY_TONE = { INFO: "neutral", WARNING: "warning", CRITICAL: "danger" } as const;

export function SettingsAdmin() {
  const t = useTranslations("admin.settings");
  return (
    <AdminTabs
      section="settings"
      label={t("tabs.label")}
      tabs={[
        { id: "roles", label: t("tabs.roles"), render: () => <RolesTab /> },
        { id: "permissions", label: t("tabs.permissions"), render: () => <PermissionsTab /> },
        { id: "webhooks", label: t("tabs.webhooks"), render: () => <WebhooksTab /> },
        { id: "automation", label: t("tabs.automation"), render: () => <AutomationTab /> },
        { id: "audit", label: t("tabs.audit"), render: () => <AuditTab /> },
        { id: "mcp", label: t("tabs.mcp"), render: () => <McpTab /> },
      ]}
    />
  );
}

// ---------- Roles ----------
function RolesTab() {
  const t = useTranslations("admin.settings");
  // Catálogo de permisos para las casillas (misma clave que la pestaña Permisos: TanStack Query no repite la petición)
  const permissions = useAdminList<Permission>("permissions", "/permission", {
    page: 1,
    limit: 100,
  });
  const options = (permissions.data?.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.action} · ${item.resource}`,
  }));
  const fields = [
    { name: "name", label: t("roleName"), hint: t("roleHint") },
    { name: "description", label: t("description") },
    { name: "permissionIds", label: t("tabs.permissions"), type: "checkboxes" as const, options },
  ];
  const system = (row: Role) => ["ADMIN", "CUSTOMER"].includes(row.name); // Roles base: no se borran desde la UI
  return (
    <AdminResource<Role, typeof roleSchema, typeof roleSchema>
      resource="roles"
      path="/role"
      title={t("tabs.roles")}
      invalidate={["permissions"]}
      rowLabel={(row) => row.name}
      columns={[
        {
          key: "name",
          header: t("roleName"),
          cell: (row) => <code className="font-semibold">{row.name}</code>,
        },
        { key: "description", header: t("description"), cell: (row) => row.description ?? "—" },
        {
          key: "permissions",
          header: t("tabs.permissions"),
          cell: (row) => row.permissions.length,
          className: "text-right tabular-nums",
        },
      ]}
      create={{
        schema: roleSchema,
        fields,
        initialValues: { name: "", description: "", permissionIds: [] },
      }}
      edit={{
        schema: roleSchema,
        fields,
        toValues: (row) => ({
          name: row.name,
          description: row.description ?? "",
          permissionIds: row.permissions.map((item) => item.id),
        }),
      }}
      remove={(row) => !system(row)}
    />
  );
}

// ---------- Permisos ----------
function PermissionsTab() {
  const t = useTranslations("admin.settings");
  return (
    <AdminResource<
      Permission & { description?: string | null },
      typeof permissionSchema,
      typeof permissionUpdateSchema
    >
      resource="permissions"
      path="/permission"
      title={t("tabs.permissions")}
      invalidate={["roles"]}
      rowLabel={(row) => `${row.action} ${row.resource}`}
      columns={[
        { key: "action", header: t("action"), cell: (row) => <Badge>{row.action}</Badge> },
        { key: "resource", header: t("resource"), cell: (row) => <code>{row.resource}</code> },
        { key: "description", header: t("description"), cell: (row) => row.description ?? "—" },
      ]}
      create={{
        schema: permissionSchema,
        initialValues: { action: "READ", resource: "", description: "" },
        fields: [
          {
            name: "action",
            label: t("action"),
            type: "select",
            options: toOptions(PERMISSION_ACTIONS),
          },
          { name: "resource", label: t("resource"), hint: t("resourceHint") },
          { name: "description", label: t("description") },
        ],
      }}
      // Acción y recurso son la identidad del permiso (los guards los usan): solo se edita la descripción
      edit={{
        schema: permissionUpdateSchema,
        toValues: (row) => ({ description: row.description ?? "" }),
        fields: [{ name: "description", label: t("description") }],
      }}
      remove
    />
  );
}

// ---------- Webhooks ----------
function WebhooksTab() {
  const t = useTranslations("admin.settings");
  const fields = [
    { name: "name", label: t("name") },
    { name: "url", label: t("url"), type: "url" as const, hint: t("urlHint") },
    {
      name: "events",
      label: t("events"),
      type: "checkboxes" as const,
      options: toOptions(WEBHOOK_EVENTS),
    },
    { name: "maxAttempts", label: t("maxAttempts"), type: "number" as const },
    { name: "active", label: t("active"), type: "checkbox" as const },
  ];
  return (
    <AdminResource<WebhookEndpoint, typeof webhookSchema, typeof webhookSchema>
      resource="webhooks"
      path="/webhook"
      title={t("tabs.webhooks")}
      rowLabel={(row) => row.name}
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        {
          key: "url",
          header: t("url"),
          cell: (row) => <span className="break-all text-xs">{row.url}</span>,
        },
        {
          key: "events",
          header: t("events"),
          cell: (row) => row.events.length,
          className: "text-right",
        },
        {
          key: "rate",
          header: t("successRate"),
          cell: (row) =>
            `${(row.metrics.successRate * 100).toFixed(0)} % · ${row.metrics.deliveries}`,
          className: "text-right tabular-nums",
        },
        { key: "active", header: t("active"), cell: (row) => (row.active ? t("yes") : t("no")) },
      ]}
      // "Probar" => entrega un evento webhook.test firmado (rate limit en Express: 10/min)
      actions={(row, run) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void run(
              {
                path: "/webhook/execution",
                method: "POST",
                body: { webhookId: row.id, payload: { ping: true } },
              },
              t("testSent")
            )
          }
        >
          {t("test")}
        </Button>
      )}
      create={{
        schema: webhookSchema,
        fields,
        initialValues: { name: "", url: "", events: [], maxAttempts: 5, active: true },
      }}
      edit={{
        schema: webhookSchema,
        fields,
        toValues: (row) => ({
          name: row.name,
          url: row.url,
          events: row.events,
          maxAttempts: row.maxAttempts,
          active: row.active,
        }),
      }}
      remove
    />
  );
}

// ---------- Automatización n8n ----------
function AutomationTab() {
  const t = useTranslations("admin.settings");
  const format = useFormat();
  const fields = [
    { name: "name", label: t("name") },
    { name: "description", label: t("description") },
    {
      name: "triggerType",
      label: t("trigger"),
      type: "select" as const,
      options: toOptions(TRIGGER_TYPES, (value) => t(`triggers.${value}`)),
    },
    {
      name: "event",
      label: t("event"),
      type: "select" as const,
      options: [{ value: "", label: "—" }, ...toOptions(EVENTS)],
      hint: t("eventHint"),
    },
    { name: "webhookPath", label: t("webhookPath"), hint: t("webhookPathHint") },
    { name: "active", label: t("active"), type: "checkbox" as const },
  ];
  return (
    <AdminResource<
      Workflow & { description?: string | null; webhookPath?: string },
      typeof workflowSchema,
      typeof workflowSchema
    >
      resource="workflows"
      path="/automation"
      title={t("tabs.automation")}
      rowLabel={(row) => row.name}
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        {
          key: "trigger",
          header: t("trigger"),
          cell: (row) => `${t(`triggers.${row.triggerType}`)}${row.event ? ` · ${row.event}` : ""}`,
        },
        {
          key: "runs",
          header: t("runs"),
          cell: (row) => `${row.metrics.runs} · ${(row.metrics.successRate * 100).toFixed(0)} %`,
          className: "text-right tabular-nums",
        },
        {
          key: "last",
          header: t("lastRun"),
          cell: (row) => (row.lastRunAt ? format.dateTime(row.lastRunAt) : "—"),
        },
        { key: "active", header: t("active"), cell: (row) => (row.active ? t("yes") : t("no")) },
      ]}
      actions={(row, run) =>
        row.active && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void run(
                { path: `/automation/${row.id}/run`, method: "POST", body: { payload: {} } },
                t("runStarted")
              )
            }
          >
            {t("run")}
          </Button>
        )
      }
      create={{
        schema: workflowSchema,
        fields,
        initialValues: {
          name: "",
          description: "",
          triggerType: "EVENT",
          event: "order.placed",
          webhookPath: "",
          active: true,
        },
      }}
      edit={{
        schema: workflowSchema,
        fields,
        toValues: (row) => ({
          name: row.name,
          description: row.description ?? "",
          triggerType: row.triggerType as (typeof TRIGGER_TYPES)[number],
          event: row.event ?? "",
          webhookPath: row.webhookPath ?? "",
          active: row.active,
        }),
      }}
      remove
    />
  );
}

// ---------- Auditoría ----------
function AuditTab() {
  const t = useTranslations("admin.settings");
  const format = useFormat();
  return (
    <AdminResource<AuditLog>
      resource="audit"
      path="/audit/log"
      title={t("tabs.audit")}
      search="action"
      rowLabel={(row) => row.action}
      filters={[
        {
          name: "severity",
          label: t("severity"),
          options: toOptions(SEVERITIES, (value) => t(`severities.${value}`)),
        },
        {
          name: "reviewed",
          label: t("reviewed"),
          options: [
            { value: "false", label: t("pending") },
            { value: "true", label: t("yes") },
          ],
        },
      ]}
      columns={[
        { key: "date", header: t("date"), cell: (row) => format.dateTime(row.createdAt) },
        {
          key: "severity",
          header: t("severity"),
          cell: (row) => (
            <Badge tone={SEVERITY_TONE[row.severity]}>{t(`severities.${row.severity}`)}</Badge>
          ),
        },
        { key: "module", header: t("module"), cell: (row) => row.module },
        {
          key: "action",
          header: t("action"),
          cell: (row) => <span className="break-all text-xs">{row.action}</span>,
        },
        {
          key: "status",
          header: "HTTP",
          cell: (row) => row.status ?? "—",
          className: "text-right tabular-nums",
        },
        { key: "ip", header: "IP", cell: (row) => row.ip ?? "—" },
      ]}
      actions={(row, run) =>
        !row.reviewed && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void run({ path: `/audit/log/${row.id}`, method: "PATCH", body: { reviewed: true } })
            }
          >
            {t("markReviewed")}
          </Button>
        )
      }
    />
  );
}

// ---------- Transacciones MCP (Saga) ----------
function McpTab() {
  const t = useTranslations("admin.settings");
  const format = useFormat();
  const canRollback = (row: McpTransaction) =>
    row.status === "COMPLETED" || row.status === "FAILED";
  return (
    <AdminResource<McpTransaction>
      resource="mcp"
      path="/mcp"
      title={t("tabs.mcp")}
      rowLabel={(row) => row.type}
      filters={[{ name: "status", label: t("status"), options: toOptions(MCP_STATUSES) }]}
      columns={[
        { key: "type", header: t("type"), cell: (row) => <code>{row.type}</code> },
        {
          key: "status",
          header: t("status"),
          cell: (row) => <StatusBadge status={row.status} label={row.status} />,
        },
        {
          key: "steps",
          header: t("steps"),
          cell: (row) => row.steps.map((step) => `${step.name}: ${step.status}`).join(" → "),
        },
        { key: "date", header: t("date"), cell: (row) => format.dateTime(row.createdAt) },
      ]}
      actions={(row) =>
        canRollback(row) && (
          <FormAction
            label={t("rollback")}
            title={t("rollbackTitle", { type: row.type })}
            resources={["mcp"]}
            schema={rollbackSchema}
            initialValues={{ reason: "" }}
            fields={[{ name: "reason", label: t("reason") }]}
            toRequest={(values) => ({
              path: `/mcp/${row.id}/rollback`,
              method: "POST",
              body: values,
            })}
          />
        )
      }
    />
  );
}
