// product.types.ts => tipos internos del módulo Product (compartidos entre service y repository).
import type { ListProductsQuery } from "../schema/product.schema";

// ProductViewer => quién consulta: define visibilidad (el público solo ve ACTIVE; el vendedor ve sus borradores)
export interface ProductViewer {
  id: string;
  roles: string[];
}

// ProductFilter => filtros ya RESUELTOS (slugs convertidos a IDs, árbol de categorías expandido)
export interface ProductFilter {
  q?: string | undefined;
  categoryIds?: string[] | undefined;
  brandId?: string | undefined;
  collectionSlug?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStock?: boolean | undefined;
  statuses: Array<"DRAFT" | "ACTIVE" | "ARCHIVED">;
  vendorId?: string | undefined;
  sort: ListProductsQuery["sort"];
}
