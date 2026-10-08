// MarketingAdmin.tsx (Client Component) => marketing y correo: campañas por segmento (email/push/WhatsApp) con
// programación y métricas de apertura, bitácora de correos enviados (Nodemailer), plantillas con variables
// "{{ nombre }}" y cupones de descuento.
// Patrones: Composite (pestañas) + Command (enviar ahora / enviar correo). Ahorro: las campañas se envían por lotes
// desde el backend; el panel solo consulta la pestaña abierta.
"use client";

import { useTranslations } from "next-intl";
import {
  useAdminList,
  type Campaign,
  type Coupon,
  type EmailLog,
  type EmailTemplate,
} from "../api/dashboard.api";
import { AdminResource, FormAction, isoOrUndefined, toOptions } from "./AdminResource";
import { AdminTabs } from "./AdminTabs";
import { StatusBadge } from "./OrdersAdmin";
import {
  campaignSchema,
  couponSchema,
  sendEmailSchema,
  templateSchema,
} from "../lib/dashboard.validator";
import { useFormat } from "@/shared/hook/useFormat";
import { Button } from "@/shared/ui/Button";

const CHANNELS = ["EMAIL", "PUSH", "WHATSAPP"] as const;
const AUDIENCES = ["ALL", "VIP", "REGULAR", "NEW", "INACTIVE"] as const;
const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "ARCHIVED"] as const;
const EMAIL_STATUSES = ["QUEUED", "SENT", "FAILED"] as const;
const COUPON_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
const couponEditSchema = couponSchema.omit({ code: true }); // El código no cambia al editar (los clientes ya lo tienen)

export function MarketingAdmin() {
  const t = useTranslations("admin.marketing");
  return (
    <AdminTabs
      section="marketing"
      label={t("tabs.label")}
      tabs={[
        { id: "campaigns", label: t("tabs.campaigns"), render: () => <CampaignsTab /> },
        { id: "emails", label: t("tabs.emails"), render: () => <EmailsTab /> },
        { id: "templates", label: t("tabs.templates"), render: () => <TemplatesTab /> },
        { id: "coupons", label: t("tabs.coupons"), render: () => <CouponsTab /> },
      ]}
    />
  );
}

