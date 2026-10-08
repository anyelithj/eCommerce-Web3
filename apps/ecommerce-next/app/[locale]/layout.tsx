// app/[locale]/layout.tsx => documento HTML por idioma (es sin prefijo, en con /en). Envuelve TODAS las páginas.
// Server Component: resuelve el idioma, entrega los textos al cliente (NextIntlClientProvider) y los metadatos SEO.
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google"; // next/font => fuente autoalojada: sin petición a Google en runtime y sin CLS
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "./providers";
import { routing, OG_LOCALE, type Locale } from "@/shared/lib/i18n/routing";
import { config } from "@/shared/constants/config";
import "../globals.css"; // Tailwind + tokens de shadcn/ui

// "display: swap" => el texto se muestra de inmediato con la fuente del sistema (no bloquea el render: mejor FCP)
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

// generateStaticParams => pre-genera las páginas estáticas/ISR para CADA idioma en el build
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Metadatos SEO globales por idioma; canonical y hreflang los declara CADA página (alternates propios)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(config.siteUrl), // Base para URLs absolutas de Open Graph y canonical
    title: { default: config.siteName, template: `%s | ${config.siteName}` }, // "template" compone con el title de cada page
    description: t("description"),
    openGraph: { type: "website", siteName: config.siteName, locale: OG_LOCALE[locale] },
    twitter: { card: "summary_large_image" },
  };
}

// Viewport separado de metadata (API de Next 15): responsive y color de la barra del navegador móvil
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f172a" };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // Idioma desconocido en la URL => 404 (type guard: desde aquí "locale" es "es" | "en")
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale); // Habilita el render estático (ISR) sin leer headers/cookies
  const t = await getTranslations("common");

  return (
    // "lang" => requisito WCAG 2.1 AA (3.1.1: Language of Page) para lectores de pantalla
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* "Saltar al contenido" => atajo de teclado para evitar recorrer todo el menú (WCAG 2.4.1: Bypass Blocks) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
        >
          {t("skipToContent")}
        </a>
        {/* NextIntlClientProvider => entrega idioma y textos a los Client Components (useTranslations) */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
