import { getTranslations } from "next-intl/server";
import { NotificationList } from "@/features/notification/ui/NotificationList";
import { AccountHeading, accountMetadata } from "../AccountSection";
import { Link } from "@/shared/lib/i18n/navigation";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";
import { routes } from "@/shared/constants/routes";

export const generateMetadata = accountMetadata("notifications");

export default async function NotificationsPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  return (
    <>
      <AccountHeading
        action={
          <Link href={routes.settings} className="text-sm underline">
            {t("preferences")}
          </Link>
        }
      >
        {t("notifications")}
      </AccountHeading>
      <NotificationList />
    </>
  );
}