// ---------- Campañas ----------
function CampaignsTab() {
  const t = useTranslations("admin.marketing");
  const format = useFormat();
  const fields = [
    { name: "name", label: t("name") },
    {
      name: "channel",
      label: t("channel"),
      type: "select" as const,
      options: toOptions(CHANNELS, (value) => t(`channels.${value}`)),
    },
    {
      name: "audience",
      label: t("audience"),
      type: "select" as const,
      options: toOptions(AUDIENCES, (value) => t(`audiences.${value}`)),
    },
    { name: "subject", label: t("subject") },
    { name: "content", label: t("content"), type: "textarea" as const, hint: t("contentHint") },
    {
      name: "scheduledAt",
      label: t("scheduledAt"),
      type: "datetime-local" as const,
      hint: t("scheduleHint"),
    },
  ];
  // toBody => fecha local del formulario -> ISO UTC (el backend exige fecha futura)
  const toBody = (values: { scheduledAt?: string | undefined }) => ({
    ...values,
    scheduledAt: isoOrUndefined(values.scheduledAt),
  });
  const editable = (row: Campaign) => row.status === "DRAFT" || row.status === "SCHEDULED"; // Lo enviado no se edita
  return (
    <AdminResource<Campaign, typeof campaignSchema, typeof campaignSchema>
      resource="campaigns"
      path="/marketing/campaign"
      title={t("tabs.campaigns")}
      rowLabel={(row) => row.name}
      filters={[
        {
          name: "status",
          label: t("status"),
          options: toOptions(CAMPAIGN_STATUSES, (value) => t(`campaignStatus.${value}`)),
        },
        {
          name: "channel",
          label: t("channel"),
          options: toOptions(CHANNELS, (value) => t(`channels.${value}`)),
        },
      ]}
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        { key: "channel", header: t("channel"), cell: (row) => t(`channels.${row.channel}`) },
        { key: "audience", header: t("audience"), cell: (row) => t(`audiences.${row.audience}`) },
        {
          key: "status",
          header: t("status"),
          cell: (row) => (
            <StatusBadge status={row.status} label={t(`campaignStatus.${row.status}`)} />
          ),
        },
        {
          key: "sent",
          header: t("sent"),
          cell: (row) => `${row.metrics.sent}/${row.metrics.targeted}`,
          className: "text-right tabular-nums",
        },
        {
          key: "open",
          header: t("openRate"),
          cell: (row) => `${(row.metrics.openRate * 100).toFixed(1)} %`,
          className: "text-right tabular-nums",
        },
        {
          key: "date",
          header: t("scheduledAt"),
          cell: (row) =>
            (row.sentAt ?? row.scheduledAt)
              ? format.dateTime((row.sentAt ?? row.scheduledAt) as string)
              : "—",
        },
      ]}
      // "Enviar ahora" => PATCH { sendNow: true } (Command); solo para borradores y programadas
      actions={(row, run) =>
        editable(row) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              window.confirm(t("confirmSend", { name: row.name })) &&
              void run(
                { path: `/marketing/campaign/${row.id}`, method: "PATCH", body: { sendNow: true } },
                t("sending")
              )
            }
          >
            {t("sendNow")}
          </Button>
        )
      }
      create={{
        schema: campaignSchema,
        fields,
        toBody,
        initialValues: {
          name: "",
          channel: "EMAIL",
          audience: "ALL",
          subject: "",
          content: "",
          scheduledAt: "",
        },
      }}
      edit={{
        schema: campaignSchema,
        fields,
        toBody,
        when: editable,
        toValues: (row) => ({
          name: row.name,
          channel: row.channel,
          audience: row.audience as (typeof AUDIENCES)[number],
          subject: row.subject,
          content: row.content,
          scheduledAt: row.scheduledAt?.slice(0, 16) ?? "",
        }),
      }}
      remove
    />
  );
}

// ---------- Correos enviados ----------
function EmailsTab() {
  const t = useTranslations("admin.marketing");
  const format = useFormat();
  // Plantillas para el selector del envío manual (misma clave de caché que la pestaña Plantillas: sin doble petición)
  const templates = useAdminList<EmailTemplate>("templates", "/email/template", {
    page: 1,
    limit: 100,
  });
  return (
    <AdminResource<EmailLog>
      resource="emails"
      path="/email"
      title={t("tabs.emails")}
      search="to"
      rowLabel={(row) => row.to}
      filters={[
        {
          name: "status",
          label: t("status"),
          options: toOptions(EMAIL_STATUSES, (value) => t(`emailStatus.${value}`)),
        },
      ]}
      toolbar={
        <FormAction
          variant="primary"
          label={t("sendEmail")}
          title={t("sendEmail")}
          resources={["emails"]}
          submitLabel={t("send")}
          success={t("emailQueued")}
          schema={sendEmailSchema}
          initialValues={{ to: "", templateId: "", variables: "" }}
          fields={[
            { name: "to", label: t("to"), type: "email" },
            {
              name: "templateId",
              label: t("template"),
              type: "select",
              options: [
                { value: "", label: "—" },
                ...(templates.data?.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ],
            },
            { name: "variables", label: t("variables"), hint: t("variablesHint") },
          ]}
          toRequest={(values) => ({ path: "/email/send", method: "POST", body: values })}
        />
      }
      columns={[
        { key: "to", header: t("to"), cell: (row) => row.to },
        { key: "subject", header: t("subject"), cell: (row) => row.subject },
        {
          key: "status",
          header: t("status"),
          cell: (row) => <StatusBadge status={row.status} label={t(`emailStatus.${row.status}`)} />,
        },
        {
          key: "opens",
          header: t("opens"),
          cell: (row) => row.openCount,
          className: "text-right tabular-nums",
        },
        { key: "date", header: t("date"), cell: (row) => format.dateTime(row.createdAt) },
      ]}
    />
  );
}

// ---------- Plantillas ----------
function TemplatesTab() {
  const t = useTranslations("admin.marketing");
  const fields = [
    { name: "name", label: t("name") },
    { name: "subject", label: t("subject") },
    { name: "html", label: t("html"), type: "textarea" as const, hint: t("htmlHint") },
  ];
  return (
    <AdminResource<EmailTemplate, typeof templateSchema, typeof templateSchema>
      resource="templates"
      path="/email/template"
      title={t("tabs.templates")}
      rowLabel={(row) => row.name}
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        { key: "subject", header: t("subject"), cell: (row) => row.subject },
        {
          key: "vars",
          header: t("variables"),
          cell: (row) => row.variables.map((name) => `{{ ${name} }}`).join(" ") || "—",
        },
        { key: "locale", header: t("locale"), cell: (row) => row.locale.toUpperCase() },
      ]}
      create={{
        schema: templateSchema,
        fields,
        initialValues: { name: "", subject: "", html: "" },
      }}
      edit={{
        schema: templateSchema,
        fields,
        toValues: (row) => ({ name: row.name, subject: row.subject, html: row.html }),
      }}
      remove
    />
  );
}

