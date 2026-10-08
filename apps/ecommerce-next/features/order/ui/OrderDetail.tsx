// OrderDetail.tsx => detalle completo del pedido: ítems, totales, dirección, seguimiento, factura y acciones
// (cancelar antes del envío / solicitar devolución si fue entregado).
"use client";

import { useState } from "react";
import { downloadInvoice, useCancelOrder, useOrder, useRequestRefund } from "../api/order.api";
import {
  cancelSchema,
  refundSchema,
  REFUND_REASONS,
  type CancelFormValues,
  type RefundFormValues,
} from "../lib/order.validator";
import { OrderStatus } from "./OrderStatus";
import { OrderTracking } from "./OrderTracking";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { useAuth } from "@/shared/hook/useAuth";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/hook/useFormat";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Skeleton } from "@/shared/ui/Skeleton";
import { toast } from "@/shared/ui/Toast";

const CANCELLABLE = ["CONFIRMED", "PREPARING", "PACKED"];

function CancelDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("order.cancel");
  const tRoot = useTranslations();
  const errorMessage = useErrorMessage();
  const cancel = useCancelOrder(orderId);
  const form = useZodForm({
    schema: cancelSchema,
    initialValues: { reason: "" },
    onSubmit: (values: CancelFormValues) =>
      cancel.mutate(values.reason, {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error)),
      }),
  });
  const reasonError = form.error("reason");
  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <form onSubmit={form.handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="cancel-reason" className="text-sm font-medium">
          {t("reason")}
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          className="rounded-md border border-slate-300 p-2 text-sm"
          aria-invalid={reasonError ? true : undefined}
          {...form.getFieldProps("reason")}
        />
        {reasonError && (
          <p role="alert" className="text-sm text-red-600">
            {tRoot(reasonError)}
          </p>
        )}
        <Button type="submit" variant="danger" loading={cancel.isPending}>
          {t("confirm")}
        </Button>
      </form>
    </Modal>
  );
}

function RefundDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("order.refund");
  const tRoot = useTranslations();
  const errorMessage = useErrorMessage();
  const refund = useRequestRefund(orderId);
  const form = useZodForm({
    schema: refundSchema,
    initialValues: { reason: "DAMAGED", description: "", evidenceUrls: [] },
    onSubmit: (values: RefundFormValues) =>
      refund.mutate(values, {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error)),
      }),
  });
  const descriptionError = form.error("description");
  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <form onSubmit={form.handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="refund-reason" className="text-sm font-medium">
          {t("reason")}
        </label>
        <select
          id="refund-reason"
          className="h-10 rounded-md border border-slate-300 px-2 text-sm"
          {...form.getFieldProps("reason")}
        >
          {REFUND_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {tRoot(`order.refundReasons.${reason}`)}
            </option>
          ))}
        </select>
        <label htmlFor="refund-description" className="text-sm font-medium">
          {t("description")}
        </label>
        <textarea
          id="refund-description"
          rows={4}
          className="rounded-md border border-slate-300 p-2 text-sm"
          aria-invalid={descriptionError ? true : undefined}
          {...form.getFieldProps("description")}
        />
        {descriptionError && (
          <p role="alert" className="text-sm text-red-600">
            {tRoot(descriptionError)}
          </p>
        )}
        <Button type="submit" loading={refund.isPending}>
          {t("submit")}
        </Button>
      </form>
    </Modal>
  );
}

export function OrderDetail({ orderId }: { orderId: string }) {
  const t = useTranslations("order.detail");
  const errorMessage = useErrorMessage();
  const format = useFormat();
  const { accessToken } = useAuth();
  const { data: order, isLoading, isError, error } = useOrder(orderId);
  const [dialog, setDialog] = useState<"cancel" | "refund" | null>(null);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !order)
    return (
      <p role="alert" className="text-red-600">
        {errorMessage(error, t("notFound"))}
      </p>
    );
  const money = (cents: number) => format.money(cents, order.currency);
  const invoice = order.invoice;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title", { number: order.orderNumber })}</h1>
          <p className="text-sm text-slate-600">
            {t("placedOn")} <time dateTime={order.placedAt}>{format.dateTime(order.placedAt)}</time>
          </p>
        </div>
        <OrderStatus status={order.status} />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="items-title">
            <h2 id="items-title" className="mb-3 text-lg font-semibold">
              {t("items")}
            </h2>
            <ul className="divide-y divide-slate-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="w-16 shrink-0">
                    <ProductImage src={item.imageUrl} alt="" sizes="64px" className="rounded-md" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-slate-500">
                      {item.variantName} · x{item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{money(item.totalCents)}</p>
                </li>
              ))}
            </ul>
          </section>
          <OrderTracking shipment={order.shipment} />
        </div>

        <aside className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt>{t("subtotal")}</dt>
              <dd>{money(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>{t("discount")}</dt>
                <dd>−{money(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{t("shipping")}</dt>
              <dd>{order.shippingCents === 0 ? t("free") : money(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("tax")}</dt>
              <dd>{money(order.taxCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <dt>{t("total")}</dt>
              <dd>{money(order.totalCents)}</dd>
            </div>
          </dl>
          <section
            aria-labelledby="address-title"
            className="rounded-lg border border-slate-200 p-4 text-sm"
          >
            <h2 id="address-title" className="mb-1 font-semibold">
              {t("shipTo")}
            </h2>
            <address className="not-italic text-slate-700">
              {order.shippingAddress.recipientName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}
            </address>
          </section>
          {invoice && accessToken && (
            <Button
              variant="secondary"
              onClick={() =>
                downloadInvoice(invoice.id, invoice.number, accessToken).catch((err: unknown) =>
                  toast.error(errorMessage(err))
                )
              }
            >
              {t("downloadInvoice", { number: invoice.number })}
            </Button>
          )}
          {CANCELLABLE.includes(order.status) && (
            <Button variant="danger" onClick={() => setDialog("cancel")}>
              {t("cancel")}
            </Button>
          )}
          {order.status === "DELIVERED" && (
            <Button variant="secondary" onClick={() => setDialog("refund")}>
              {t("requestRefund")}
            </Button>
          )}
          {order.refunds.length > 0 && (
            <p className="text-sm text-slate-600">
              {t("refundsInProgress", { count: order.refunds.length })}
            </p>
          )}
        </aside>
      </div>

      <CancelDialog orderId={order.id} open={dialog === "cancel"} onClose={() => setDialog(null)} />
      <RefundDialog orderId={order.id} open={dialog === "refund"} onClose={() => setDialog(null)} />
    </div>
  );
}
