// loading.tsx (/account/*) => carga al cambiar de sección del hub. El loading.tsx de (account) envuelve el segmento
// "account" entero y NO se vuelve a mostrar al navegar entre secciones hermanas (/account/orders -> /account/wishlist);
// este sí, porque envuelve cada sección (el aside y el header quedan fijos). Spinner + esqueleto de una sección.
import { useTranslations } from "next-intl";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Spinner } from "@/shared/ui/Spinner";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div role="status" className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t("loadingContent")}
      </p>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
