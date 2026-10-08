import type { MetadataRoute } from "next";
import { getBrands, getCategories, getProducts } from "@/features/product/api/product.api";
import type { CategoryNode } from "@/entities/product/model/product.types";
import { getPathname } from "@/shared/lib/i18n/navigation";
import { routing } from "@/shared/lib/i18n/routing";
import { config } from "@/shared/constants/config";
import { routes } from "@/shared/constants/routes";

export const revalidate = 3600;

const MAX_PRODUCT_PAGES = 10;

type Entry = { href: string; changeFrequency: "daily" | "weekly"; priority: number };

const flatten = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function productEntries(): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const { items, meta } = await getProducts({ page, limit: 100 });
    entries.push(
      ...items.map((product) => ({
        href: routes.product(product.slug),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }))
    );
    if (page >= meta.totalPages) break;
  }
  return entries;
}

function localize(entry: Entry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [
      locale,
      `${config.siteUrl}${getPathname({ href: entry.href, locale })}`,
    ])
  );
  return routing.locales.map((locale) => ({
    url: `${config.siteUrl}${getPathname({ href: entry.href, locale })}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, brands, products] = await Promise.all([
    getCategories().catch(() => []),
    getBrands().catch(() => []),
    productEntries().catch(() => []),
  ]);
  const entries: Entry[] = [
    { href: "/", changeFrequency: "daily", priority: 1 },
    { href: routes.products, changeFrequency: "daily", priority: 0.9 },
    ...flatten(categories).map((category) => ({
      href: routes.category(category.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...brands.map((brand) => ({
      href: routes.brand(brand.slug),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products,
  ];
  return entries.flatMap(localize);
}
