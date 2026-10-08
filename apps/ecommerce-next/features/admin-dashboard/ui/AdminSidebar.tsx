"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";
import { config } from "@/shared/constants/config";
import { cn } from "@/shared/lib/cn";
import { LinkPending } from "@/shared/ui/Spinner";

const LINKS = [
  { href: routes.dashboard, key: "overview", icon: "📊" },
  { href: routes.adminAnalytics, key: "analytics", icon: "📈" },
  { href: routes.adminProducts, key: "products", icon: "🏷️" },
  { href: routes.adminOrders, key: "orders", icon: "📦" },
  { href: routes.adminCustomers, key: "customers", icon: "👥" },
  { href: routes.adminInventory, key: "inventory", icon: "🏬" },
  { href: routes.adminMarketing, key: "marketing", icon: "📣" },
  { href: routes.adminSettings, key: "settings", icon: "⚙️" },
] as const;

export function AdminSidebar() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const locale = useLocale();
  const contentPanel = `${locale === "es" ? config.cmsUrl : `${config.cmsUrl}/${locale}`}/cms-page`;
  const isActive = (href: string) =>
    href === routes.dashboard ? pathname === href : pathname.startsWith(href);

  return (
    <nav aria-label={t("label")} className="lg:sticky lg:top-6 lg:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive(link.href) && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <span aria-hidden="true">{link.icon}</span>
              {t(link.key)}
              <LinkPending />
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <a
            href={contentPanel}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">📝</span>
            {t("content")}
          </a>
        </li>
      </ul>
    </nav>
  );
}
