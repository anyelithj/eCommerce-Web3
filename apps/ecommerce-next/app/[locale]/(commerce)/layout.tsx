// layout.tsx (commerce) => carrito y checkout comparten el mismo chrome de la tienda (DRY con SiteChrome).
// Estas rutas son privadas: middleware.ts ya redirige a /login si no hay sesión (defensa en el borde).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { initPage } from "@/shared/lib/i18n/server";
import { SiteChrome } from "../_components/SiteChrome";

// "noindex" => páginas transaccionales sin valor para buscadores (evita indexar carritos/pagos)
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CommerceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await initPage(params); // Idioma de la request disponible para todo el árbol
  return <SiteChrome>{children}</SiteChrome>;
}
