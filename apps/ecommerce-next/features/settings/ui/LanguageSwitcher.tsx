"use client";

import { useId, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/shared/lib/i18n/navigation";
import { routing, type Locale } from "@/shared/lib/i18n/routing";
import { useAuth } from "@/shared/hook/useAuth";
import { userApi } from "@/entities/user/api/user.api";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const id = useId();
  const { user, accessToken } = useAuth();

  const onChange = (next: Locale) => {
    if (user && accessToken)
      void userApi.updateProfile(accessToken, user.id, { locale: next }).catch(() => undefined);
    const query = searchParams.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })
    );
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted-foreground">
        {t("label")}
      </label>
      <select
        id={id}
        value={locale}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as Locale)}
        className="h-9 rounded-md border border-input bg-background px-2"
      >
        {routing.locales.map((option) => (
          <option key={option} value={option} lang={option}>
            {t(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
