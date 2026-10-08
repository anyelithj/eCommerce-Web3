// server.ts (solo servidor) => utilidades de idioma para Server Components async y generateMetadata.
import { getLocale, setRequestLocale } from "next-intl/server";
import { getPathname } from "./navigation";
import { INTL_LOCALE, routing, type Locale } from "./routing";
import { config } from "../../constants/config";

// initPage => primer paso de cada página: fija el idioma de la request (render estático/ISR por idioma) y lo devuelve
export async function initPage(params: Promise<{ locale: string }>): Promise<Locale> {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return locale;
}

// getIntlLocale => "es" -> "es-CO" para las funciones puras de shared/lib/format
export async function getIntlLocale(): Promise<string> {
  return INTL_LOCALE[(await getLocale()) as Locale];
}

// alternates => canonical del idioma actual + hreflang de cada idioma (SEO internacional).
// Ej. "/products" => { canonical: "/en/products", languages: { es: "/products", en: "/en/products", "x-default": "/products" } }
export function alternates(href: string, locale: Locale) {
  const languages = Object.fromEntries(
    routing.locales.map((lang) => [lang, getPathname({ href, locale: lang })])
  );
  return {
    canonical: getPathname({ href, locale }),
    languages: { ...languages, "x-default": getPathname({ href, locale: routing.defaultLocale }) },
  };
}

// absoluteUrl => URL absoluta localizada (JSON-LD, sitemap)
export const absoluteUrl = (href: string, locale: Locale) =>
  `${config.siteUrl}${getPathname({ href, locale })}`;
