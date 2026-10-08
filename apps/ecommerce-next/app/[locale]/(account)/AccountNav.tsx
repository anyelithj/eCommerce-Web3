// AccountNav.tsx (Client Component) => menú del hub de cuenta; "usePathname" (next-intl, ruta SIN prefijo de idioma)
// marca la sección activa con aria-current="page" (el lector de pantalla anuncia "página actual").
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";
import { cn } from "@/shared/lib/cn";
import { LinkPending } from "@/shared/ui/Spinner";

// Configuración declarativa (datos, no JSX repetido): agregar una sección = agregar una fila
const LINKS = [
  { href: routes.account, key: "overview" },
  { href: routes.orders, key: "orders" },
  { href: routes.wishlist, key: "wishlist" },
  { href: routes.addresses, key: "addresses" },
  { href: routes.notifications, key: "notifications" },
  { href: routes.settings, key: "settings" },
] as const;

export function AccountNav() {
  const t = useTranslations("account.nav");
  const pathname = usePathname();
  // Activa: coincidencia exacta para /account; prefijo para el resto (/account/orders/123 => "Pedidos")
  const isActive = (href: string) =>
    href === routes.account ? pathname === href : pathname.startsWith(href);

  return (
    <nav aria-label={t("label")} className="lg:sticky lg:top-24 lg:self-start">
      {/* Móvil: fila con scroll horizontal; desktop: columna */}
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                isActive(link.href) && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {t(link.key)}
              <LinkPending />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
