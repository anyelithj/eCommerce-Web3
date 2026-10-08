import { getTranslations } from "next-intl/server";
import { AddressBook } from "./AddressBook";
import { AccountHeading, accountMetadata } from "../AccountSection";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export const generateMetadata = accountMetadata("addresses");

export default async function AddressesPage({ params }: PageProps) {
  await initPage(params);
  const t = await getTranslations("account.pages");
  return (
    <>
      <AccountHeading>{t("addresses")}</AccountHeading>
      <AddressBook />
    </>
  );
}
