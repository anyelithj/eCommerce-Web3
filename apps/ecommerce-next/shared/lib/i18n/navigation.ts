// navigation.ts (next-intl) => reemplazos de Link/useRouter/usePathname/redirect que conocen el idioma actual.
// Link href="/products" => "/products" en español y "/en/products" en inglés, sin que cada componente lo calcule.
// Todo el proyecto importa la navegación desde aquí (nunca de "next/link"): el idioma no se pierde al navegar.
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
