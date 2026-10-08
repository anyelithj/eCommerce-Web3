import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrderDetail } from "@/features/order/ui/OrderDetail";
import { Link } from "@/shared/lib/i18n/navigation";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";
import { routes } from "@/shared/constants/routes";

type Props = PageProps<{ id: string }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account.pages" });
  return { title: t("orderDetail") };
}

export default async function OrderPage({ params }: Props) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  const { id } = await params;
  return (
    <>
      <Link href={routes.orders} className="text-sm text-muted-foreground underline">
        {t("backToOrders")}
      </Link>
      <OrderDetail orderId={id} />
    </>
  );
}
