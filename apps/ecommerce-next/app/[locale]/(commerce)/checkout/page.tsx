import { getLocale } from "next-intl/server";
import { redirect } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";

export default async function CheckoutIndexPage() {
  redirect({ href: routes.cart, locale: await getLocale() });
}
