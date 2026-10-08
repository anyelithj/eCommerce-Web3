// cart.dto.ts => contratos de salida del módulo Cart (lo que pinta CartDrawer/CartSummary en Next.js).

export interface CartItemDto {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number; // Precio ACTUAL de la variante (el checkout lo congela)
  quantity: number;
  lineTotalCents: number;
  available: number;
  priceChanged: boolean; // true => el precio cambió desde que se agregó (la UI avisa al cliente)
  purchasable: boolean; // false => producto despublicado/agotado: no puede pasar al checkout
}

export interface CartDto {
  id: string;
  currency: string;
  items: CartItemDto[];
  itemCount: number; // Suma de cantidades (badge del ícono del carrito)
  subtotalCents: number;
  expiresAt: Date;
}
