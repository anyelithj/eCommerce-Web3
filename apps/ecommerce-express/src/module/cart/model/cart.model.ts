import type { PrismaClient } from "@prisma/client";

export interface VariantAvailability {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  available: number;
  purchasable: boolean;
}

export interface StockGateway {
  getAvailability(variantIds: string[]): Promise<Map<string, VariantAvailability>>;
}

export class PrismaStockGateway implements StockGateway {
  constructor(private readonly prisma: PrismaClient) {}

  public async getAvailability(variantIds: string[]): Promise<Map<string, VariantAvailability>> {
    const rows = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        stock: true,
        reservedStock: true,
        isActive: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            currency: true,
            images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
          },
        },
      },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          variantId: row.id,
          productId: row.product.id,
          productName: row.product.name,
          productSlug: row.product.slug,
          variantName: row.name,
          sku: row.sku,
          imageUrl: row.images[0]?.url ?? row.product.images[0]?.url ?? null,
          priceCents: row.priceCents,
          currency: row.product.currency,
          available: Math.max(0, row.stock - row.reservedStock),
          purchasable: row.isActive && row.product.status === "ACTIVE",
        },
      ])
    );
  }
}

export const lineTotal = (item: { unitPriceCents: number; quantity: number }): number =>
  item.unitPriceCents * item.quantity;

export function cartSubtotal(items: Array<{ unitPriceCents: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}
