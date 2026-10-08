import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export const INTL_LOCALE: Record<Locale, string> = { es: "es-CO", en: "en-US" };
export const OG_LOCALE: Record<Locale, string> = { es: "es_CO", en: "en_US" };
