// format.ts => formateo regional (Intl nativo del navegador/Node, sin librerías). Funciones puras: reciben el
// formato regional ("es-CO", "en-US") y devuelven texto. En componentes se usan vía useFormat() (idioma actual).
import { config } from "../constants/config";

// Formateadores cacheados por "locale|moneda": crear un Intl.NumberFormat es costoso (se reutiliza entre renders)
const moneyFormatters = new Map<string, Intl.NumberFormat>();

// formatMoney => centavos -> "$ 129.900" (es-CO) / "COP 129,900" (en-US); el backend y Stripe usan unidades mínimas
export function formatMoney(
  cents: number,
  currency: string = config.defaultCurrency,
  locale: string = config.locale
): string {
  const key = `${locale}|${currency}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

// formatDate / formatDateTime => aceptan Date o ISO string (las fechas llegan como string en JSON)
export const formatDate = (value: string | Date, locale: string = config.locale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/Bogota" }).format(
    new Date(value)
  );
export const formatDateTime = (value: string | Date, locale: string = config.locale): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));

// discountPercent => porcentaje de descuento entre precio actual y precio "antes"
export function discountPercent(
  priceCents: number,
  compareAtCents: number | null | undefined
): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
