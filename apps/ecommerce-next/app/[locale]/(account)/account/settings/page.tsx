import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ProfileSettings } from "@/features/settings/ui/ProfileSettings";
import { SecuritySettings } from "@/features/settings/ui/SecuritySettings";
import { NotifSettings } from "@/features/settings/ui/NotifSettings";
import { ThemeSettings } from "@/features/settings/ui/ThemeSettings";
import { LanguageSwitcher } from "@/features/settings/ui/LanguageSwitcher";
import { AccountHeading, accountMetadata } from "../AccountSection";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export const generateMetadata = accountMetadata("settings");

export default async function SettingsPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  return (
    <>
      <AccountHeading>{t("settings")}</AccountHeading>
      <ProfileSettings />
      <SecuritySettings />
      <NotifSettings />
      <ThemeSettings />
      <Suspense>
        <LanguageSwitcher />
      </Suspense>
    </>
  );
}
