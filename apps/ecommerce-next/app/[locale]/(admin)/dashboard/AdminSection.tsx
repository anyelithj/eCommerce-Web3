import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export function adminMetadata(key: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const t = await getTranslations({ locale: (await params).locale, namespace: "admin.nav" });
    return { title: t(key) };
  };
}

export function AdminHeading({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-slate-900">{children}</h1>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  );
}

export function adminPage(key: string, Section: ComponentType) {
  return async function AdminPage({ params }: PageProps) {
    await initPage(params);
    const t = await getTranslations("admin");
    return (
      <>
        <AdminHeading description={t(`descriptions.${key}`)}>{t(`nav.${key}`)}</AdminHeading>
        <Section />
      </>
    );
  };
}
