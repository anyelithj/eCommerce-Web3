import type { ReactNode } from "react";
import { Link } from "@/shared/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import type { CheckoutSession } from "@/entities/order/model/order.types";
import { routes } from "@/shared/constants/routes";

export function PaymentForm({
  session,
  children,
}: {
  session: CheckoutSession;
  children: ReactNode;
}) {
  const t = useTranslations("checkout.payment");
  const address = session.shippingAddress;
  return (
    <div className="flex flex-col gap-6">
      {address && (
        <section
          aria-labelledby="delivery-title"
          className="rounded-lg border border-slate-200 p-4 text-sm"
        >
          <div className="flex items-center justify-between">
            <h2 id="delivery-title" className="font-semibold">
              {t("deliverTo")}
            </h2>
            <Link href={routes.checkoutAddress(session.id)} className="text-slate-600 underline">
              {t("change")}
            </Link>
          </div>
          <p className="mt-1 text-slate-700">
            {address.recipientName} — {address.line1}
            {address.line2 && `, ${address.line2}`}, {address.city}
          </p>
        </section>
      )}
      <section aria-labelledby="payment-title" className="flex flex-col gap-3">
        <h2 id="payment-title" className="text-lg font-semibold">
          {t("method")}
        </h2>
        <p className="text-xs text-slate-500">{t("stripeNote")}</p>
        {children}
      </section>
    </div>
  );
}
