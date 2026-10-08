import type { Ref } from "@/shared/types/common.types";

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtPriceCents: number | null;
  ratingAvg: number;
  ratingCount: number;
  imageUrl: string | null;
  imageAlt: string | null;
  inStock: boolean;
  brand: Ref | null;
  category: Ref | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  available: number;
  weightGrams: number;
  isActive: boolean;
}

export interface ProductImageData {
  id: string;
  url: string;
  publicId: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  variantId: string | null;
}

export interface ProductDetail extends Omit<ProductCard, "imageUrl" | "imageAlt"> {
  description: string;
  vendorId: string | null;
  variants: ProductVariant[];
  images: ProductImageData[];
  collections: Ref[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryNode extends Ref {
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface CategoryDetail extends CategoryNode {
  breadcrumb: Ref[];
}

export interface Brand extends Ref {
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  productCount: number;
}

export interface CollectionSummary extends Ref {
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}
