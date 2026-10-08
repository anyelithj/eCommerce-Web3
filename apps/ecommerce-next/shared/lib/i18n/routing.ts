// routing.ts (next-intl) => configuración ÚNICA de idiomas del sitio (DRY: la usan middleware, navegación y layout).
// "as-needed" => el idioma por defecto (español) NO lleva prefijo: /products, /account... (URLs de la especificación);
// el inglés vive en /en/products. Cada idioma tiene su propia URL => páginas estáticas/ISR por idioma y
// etiquetas hreflang para los buscadores (SEO internacional).
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
  // La cookie NEXT_LOCALE recuerda el idioma elegido con el selector del pie de página
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

// "(typeof X)[number]" => unión literal "es" | "en" derivada de la configuración (tipado seguro)
export type Locale = (typeof routing.locales)[number];

// Formato regional de números/fechas por idioma: la tienda opera en Colombia (pesos COP) en ambos idiomas
export const INTL_LOCALE: Record<Locale, string> = { es: "es-CO", en: "en-US" };
export const OG_LOCALE: Record<Locale, string> = { es: "es_CO", en: "en_US" };
