// useFormat.ts => formateadores ligados al idioma actual (next-intl useLocale). Funciona en Client Components y en
// Server Components síncronos; los async usan getIntlLocale() (shared/lib/i18n/server.ts) + las funciones puras.
import { useLocale } from "next-intl";
import { formatDate, formatDateTime, formatMoney } from "../lib/format";
import { INTL_LOCALE, type Locale } from "../lib/i18n/routing";

export function useFormat() {
  const intlLocale = INTL_LOCALE[useLocale() as Locale];
  return {
    money: (cents: number, currency?: string) => formatMoney(cents, currency, intlLocale),
    date: (value: string | Date) => formatDate(value, intlLocale),
    dateTime: (value: string | Date) => formatDateTime(value, intlLocale),
  };
}
