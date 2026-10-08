// request.ts (next-intl) => por cada request en el servidor: resuelve el idioma (segmento [locale] de la URL)
// y carga SOLO el diccionario de ese idioma (import dinámico => el otro idioma no entra al bundle).
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // "hasLocale" => type guard: un segmento desconocido (/fr/...) cae al idioma por defecto
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
    timeZone: "America/Bogota", // Fechas coherentes entre servidor y cliente (evita errores de hidratación)
  };
});
