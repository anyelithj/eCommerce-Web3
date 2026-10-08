// middleware.ts => se ejecuta ANTES de renderizar cada página (Edge Middleware de Next.js). Responsabilidades
// encadenadas (Chain of Responsibility):
//   1. La TIENDA vive en Nuxt: las URLs públicas de tienda que quedaron de Next (enlaces viejos, buscadores) se
//      redirigen allá con 301; la raíz "/" de Next es el panel admin.
//   2. Guard de autenticación: redirige sin que la página protegida llegue a cargar.
//   3. next-intl: resuelve el idioma (/en/... o español sin prefijo) y reescribe hacia app/[locale]/...
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/shared/lib/auth-config"; // Misma instancia de next-auth que el resto de la app (DRY)
import { routing } from "@/shared/lib/i18n/routing";
import { config as appConfig } from "@/shared/constants/config";

const intlMiddleware = createIntlMiddleware(routing);

// Rutas que requieren estar autenticado (cualquier rol válido) y rutas solo para ADMIN (sin prefijo de idioma)
const PROTECTED_ROUTES = ["/account", "/checkout", "/chat", "/recommendations"];
const ADMIN_ONLY_ROUTES = ["/dashboard"]; // Panel de administración (Fase 7): app/[locale]/(admin)/dashboard
const GUEST_ONLY_ROUTES = ["/login", "/register"];

// splitLocale => "/en/account/orders" -> { prefix: "/en", path: "/account/orders" }; "/account" -> { prefix: "", ... }
function splitLocale(pathname: string): { prefix: string; path: string } {
  const [, first, ...rest] = pathname.split("/");
  const isLocale = routing.locales.some(
    (locale) => locale === first && locale !== routing.defaultLocale
  );
  return isLocale
    ? { prefix: `/${first}`, path: `/${rest.join("/")}` }
    : { prefix: "", path: pathname };
}

const matches = (routes: string[], path: string) =>
  routes.some((route) => path === route || path.startsWith(`${route}/`));

// storeUrl => URL de la tienda Nuxt en el mismo idioma (Nuxt: español sin prefijo, inglés /en)
const storeUrl = (prefix: string, path = "") => `${appConfig.cmsUrl}${prefix}${path}`;

// STORE_REDIRECTS => sección de tienda heredada de Next -> destino en Nuxt (tabla declarativa: una fila por sección)
type StoreRedirect = (slug: string | undefined, search: URLSearchParams) => string | null;
const STORE_REDIRECTS: Record<string, StoreRedirect> = {
  products: (slug) => (slug ? `/products/${slug}` : "/products"),
  cart: () => "/cart",
  categories: (slug) => (slug ? `/categories/${slug}` : null),
  search: (_slug, search) =>
    `/products${search.get("q") ? `?q=${encodeURIComponent(search.get("q") ?? "")}` : ""}`,
  collections: (slug) => (slug ? `/products?collection=${encodeURIComponent(slug)}` : null),
  brands: (slug) => (slug ? `/products?brand=${encodeURIComponent(slug)}` : null),
};

// storefrontRedirect => tienda => Nuxt (301 permanente); raíz de Next => panel admin; null si no aplica
function storefrontRedirect(req: NextRequest, prefix: string, path: string): NextResponse | null {
  const [, section = "", slug] = path.split("/");
  const target = STORE_REDIRECTS[section]?.(slug, req.nextUrl.searchParams);
  if (target) return NextResponse.redirect(storeUrl(prefix, target), 301);
  return path === "/" ? NextResponse.redirect(new URL(`${prefix}/dashboard`, req.url)) : null;
}

// "auth((req) => {...})" => wrapper de next-auth que inyecta "req.auth" con la sesión ya resuelta
export default auth((req) => {
  const { prefix, path } = splitLocale(req.nextUrl.pathname);
  // Sesión válida = existe y su token del backend no falló al renovarse
  const isAuthenticated = Boolean(req.auth?.user) && req.auth?.error !== "RefreshFailed";
  const requiresAdmin = matches(ADMIN_ONLY_ROUTES, path);

  // Caso 0: URLs de tienda => Nuxt; raíz => panel admin
  const storefront = storefrontRedirect(req, prefix, path);
  if (storefront) return storefront;

  // Caso 1: ruta protegida + usuario NO autenticado => login en el MISMO idioma, conservando el destino
  if ((matches(PROTECTED_ROUTES, path) || requiresAdmin) && !isAuthenticated) {
    const loginUrl = new URL(`${prefix}/login`, req.url);
    // "callbackUrl" SIN prefijo de idioma: el router de next-intl lo vuelve a agregar tras el login
    loginUrl.searchParams.set("callbackUrl", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  // Caso 2: ruta admin + usuario autenticado PERO sin rol ADMIN => tienda (Nuxt)
  if (requiresAdmin && !req.auth?.user.roles.includes("ADMIN"))
    return NextResponse.redirect(storeUrl(prefix));
  // Caso 3: usuario YA autenticado intentando entrar a /login o /register => panel (o tienda si no es ADMIN)
  if (matches(GUEST_ONLY_ROUTES, path) && isAuthenticated)
    return NextResponse.redirect(new URL(`${prefix}/dashboard`, req.url));

  // Ningún caso especial: next-intl resuelve el idioma y continúa el renderizado
  return intlMiddleware(req);
});

// "matcher" => todas las páginas; se excluyen API, archivos internos de Next y archivos con extensión
// (imágenes, sitemap.xml, robots.txt) para no gastar tiempo de middleware en assets
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
