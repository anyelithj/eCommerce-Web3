// product.types.ts (capa entities de FSD) => forma SERIALIZADA (JSON) de los productos que entrega la API.
// Difiere de los DTO del backend en que las fechas llegan como string ISO (JSON no tiene tipo Date).
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
  publicId: string; // ID de Cloudinary (el panel admin lo reenvía al editar las imágenes del producto)
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  variantId: string | null;
}

// "Omit" => el detalle reutiliza la tarjeta sin los campos de imagen única (DRY)
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
