import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "@/features/auth/ui/ForgotPasswordForm";
import UpdatePasswordForm from "@/features/auth/ui/UpdatePasswordForm";
import { Link } from "@/shared/lib/i18n/navigation";
import { initPage } from "@/shared/lib/i18n/server";
import { firstParam, type PageProps } from "@/shared/types/next.types";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth.forgot" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false } };
}

export default async function ForgotPasswordPage({ params, searchParams }: PageProps) {
  await initPage(params);
  const t = await getTranslations("auth.forgot");
  const token = firstParam((await searchParams)["token"]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-medium text-foreground">
          {token ? t("resetTitle") : t("title")}
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          {token ? t("resetSubtitle") : t("subtitle")}
        </p>
      </div>

      {token ? <UpdatePasswordForm resetToken={token} /> : <ForgotPasswordForm />}

      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
