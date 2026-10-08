import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPage } from "@/shared/lib/i18n/server";
import { CheckoutStepView } from "../CheckoutStepView";
import type { PageProps } from "@/shared/types/next.types";

export async function generateMetadata({ params }: PageProps<{ id: string }>): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "checkout.page" });
  return { title: t("metaPayment") };
}

export default async function CheckoutPaymentPage({ params }: PageProps<{ id: string }>) {
  await initPage(params);
  return <CheckoutStepView id={(await params).id} step="payment" />;
}
