// AccountOverview.tsx (Client Component) => resumen del hub: saludo y últimos pedidos.
// Compone features (order) en la capa app: las features no se conocen entre sí.
"use client";

import { useTranslations } from "next-intl";
import { useProfile } from "@/entities/user/api/user.api";
import { OrderList } from "@/features/order/ui/OrderList";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Link } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";

export function AccountOverview() {
  const t = useTranslations("account.overview");
  const { data: profile, isLoading } = useProfile();

  return (
    <>
      {isLoading ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <h1 className="text-2xl font-semibold">
          {t("greeting", { name: profile?.firstName ?? "" })}
        </h1>
      )}
      {/* Aviso de cuenta sin verificar: afecta la entrega de emails de pedidos */}
      {profile && !profile.isVerified && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t("unverified")}
        </p>
      )}
      <section aria-labelledby="recent-orders-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders-title" className="text-lg font-semibold">
            {t("recentOrders")}
          </h2>
          <Link href={routes.orders} className="text-sm underline">
            {t("viewAll")}
          </Link>
        </div>
        <OrderList />
      </section>
    </>
  );
}
