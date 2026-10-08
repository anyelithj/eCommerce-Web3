import { config } from "../constants/config";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

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

export function discountPercent(
  priceCents: number,
  compareAtCents: number | null | undefined
): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
