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
