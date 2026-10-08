// SiteChrome.tsx (capa app, carpeta privada "_components": no genera ruta) => barra mínima de las páginas de cuenta y
// checkout que aún viven en Next. La tienda (catálogo, carrito, navbar y pie) vive en Nuxt: el logo vuelve allá.
// Lo reutilizan los layouts (account) y (commerce) (DRY).
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import UserMenu from "@/widgets/auth/UserMenu";
import AuthBanner from "@/widgets/auth/AuthBanner";
import { config } from "@/shared/constants/config";

export async function SiteChrome({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const store = locale === "es" ? config.cmsUrl : `${config.cmsUrl}/${locale}`; // Tienda Nuxt: español sin prefijo
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <a href={store} className="text-lg font-bold text-foreground">
              {config.siteName}
            </a>
            <a href={store} className="text-sm text-slate-600 underline-offset-4 hover:underline">
              {t("backToStore")}
            </a>
          </div>
          <UserMenu />
        </div>
      </header>
      <AuthBanner />
      {/* id="main-content" => destino del enlace "Saltar al contenido" (WCAG 2.4.1) */}
      <main id="main-content" className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
