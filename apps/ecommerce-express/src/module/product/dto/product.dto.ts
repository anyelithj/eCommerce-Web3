// product.dto.ts => contratos de salida del módulo Product (lo que consume el storefront Next.js).

export interface ProductRefDto {
  id: string;
  name: string;
  slug: string;
}

// ProductListItemDto => tarjeta de producto en listados/grillas (datos mínimos: menos bytes = mejor performance)
export interface ProductListItemDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtPriceCents: number | null; // Precio "antes" de la variante más barata (badge de descuento)
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
  available: number; // stock - reservedStock (lo que realmente se puede vender)
  weightGrams: number;
  isActive: boolean;
}

export interface ProductImageDto {
  id: string;
  url: string;
  publicId: string; // ID de Cloudinary: el panel admin lo reenvía al editar las imágenes (ImageSchema lo exige)
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  variantId: string | null;
}

// ProductDetailDto => "producto con variantes e imágenes por ID"
// "Omit<..., 'imageUrl' | 'imageAlt'>" => reutiliza el ítem de listado sin los campos de imagen única
export interface ProductDetailDto extends Omit<ProductListItemDto, "imageUrl" | "imageAlt"> {
  description: string;
  vendorId: string | null;
  variants: VariantDto[];
  images: ProductImageDto[];
  collections: ProductRefDto[];
  createdAt: Date;
  updatedAt: Date;
}
