// WishlistView.tsx (Client Component) => lista de deseos del usuario reutilizando la grilla del catálogo
// (cada tarjeta ya trae su botón de corazón para quitarla: misma UX en todo el sitio).
"use client";

import { useTranslations } from "next-intl";
import { useWishlist } from "@/entities/user/api/user.api";
import { ProductGrid } from "@/features/product/ui/ProductGrid";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";

export function WishlistView() {
  const t = useTranslations("account.pages");
  const errorMessage = useErrorMessage();
  const { data: products, isLoading, isError, error } = useWishlist();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError)
    return (
      <p role="alert" className="text-destructive">
        {errorMessage(error)}
      </p>
    );
  return (
    <ProductGrid products={products ?? []} priorityCount={0} emptyMessage={t("wishlistEmpty")} />
  );
}
