// LanguageSwitcher.tsx => selector de idioma (ES/EN). Cambia a la MISMA página en el otro idioma
// (/products?page=2 <-> /en/products?page=2) y next-intl guarda la elección en la cookie NEXT_LOCALE.
// <select> nativo con <label>: accesible por teclado y lector de pantalla sin librerías.
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
  const pathname = usePathname(); // Ruta SIN prefijo de idioma
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition(); // La UI sigue respondiendo mientras carga el otro idioma
  const id = useId();
  const { user, accessToken } = useAuth();

  const onChange = (next: Locale) => {
    // Con sesión, el idioma también se guarda en el perfil: emails y notificaciones del backend lo usan.
    // "void ... .catch" => best-effort: si falla, la interfaz cambia de idioma igual
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
          // "lang" en cada opción => el lector de pantalla pronuncia "English" con voz inglesa
          <option key={option} value={option} lang={option}>
            {t(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
