// AuthBanner.tsx => banner global que avisa cuando la sesión expiró (el refresh token del backend fue revocado
// o venció) y ofrece volver a iniciar sesión conservando la página actual.
// (El aviso de "verifica tu email" ya no aplica: el backend no permite iniciar sesión sin verificar la cuenta.)
"use client";

import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/shared/lib/i18n/navigation";

export default function AuthBanner() {
  const { data: session } = useSession();
  const t = useTranslations("auth.banner");
  const locale = useLocale();
  const pathname = usePathname(); // Sin prefijo de idioma: el login lo vuelve a agregar al redirigir

  // Guard clause: sin error de sesión no se renderiza nada ("null" es válido en React)
  if (session?.error !== "RefreshFailed") return null;

  return (
    <div
      role="alert"
      className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
    >
      {t("expired")}{" "}
      <button
        type="button"
        // Limpia la cookie de next-auth y vuelve al login con retorno a la página actual
        onClick={() =>
          void signOut({
            callbackUrl: `${getPathname({ href: "/login", locale })}?callbackUrl=${encodeURIComponent(pathname)}`,
          })
        }
        className="font-semibold underline"
      >
        {t("signInAgain")}
      </button>
    </div>
  );
}
