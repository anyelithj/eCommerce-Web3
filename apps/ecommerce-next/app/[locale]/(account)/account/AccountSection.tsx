// AccountSection.tsx => piezas comunes de las páginas del hub de cuenta (DRY): metadatos traducidos y encabezado.
// Cada página solo declara su clave ("orders", "wishlist"...) en vez de repetir el mismo generateMetadata.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

// accountMetadata => fábrica de generateMetadata para una sección (Factory Function + clausura sobre "key")
export function accountMetadata(key: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const t = await getTranslations({ locale: (await params).locale, namespace: "account.nav" });
    return { title: t(key) };
  };
}

// AccountHeading => título de la sección + acción opcional a la derecha (layout responsive)
export function AccountHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}
