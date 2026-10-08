export interface ProductRefDto {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItemDto {
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
  brand: ProductRefDto | null;
  category: ProductRefDto | null;
}

export interface VariantDto {
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

export interface ProductImageDto {
  id: string;
  url: string;
  publicId: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  variantId: string | null;
}

export interface ProductDetailDto extends Omit<ProductListItemDto, "imageUrl" | "imageAlt"> {
  description: string;
  vendorId: string | null;
  variants: VariantDto[];
  images: ProductImageDto[];
  collections: ProductRefDto[];
  createdAt: Date;
  updatedAt: Date;
}
