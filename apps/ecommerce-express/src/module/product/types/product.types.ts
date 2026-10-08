import type { ListProductsQuery } from "../schema/product.schema";

export interface ProductViewer {
  id: string;
  roles: string[];
}

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
