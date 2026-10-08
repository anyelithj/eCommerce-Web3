// AdminSection.tsx => piezas comunes de las páginas del panel admin (DRY, mismo enfoque que AccountSection):
// metadatos traducidos por sección, encabezado <h1> único por página (jerarquía de títulos accesible) y la fábrica
// "adminPage" que arma cada página (Server Component) con su sección de cliente.
// Patrones: Factory Function (adminMetadata, adminPage) + Template Method (todas las páginas tienen la misma forma).
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

// adminMetadata => fábrica de generateMetadata (Factory Function + clausura sobre "key")
export function adminMetadata(key: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const t = await getTranslations({ locale: (await params).locale, namespace: "admin.nav" });
    return { title: t(key) };
  };
}

// AdminHeading => título de la página + descripción opcional
export function AdminHeading({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-slate-900">{children}</h1>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  );
}

// adminPage => Server Component de una sección: fija el idioma (render estático por locale), pinta el <h1> traducido
// y monta la sección interactiva (Client Component). "ComponentType" => cualquier componente sin props.
// El RBAC ya lo resolvieron middleware.ts y el layout del grupo (admin): aquí no se repite (DRY).
export function adminPage(key: string, Section: ComponentType) {
  return async function AdminPage({ params }: PageProps) {
    await initPage(params);
    const t = await getTranslations("admin");
    return (
      <>
        <AdminHeading description={t(`descriptions.${key}`)}>{t(`nav.${key}`)}</AdminHeading>
        <Section />
      </>
    );
  };
}
