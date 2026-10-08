// UserMenu.tsx (widget FSD · React + Tailwind) => menú de cuenta del header (patrón Composite de UI: sesión + navegación + logout).
// DropdownMenu de Radix (shadcn/ui): foco atrapado, flechas ↑/↓, Escape, clic fuera y portal sobre el resto de la página
// (el panel ya no queda detrás/encima del aside del hub de cuenta). Paradigma declarativo: LINKS = datos, no JSX repetido.
"use client"; // Directiva de Next.js: componente de cliente (usa hooks, eventos del DOM y signOut del navegador)

import { useEffect, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"; // Primitiva accesible (WAI-ARIA menu button)
import { signOut } from "next-auth/react"; // next-auth v5: cierra la sesión (dispara events.signOut => revoca en el backend)
import { useLocale, useTranslations } from "next-intl"; // next-intl: idioma activo y textos traducidos
import { getPathname, Link, usePathname } from "@/shared/lib/i18n/navigation"; // Adapter de next-intl: Link con prefijo de idioma
import { useAuth } from "@/shared/hook/useAuth"; // Facade sobre la sesión de next-auth
import { routes } from "@/shared/constants/routes"; // Rutas tipadas centralizadas (DRY)
import { Avatar } from "@/entities/user/ui/Avatar"; // Entidad FSD: avatar con fallback de iniciales
import { LinkPending } from "@/shared/ui/Spinner"; // Spinner mientras navega a la sección elegida

// Íconos SVG inline (trazo 1.5, 24×24, estilo outline): sin dependencia de íconos; "aria-hidden" porque el texto ya los describe
const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0"
    aria-hidden="true"
  >
    {path}
  </svg>
);

// "as const" (TypeScript) => tupla de solo lectura con tipos literales: t(link.key) queda tipado y sin errores de clave
const LINKS = [
  {
    href: routes.account,
    key: "account",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
  {
    href: routes.orders,
    key: "orders",
    icon: icon(
      <>
        <path d="M3 7h18l-2 13H5L3 7Z" />
        <path d="M8 7a4 4 0 0 1 8 0" />
      </>
    ),
  },
  {
    href: routes.wishlist,
    key: "wishlist",
    icon: icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />),
  },
  {
    href: routes.recommendations,
    key: "recommendations",
    icon: icon(
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3Z" />
    ),
  },
  {
    href: routes.settings,
    key: "settings",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
      </>
    ),
  },
] as const;

// Clases compartidas por enlaces y botón (DRY). Radix marca el ítem enfocado (teclado o hover) con "data-highlighted"
const ITEM =
  "flex w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors";

export default function UserMenu() {
  const t = useTranslations("nav.userMenu"); // Hook de next-intl: textos del namespace del menú
  const locale = useLocale();
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  // Controlado: al elegir una sección el menú sigue abierto con su spinner y se cierra cuando la ruta ya cambió
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Placeholder con el mismo tamaño mientras se resuelve la sesión (evita parpadeo y CLS — Core Web Vitals)
  if (isLoading)
    return <div className="h-9 w-24 animate-pulse rounded-full bg-muted" aria-hidden="true" />;

  // Guard clause: sin sesión => enlaces de acceso en lugar del menú
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href={routes.login} className="rounded-md px-3 py-2 text-foreground hover:bg-accent">
          {t("signIn")}
        </Link>
        <Link
          href={routes.register}
          className="hidden rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
        >
          {t("register")}
        </Link>
      </div>
    );
  }

  return (
    // "modal={false}" => no bloquea el scroll de la página al abrir (menú de header, no diálogo)
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        aria-label={t("label")}
        className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={32} />
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-foreground md:inline">
          {user.name.split(" ")[0]}
        </span>
        {/* Chevron: rota 180° al abrir (Radix expone el estado en data-state del Trigger) */}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="hidden size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </DropdownMenu.Trigger>

      {/* Portal => se pinta al final de <body>: ningún z-index/overflow del header o del aside lo recorta */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        >
          {/* Cabecera de identidad: confirma con qué cuenta se está operando */}
          <DropdownMenu.Label className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={user.name} src={user.avatarUrl} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />

          {/* "asChild" => el ítem de Radix ES el <Link> (navegación real + teclado del menú) */}
          {LINKS.map((link) => (
            // preventDefault en onSelect => Radix no cierra el menú; si ya estás en esa ruta, se cierra al instante
            <DropdownMenu.Item
              key={link.href}
              asChild
              onSelect={(event) => link.href !== pathname && event.preventDefault()}
            >
              <Link
                href={link.href}
                className={`${ITEM} text-foreground data-[highlighted]:bg-accent`}
              >
                <span className="text-muted-foreground">{link.icon}</span>
                {t(link.key)}
                <LinkPending className="text-muted-foreground" />
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() =>
              void signOut({ callbackUrl: getPathname({ href: routes.home, locale }) })
            } // "void" => descarta la promesa a propósito
            className={`${ITEM} text-destructive data-[highlighted]:bg-destructive/10`}
          >
            {icon(
              <>
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
                <path d="m10 17-5-5 5-5" />
                <path d="M5 12h11" />
              </>
            )}
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
