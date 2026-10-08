"use client";

import { useTranslations } from "next-intl";
import { useCheckout } from "@/features/checkout/api/checkout.api";
import { CheckoutStepper, type CheckoutStep } from "@/features/checkout/ui/CheckoutStepper";
import { OrderSummary } from "@/features/checkout/ui/OrderSummary";
import { AddressForm } from "@/features/checkout/ui/AddressForm";
import { PaymentForm } from "@/features/checkout/ui/PaymentForm";
import { ConfirmOrder } from "@/features/checkout/ui/ConfirmButton";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { Link } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";

export function CheckoutStepView({ id, step }: { id: string; step: CheckoutStep }) {
  const t = useTranslations("checkout.page");
  const errorMessage = useErrorMessage();
  const { data: session, isLoading, isError, error } = useCheckout(id);

  if (step === "confirm") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <CheckoutStepper current="confirm" />
        <ConfirmOrder checkoutSessionId={id} />
      </div>
    );
  }
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !session) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-destructive">{errorMessage(error, t("notFound"))}</p>
        <Link href={routes.cart} className="underline">
          {t("backToCart")}
        </Link>
      </div>
    );
  }
  if (session.status !== "OPEN") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-slate-700">{t("inactive")}</p>
        <Link
          href={session.orderId ? routes.order(session.orderId) : routes.cart}
          className="underline"
        >
          {session.orderId ? t("viewOrder") : t("goToCart")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CheckoutStepper current={step} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {step === "address" && <AddressForm session={session} />}
          {step === "payment" && <PaymentForm session={session}>{null}</PaymentForm>}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary session={session} />
        </aside>
      </div>
    </div>
  );
}
