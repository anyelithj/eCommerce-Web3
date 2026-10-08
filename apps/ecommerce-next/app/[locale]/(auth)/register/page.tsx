import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import RegisterForm from "@/features/auth/ui/RegisterForm";
import OAuthButtons from "@/features/auth/ui/OAuthButtons";
import { Link } from "@/shared/lib/i18n/navigation";
import { alternates, initPage } from "@/shared/lib/i18n/server";
import type { Locale } from "@/shared/lib/i18n/routing";
import type { PageProps } from "@/shared/types/next.types";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternates("/register", locale),
  };
}

export default async function RegisterPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("auth.register");
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-medium text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <RegisterForm />

      <div className="flex w-full max-w-sm items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">{t("orContinue")}</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <Suspense>
        <OAuthButtons />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
