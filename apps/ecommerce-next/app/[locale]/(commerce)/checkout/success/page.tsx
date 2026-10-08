// page.tsx (/checkout/success?session=) => URL estable para enlaces externos (emails, retorno de pasarelas):
// redirige a la confirmación de la sesión, donde se espera el webhook y se muestra el pedido.
import { redirect } from "@/shared/lib/i18n/navigation"; // redirect con idioma
import { firstParam, type PageProps } from "@/shared/types/next.types";
import { routes } from "@/shared/constants/routes";

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const session = firstParam((await searchParams)["session"]);
  redirect({ href: session ? routes.checkoutConfirm(session) : routes.orders, locale });
}
