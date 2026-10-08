import { getTranslations } from "next-intl/server";
import { OrderList } from "@/features/order/ui/OrderList";
import { AccountHeading, accountMetadata } from "../AccountSection";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export const generateMetadata = accountMetadata("orders");

export default async function OrdersPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  return (
    <>
      <AccountHeading>{t("orders")}</AccountHeading>
      <OrderList />
    </>
  );
}
