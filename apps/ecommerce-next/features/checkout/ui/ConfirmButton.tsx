// ConfirmButton.tsx => acciones de confirmación del checkout:
//  - StartCheckoutButton: inicia la saga desde el carrito (reserva stock) y lleva al paso de envío
//  - ConfirmOrder: tras pagar, espera a que el webhook confirme y muestra el pedido creado
"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/shared/lib/i18n/navigation";
import { useInitCheckout, usePlaceOrder } from "../api/checkout.api";
import { useCheckoutDraft } from "../model/checkout.store";
import { Button } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { trackEvent } from "@/shared/lib/analytics";
import { routes } from "@/shared/constants/routes";
import { useFormat } from "@/shared/hook/useFormat";

export function StartCheckoutButton({
  couponCode,
  disabled = false,
  onStarted,
}: {
  couponCode?: string | null;
  disabled?: boolean;
  onStarted?: () => void;
}) {
  const t = useTranslations("checkout");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const init = useInitCheckout();
  const { reset: resetDraft } = useCheckoutDraft();

  return (
    <Button
      size="lg"
      fullWidth
      disabled={disabled}
      loading={init.isPending}
      onClick={() =>
        init.mutate(couponCode ?? undefined, {
          onSuccess: (session) => {
            resetDraft();
            trackEvent("begin_checkout", {
              value: session.totalCents / 100,
              currency: session.currency,
            });
            onStarted?.();
            router.push(routes.checkoutAddress(session.id));
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    >
      {t("start")}
    </Button>
  );
}

export function ConfirmOrder({ checkoutSessionId }: { checkoutSessionId: string }) {
  const t = useTranslations("checkout.confirm");
  const errorMessage = useErrorMessage();
  const { money } = useFormat();
  const { data: order, isError, error, ready, mutate: placeOrder } = usePlaceOrder();
  // "useRef" => la confirmación se envía UNA vez (React StrictMode ejecuta los efectos dos veces en desarrollo)
  const started = useRef(false);

  // Al llegar desde el pago (y con sesión lista) se confirma el pedido
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    placeOrder(checkoutSessionId);
  }, [ready, placeOrder, checkoutSessionId]);

  // Evento de conversión "purchase" una sola vez al obtener el pedido
  useEffect(() => {
    if (order)
      trackEvent("purchase", {
        transaction_id: order.orderNumber,
        value: order.totalCents / 100,
        currency: order.currency,
      });
  }, [order]);

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 text-center">
        <p className="text-red-700">{errorMessage(error, t("failed"))}</p>
        <Link href={routes.orders} className="underline">
          {t("reviewOrders")}
        </Link>
      </div>
    );
  }
  if (!order) {
    return (
      <p role="status" className="text-center text-slate-700">
        {t("pending")}
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-center">
      <p className="text-4xl" aria-hidden="true">
        🎉
      </p>
      <h1 className="text-2xl font-semibold">{t("thanks")}</h1>
      <p className="text-slate-700">
        {t.rich("confirmed", {
          number: order.orderNumber,
          total: money(order.totalCents, order.currency),
          strong: (chunk) => <strong>{chunk}</strong>,
        })}
      </p>
      <div className="flex gap-3">
        <Link
          href={routes.order(order.id)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("viewOrder")}
        </Link>
        <Link
          href={routes.products}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          {t("keepShopping")}
        </Link>
      </div>
    </div>
  );
}
