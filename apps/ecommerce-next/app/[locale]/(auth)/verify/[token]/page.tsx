import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import VerifyEmailForm from "@/features/auth/ui/VerifyEmailForm";
import { initPage } from "@/shared/lib/i18n/server";
import { firstParam, type PageProps } from "@/shared/types/next.types";

type Props = PageProps<{ token: string }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth.verify" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  await initPage(params);
  const t = await getTranslations("auth.verify");
  const { token } = await params;
  const userId = firstParam((await searchParams)["uid"]);

  if (!userId) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("incomplete")}
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-xl font-medium text-foreground">{t("title")}</h1>
      <VerifyEmailForm userId={userId} token={decodeURIComponent(token)} />
    </div>
  );
}
