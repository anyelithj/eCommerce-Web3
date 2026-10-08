import { gql, type TypedDocumentNode } from "@apollo/client";
import { apiGet } from "@/shared/lib/api-client";
import { makeApolloClient } from "@/shared/lib/query-client";
import { config } from "@/shared/constants/config";
import type { PaginationMeta } from "@/shared/types/api.types";
import type {
  Brand,
  CategoryDetail,
  CategoryNode,
  CollectionSummary,
  ProductCard,
  ProductDetail,
} from "@/entities/product/model/product.types";
import type { ProductListQuery } from "../lib/product.validator";

const isr = (revalidate: number, ...tags: string[]) => ({ revalidate, tags: ["catalog", ...tags] });
const PAGE_TTL = config.revalidateSeconds;
const TAXONOMY_TTL = 300;

const graphql = makeApolloClient();

async function query<TData, TVariables extends Record<string, unknown>>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  next: ReturnType<typeof isr>
): Promise<TData> {
  const result = await graphql.query({
    query: document,
    variables,
    fetchPolicy: "no-cache",
    context: { fetchOptions: { next } },
  });
  if (!result.data) throw new Error("Respuesta GraphQL vacía");
  return result.data;
}

const REF = "id name slug";
const CARD = `id name slug status currency minPriceCents maxPriceCents compareAtPriceCents ratingAvg ratingCount
  imageUrl imageAlt inStock brand { ${REF} } category { ${REF} }`;
const CATEGORY = "id name slug description imageUrl parentId productCount";

const PRODUCTS: TypedDocumentNode<
  { products: { items: ProductCard[]; meta: PaginationMeta } },
  { filter: Record<string, unknown> }
> = gql`
  query Products($filter: ProductFilter) { products(filter: $filter) { items { ${CARD} } meta { page limit total totalPages } } }
`;

type ProductDetailGql = Omit<ProductDetail, "variants"> & {
  variants: Array<
    Omit<ProductDetail["variants"][number], "attributes"> & {
      attributes: Array<{ name: string; value: string }>;
    }
  >;
};
const PRODUCT: TypedDocumentNode<{ product: ProductDetailGql | null }, { idOrSlug: string }> = gql`
  query Product($idOrSlug: String!) {
    product(idOrSlug: $idOrSlug) {
      id name slug status description currency vendorId minPriceCents maxPriceCents compareAtPriceCents ratingAvg ratingCount inStock
      brand { ${REF} } category { ${REF} } collections { ${REF} }
      variants { id sku name attributes { name value } priceCents compareAtPriceCents available weightGrams isActive }
      images { id url alt width height position variantId }
      createdAt updatedAt
    }
  }
`;

const CATEGORIES: TypedDocumentNode<{ categories: CategoryNode[] }, Record<string, never>> = gql`
  query Categories {
    categories { ${CATEGORY} children { ${CATEGORY} children { ${CATEGORY} children { ${CATEGORY} } } } }
  }
`;
const BRANDS: TypedDocumentNode<{ brands: Brand[] }, Record<string, never>> = gql`
  query Brands {
    brands {
      id
      name
      slug
      description
      logoUrl
      website
      productCount
    }
  }
`;
const COLLECTIONS: TypedDocumentNode<
  { collections: CollectionSummary[] },
  Record<string, never>
> = gql`
  query Collections {
    collections {
      id
      name
      slug
      description
      imageUrl
      productCount
    }
  }
`;

export async function getProducts(
  filter: Partial<ProductListQuery>
): Promise<{ items: ProductCard[]; meta: PaginationMeta }> {
  const { inStock, ...rest } = filter;
  const variables = { filter: { ...rest, ...(inStock ? { inStock: inStock === "true" } : {}) } };
  return (await query(PRODUCTS, variables, isr(PAGE_TTL, "products"))).products;
}

export async function getProduct(idOrSlug: string): Promise<ProductDetail | null> {
  try {
    const { product } = await query(PRODUCT, { idOrSlug }, isr(PAGE_TTL, `product:${idOrSlug}`));
    if (!product) return null;
    return {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        attributes: Object.fromEntries(variant.attributes.map(({ name, value }) => [name, value])),
      })),
    };
  } catch {
    return null;
  }
}

const withChildren = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.map((node) => ({ ...node, children: withChildren(node.children ?? []) }));

export const getCategories = async () =>
  withChildren((await query(CATEGORIES, {}, isr(TAXONOMY_TTL, "categories"))).categories);

export const getBrands = async () => (await query(BRANDS, {}, isr(TAXONOMY_TTL))).brands;

export const getCollections = async () => (await query(COLLECTIONS, {}, isr(120))).collections;

export async function getCategory(slug: string): Promise<CategoryDetail | null> {
  return apiGet<CategoryDetail>(`/category/${encodeURIComponent(slug)}`, {
    next: isr(TAXONOMY_TTL),
  }).catch(() => null);
}

export async function getBrand(slug: string): Promise<(Brand & { products: unknown[] }) | null> {
  return apiGet<Brand & { products: unknown[] }>(`/brand/${encodeURIComponent(slug)}`, {
    next: isr(TAXONOMY_TTL),
  }).catch(() => null);
}

export async function getCollection(
  slug: string
): Promise<(CollectionSummary & { products: Array<{ id: string }> }) | null> {
  return apiGet<CollectionSummary & { products: Array<{ id: string }> }>(
    `/collection/${encodeURIComponent(slug)}`,
    { next: isr(120) }
  ).catch(() => null);
}
