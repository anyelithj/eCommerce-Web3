// page.tsx (/checkout) => el checkout siempre nace desde el carrito (POST /checkout reserva stock);
// entrar directo aquí redirige al carrito. "redirect" (Next.js) responde 307 desde el servidor.
import { getLocale } from "next-intl/server";
import { redirect } from "@/shared/lib/i18n/navigation"; // redirect con idioma (/en/cart)
import { routes } from "@/shared/constants/routes";

export default async function CheckoutIndexPage() {
  redirect({ href: routes.cart, locale: await getLocale() });
}
