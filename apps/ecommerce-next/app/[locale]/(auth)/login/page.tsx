import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import LoginForm from "@/features/auth/ui/LoginForm";
import OAuthButtons from "@/features/auth/ui/OAuthButtons";
import { Link } from "@/shared/lib/i18n/navigation";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth.login" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false } };
}

export default async function LoginPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("auth.login");
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-medium text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      <div className="flex w-full max-w-sm items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">{t("orContinue")}</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <Suspense>
        <OAuthButtons />
      </Suspense>

      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          {t("forgot")}
        </Link>
        <p className="text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
