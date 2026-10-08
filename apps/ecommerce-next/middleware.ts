import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/shared/lib/auth-config";
import { routing } from "@/shared/lib/i18n/routing";
import { config as appConfig } from "@/shared/constants/config";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_ROUTES = ["/account", "/checkout", "/chat", "/recommendations"];
const ADMIN_ONLY_ROUTES = ["/dashboard"];
const GUEST_ONLY_ROUTES = ["/login", "/register"];

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

const storeUrl = (prefix: string, path = "") => `${appConfig.cmsUrl}${prefix}${path}`;

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

function storefrontRedirect(req: NextRequest, prefix: string, path: string): NextResponse | null {
  const [, section = "", slug] = path.split("/");
  const target = STORE_REDIRECTS[section]?.(slug, req.nextUrl.searchParams);
  if (target) return NextResponse.redirect(storeUrl(prefix, target), 301);
  return path === "/" ? NextResponse.redirect(new URL(`${prefix}/dashboard`, req.url)) : null;
}

export default auth((req) => {
  const { prefix, path } = splitLocale(req.nextUrl.pathname);
  const isAuthenticated = Boolean(req.auth?.user) && req.auth?.error !== "RefreshFailed";
  const requiresAdmin = matches(ADMIN_ONLY_ROUTES, path);

  const storefront = storefrontRedirect(req, prefix, path);
  if (storefront) return storefront;

  if ((matches(PROTECTED_ROUTES, path) || requiresAdmin) && !isAuthenticated) {
    const loginUrl = new URL(`${prefix}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (requiresAdmin && !req.auth?.user.roles.includes("ADMIN"))
    return NextResponse.redirect(storeUrl(prefix));
  if (matches(GUEST_ONLY_ROUTES, path) && isAuthenticated)
    return NextResponse.redirect(new URL(`${prefix}/dashboard`, req.url));

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
