import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SiteChrome } from "../_components/SiteChrome";
import { AccountNav } from "./AccountNav";
import { initPage } from "@/shared/lib/i18n/server";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return {
    title: { template: `%s · ${t("title")}`, default: t("title") },
    robots: { index: false, follow: false },
  };
}

export default async function AccountLayout({ children, params }: Props) {
  await initPage(params);
  return (
    <SiteChrome>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </SiteChrome>
  );
}
