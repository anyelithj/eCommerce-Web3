import { useTranslations } from "next-intl";
import type { CheckoutSession } from "@/entities/order/model/order.types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { useFormat } from "@/shared/hook/useFormat";

export function OrderSummary({ session }: { session: CheckoutSession }) {
  const t = useTranslations("checkout.summary");
  const format = useFormat();
  const money = (cents: number) => format.money(cents, session.currency);
  return (
    <section
      aria-labelledby="order-summary-title"
      className="flex flex-col gap-4 rounded-lg bg-slate-50 p-4"
    >
      <h2 id="order-summary-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <ul className="flex flex-col gap-3">
        {session.items.map((item) => (
          <li key={item.variantId} className="flex items-center gap-3">
            <div className="relative w-14 shrink-0">
              <ProductImage src={item.imageUrl} alt="" sizes="56px" className="rounded-md" />
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-slate-900">{item.productName}</p>
              <p className="text-xs text-slate-500">{item.variantName}</p>
            </div>
            <p className="text-sm">{money(item.unitPriceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-slate-200 pt-3 text-sm">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd>{money(session.subtotalCents)}</dd>
        </div>
        {session.discountCents > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>
              {t("discount")} {session.couponCode && `(${session.couponCode})`}
            </dt>
            <dd>−{money(session.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>{t("shipping")}</dt>
          <dd>
            {session.shippingRateCode
              ? session.shippingCents === 0
                ? t("free")
                : money(session.shippingCents)
              : t("pending")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("tax")}</dt>
          <dd>{money(session.taxCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <dt>{t("total")}</dt>
          <dd>{money(session.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}
