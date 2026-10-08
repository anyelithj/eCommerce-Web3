// product.api.ts => lecturas del catálogo para Server Components (RSC) con cache ISR de Next.js.
// GraphQL (Apollo Client) para lo que el backend expone por GraphQL: listado, ficha, categorías, marcas y colecciones;
// REST (Axios) para los detalles de taxonomía que solo existen en REST. Ambos usan el Data Cache de Next:
// "next: { revalidate, tags }" => la respuesta se cachea y se regenera cada 60 s (Incremental Static Regeneration).
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

// isr => opciones de cache de Next; TODAS llevan la etiqueta "catalog" para que Express pueda regenerarlas
// al instante vía POST /api/revalidate (on-demand ISR). El tiempo queda como red de seguridad.
const isr = (revalidate: number, ...tags: string[]) => ({ revalidate, tags: ["catalog", ...tags] });
const PAGE_TTL = config.revalidateSeconds; // 60 s: listados y fichas
const TAXONOMY_TTL = 300; // 5 min: categorías y marcas cambian poco

// Cliente GraphQL del servidor (Singleton por proceso): sin token, el catálogo es público
const graphql = makeApolloClient();

// query => helper genérico: ejecuta una Query con la cache de Next y devuelve "data" tipado (DRY entre lecturas).
// "no-cache" => Apollo no guarda nada entre peticiones de distintos usuarios; la cache es la de Next (por URL+cuerpo)
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

// Fragmentos (DRY): los campos se declaran una vez y se reutilizan en cada consulta
const REF = "id name slug";
const CARD = `id name slug status currency minPriceCents maxPriceCents compareAtPriceCents ratingAvg ratingCount
  imageUrl imageAlt inStock brand { ${REF} } category { ${REF} }`;
const CATEGORY = "id name slug description imageUrl parentId productCount";

// "TypedDocumentNode<Data, Variables>" => el documento GraphQL lleva sus tipos: query() infiere datos y variables
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

// Árbol de categorías: GraphQL exige declarar la profundidad; 4 niveles cubren el menú (raíz > sub > sub > hoja).
// ponytail: tope fijo de 4 niveles (el backend no limita la profundidad); si el árbol crece, ampliar este fragmento
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

// getProducts => listado con filtros/orden/paginación. "inStock" viaja como Boolean en GraphQL (en la URL es texto)
export async function getProducts(
  filter: Partial<ProductListQuery>
): Promise<{ items: ProductCard[]; meta: PaginationMeta }> {
  const { inStock, ...rest } = filter;
  const variables = { filter: { ...rest, ...(inStock ? { inStock: inStock === "true" } : {}) } };
  return (await query(PRODUCTS, variables, isr(PAGE_TTL, "products"))).products;
}

// getProduct => detalle por slug o ID; null si no existe (la página responde 404)
export async function getProduct(idOrSlug: string): Promise<ProductDetail | null> {
  try {
    const { product } = await query(PRODUCT, { idOrSlug }, isr(PAGE_TTL, `product:${idOrSlug}`));
    if (!product) return null;
    // Adapter: [{ name, value }] (GraphQL) -> Record<string, string> (forma que usa la UI)
    return {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        attributes: Object.fromEntries(variant.attributes.map(({ name, value }) => [name, value])),
      })),
    };
  } catch {
    return null; // NOT_FOUND u otro error del backend => 404 en la página
  }
}

// Árbol: los nodos del último nivel pedido llegan sin hijos declarados; se normalizan a [] (contrato CategoryNode)
const withChildren = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.map((node) => ({ ...node, children: withChildren(node.children ?? []) }));

export const getCategories = async () =>
  withChildren((await query(CATEGORIES, {}, isr(TAXONOMY_TTL, "categories"))).categories);

export const getBrands = async () => (await query(BRANDS, {}, isr(TAXONOMY_TTL))).brands;

export const getCollections = async () => (await query(COLLECTIONS, {}, isr(120))).collections;

// --- Detalles de taxonomía (solo REST): breadcrumb y productos de la categoría/marca/colección ---
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
