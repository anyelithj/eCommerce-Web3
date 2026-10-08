export interface CartItemDto {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  available: number;
  priceChanged: boolean;
  purchasable: boolean;
}

export interface CartDto {
  id: string;
  currency: string;
  items: CartItemDto[];
  itemCount: number;
  subtotalCents: number;
  expiresAt: Date;
}
