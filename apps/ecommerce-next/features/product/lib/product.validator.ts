// product.validator.ts => los filtros del catálogo viven en la URL (compartible, indexable, botón "atrás" funciona).
// Este schema Zod convierte searchParams (strings) en una consulta tipada y la vuelve a serializar (ida y vuelta).
import { z } from "zod";

export const PRODUCT_SORTS = [
  // "label" => clave de traducción (messages/*.json -> product.sort.*)
  { value: "newest", label: "newest" },
  { value: "price_asc", label: "price_asc" },
  { value: "price_desc", label: "price_desc" },
  { value: "rating", label: "rating" },
  { value: "name", label: "name" },
] as const;

// "z.coerce" => "2" (string de la URL) -> 2 (number); ".catch" => valor inválido en la URL => se ignora (no rompe la página)
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(48).catch(24),
  q: z.string().trim().min(1).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  brand: z.string().optional().catch(undefined),
  collection: z.string().optional().catch(undefined),
  minPrice: z.coerce.number().int().min(0).optional().catch(undefined),
  maxPrice: z.coerce.number().int().min(0).optional().catch(undefined),
  inStock: z.enum(["true", "false"]).optional().catch(undefined),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating", "name"]).catch("newest"),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

// parseProductQuery => Record de searchParams (Next 15) -> consulta tipada
export function parseProductQuery(
  searchParams: Record<string, string | string[] | undefined>
): ProductListQuery {
  // Normaliza parámetros repetidos a su primer valor
  const flat = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );
  return productListQuerySchema.parse(flat);
}

// toSearchParams => consulta -> query string, omitiendo valores por defecto (URLs limpias y canónicas para SEO)
export function toSearchParams(query: Partial<ProductListQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (
      value === undefined ||
      value === "" ||
      (key === "page" && value === 1) ||
      (key === "sort" && value === "newest") ||
      (key === "limit" && value === 24)
    )
      continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
