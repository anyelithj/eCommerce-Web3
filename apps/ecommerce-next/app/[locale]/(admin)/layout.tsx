// layout.tsx (admin) => chrome del panel de administración (Fase 7): cabecera propia + menú lateral + contenido.
// RBAC en dos capas (defensa en profundidad, patrón Guard): middleware.ts redirige antes de renderizar y este layout
// (Server Component) vuelve a comprobar la sesión; si no es ADMIN responde 404 real (no revela que el panel existe).
// SEO: noindex (área privada). Rendimiento: sin el header/footer de la tienda (menos HTML y JS por página).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/shared/lib/auth-config";
import { initPage } from "@/shared/lib/i18n/server";
import { Link } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";
import { config } from "@/shared/constants/config";
import { AdminSidebar } from "@/features/admin-dashboard/ui/AdminSidebar";
import UserMenu from "@/widgets/auth/UserMenu";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

// "template" => cada página aporta su título y el layout agrega el sufijo del panel
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return {
    title: { template: `%s · ${t("title")}`, default: t("title") },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children, params }: Props) {
  await initPage(params);
  const session = await auth();
  if (!session?.user.roles.includes("ADMIN")) notFound(); // Guard RBAC del lado del servidor
  const t = await getTranslations("admin");

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={routes.dashboard}
              className="text-base font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("title")}
            </Link>
            <a
              href={
                (await params).locale === "es"
                  ? config.cmsUrl
                  : `${config.cmsUrl}/${(await params).locale}`
              }
              className="text-sm text-slate-600 underline-offset-4 hover:underline"
            >
              {t("backToStore")}
            </a>
          </div>
          <UserMenu />
        </div>
      </header>
      {/* id="main-content" => destino del enlace "Saltar al contenido" del layout raíz (WCAG 2.4.1) */}
      <main
        id="main-content"
        className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]"
      >
        <AdminSidebar />
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </main>
    </>
  );
}
