import { getTranslations } from "next-intl/server";
import { WishlistView } from "./WishlistView";
import { AccountHeading, accountMetadata } from "../AccountSection";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export const generateMetadata = accountMetadata("wishlist");

export default async function WishlistPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  return (
    <>
      <AccountHeading>{t("wishlist")}</AccountHeading>
      <WishlistView />
    </>
  );
}