// ---------- Cupones ----------
function CouponsTab() {
  const t = useTranslations("admin.marketing");
  const format = useFormat();
  const fields = [
    { name: "code", label: t("code") },
    {
      name: "type",
      label: t("couponType"),
      type: "select" as const,
      options: toOptions(COUPON_TYPES, (value) => t(`couponTypes.${value}`)),
    },
    { name: "value", label: t("value"), type: "number" as const, hint: t("valueHint") },
    { name: "usageLimit", label: t("usageLimit"), type: "number" as const },
    { name: "endsAt", label: t("endsAt"), type: "date" as const },
  ];
  // toBody => "monto fijo" se escribe en pesos y viaja en centavos; porcentaje y envío gratis van tal cual
  const toBody = (values: { type: string; value: number; endsAt?: string | undefined }) => ({
    ...values,
    value: values.type === "FIXED_AMOUNT" ? values.value * 100 : values.value,
    endsAt: values.endsAt ? new Date(`${values.endsAt}T23:59:59`).toISOString() : undefined,
  });
  return (
    <AdminResource<Coupon, typeof couponSchema, typeof couponEditSchema>
      resource="coupons"
      path="/coupon"
      title={t("tabs.coupons")}
      rowLabel={(row) => row.code}
      filters={[
        {
          name: "active",
          label: t("status"),
          options: [
            { value: "true", label: t("active") },
            { value: "false", label: t("inactive") },
          ],
        },
      ]}
      columns={[
        {
          key: "code",
          header: t("code"),
          cell: (row) => <code className="font-semibold">{row.code}</code>,
        },
        { key: "type", header: t("couponType"), cell: (row) => t(`couponTypes.${row.type}`) },
        {
          key: "value",
          header: t("value"),
          cell: (row) =>
            row.type === "PERCENTAGE"
              ? `${row.value} %`
              : row.type === "FIXED_AMOUNT"
                ? format.money(row.value)
                : "—",
          className: "text-right",
        },
        {
          key: "used",
          header: t("used"),
          cell: (row) => `${row.usedCount}${row.usageLimit ? ` / ${row.usageLimit}` : ""}`,
          className: "text-right tabular-nums",
        },
        {
          key: "ends",
          header: t("endsAt"),
          cell: (row) => (row.endsAt ? format.date(row.endsAt) : "—"),
        },
      ]}
      create={{
        schema: couponSchema,
        fields,
        toBody,
        initialValues: { code: "", type: "PERCENTAGE", value: 10, usageLimit: "", endsAt: "" },
      }}
      edit={{
        schema: couponEditSchema,
        fields: fields.slice(1),
        toBody,
        toValues: (row) => ({
          type: row.type,
          value: row.type === "FIXED_AMOUNT" ? row.value / 100 : row.value,
          usageLimit: row.usageLimit ?? "",
          endsAt: row.endsAt?.slice(0, 10) ?? "",
        }),
      }}
      remove
    />
  );
}
