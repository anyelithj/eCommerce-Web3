"use client";

import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/shared/lib/i18n/navigation";

export default function AuthBanner() {
  const { data: session } = useSession();
  const t = useTranslations("auth.banner");
  const locale = useLocale();
  const pathname = usePathname();

  if (session?.error !== "RefreshFailed") return null;

  return (
    <div
      role="alert"
      className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
    >
      {t("expired")}{" "}
      <button
        type="button"
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
