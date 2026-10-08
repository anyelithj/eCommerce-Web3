import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountOverview } from "./AccountOverview";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return { title: { absolute: t("title") } };
}

export default async function AccountPage({ params }: PageProps) {
  await initPage(params);
  return <AccountOverview />;
}
