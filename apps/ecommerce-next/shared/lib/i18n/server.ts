import { getLocale, setRequestLocale } from "next-intl/server";
import { getPathname } from "./navigation";
import { INTL_LOCALE, routing, type Locale } from "./routing";
import { config } from "../../constants/config";

export async function initPage(params: Promise<{ locale: string }>): Promise<Locale> {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return locale;
}

export async function getIntlLocale(): Promise<string> {
  return INTL_LOCALE[(await getLocale()) as Locale];
}

export function alternates(href: string, locale: Locale) {
  const languages = Object.fromEntries(
    routing.locales.map((lang) => [lang, getPathname({ href, locale: lang })])
  );
  return {
    canonical: getPathname({ href, locale }),
    languages: { ...languages, "x-default": getPathname({ href, locale: routing.defaultLocale }) },
  };
}

export const absoluteUrl = (href: string, locale: Locale) =>
  `${config.siteUrl}${getPathname({ href, locale })}`;
