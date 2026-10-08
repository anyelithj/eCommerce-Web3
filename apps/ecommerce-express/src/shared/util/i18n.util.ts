// i18n.util.ts => utilidades de idioma del backend (es/en). Funciones puras, sin dependencias.
// El idioma llega por la cabecera "Accept-Language" que envía el frontend (idioma de la interfaz) o, para lo que
// se envía sin request de por medio (emails, push), desde la preferencia guardada del usuario (users.locale).
import type { Request } from "express";

export const LOCALES = ["es", "en"] as const;
// "(typeof X)[number]" => unión literal "es" | "en" derivada del arreglo (una sola fuente de verdad)
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

// isLocale => type guard: estrecha un string cualquiera al tipo Locale
export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

// parseLocale => "en-US,en;q=0.9,es;q=0.8" -> "en". Toma el primer idioma soportado en el orden del cliente
export function parseLocale(header: string | undefined | null): Locale {
  for (const part of (header ?? "").split(",")) {
    const language = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

// requestLocale => idioma de la request HTTP actual
export const requestLocale = (req: Request): Locale => parseLocale(req.headers["accept-language"]);

// localizedPath => ruta del frontend en ese idioma: español sin prefijo (/account), inglés con /en (/en/account)
export const localizedPath = (locale: Locale, path: string): string =>
  locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;

// Formato regional por idioma: la tienda opera en Colombia (pesos) en ambos idiomas
const INTL_LOCALE: Record<Locale, string> = { es: "es-CO", en: "en-US" };

// formatMoney => centavos -> "$ 129.900" (es) / "COP 129,900" (en)
export function formatMoney(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
