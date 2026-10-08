// loading.tsx (commerce) => UI de carga del App Router: Next la muestra al instante (streaming con Suspense) mientras el
// Server Component de la ruta obtiene sus datos => el usuario ve respuesta inmediata (mejor INP/percepción).
// Solo en (account) y (commerce): un loading.tsx en app/[locale] activaría streaming en TODAS las páginas y
// notFound() respondería con estado 200 (soft-404, malo para SEO) en el catálogo.
import { useTranslations } from "next-intl";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4"
    >
      {/* "Array.from({ length: 8 })" => 8 tarjetas esqueleto con la forma de la grilla final (sin CLS) */}
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
      <span className="sr-only">{t("loadingContent")}</span>
    </div>
  );
}
