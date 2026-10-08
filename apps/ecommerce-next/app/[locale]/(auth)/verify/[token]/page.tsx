// page.tsx (/verify/[token]?uid=...) => destino del enlace de verificación enviado por email.
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

// Next.js 15 tipa params/searchParams como Promise (Server Components async)
export default async function VerifyEmailPage({ params, searchParams }: Props) {
  await initPage(params);
  const t = await getTranslations("auth.verify");
  const { token } = await params;
  // "uid" => nombre del parámetro que genera la plantilla de email del backend (template.util.ts)
  const userId = firstParam((await searchParams)["uid"]);

  // Guard clause: enlace incompleto => mensaje claro sin llamar a la API
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
      {/* "decodeURIComponent" => el token viaja codificado en la URL del email */}
      <VerifyEmailForm userId={userId} token={decodeURIComponent(token)} />
    </div>
  );
}
