// cart.repository.ts => acceso a datos del carrito (PostgreSQL = fuente de verdad).
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";

export interface CartRow {
  id: string;
  expiresAt: Date;
  items: Array<{ id: string; variantId: string; quantity: number; unitPriceCents: number }>;
}

const CART_SELECT = {
  id: true,
  expiresAt: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: { id: true, variantId: true, quantity: true, unitPriceCents: true },
  },
};

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // findActive => carrito ACTIVE más reciente del usuario (regla: uno por usuario)
  public async findActive(userId: string): Promise<CartRow | null> {
    return this.prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: CART_SELECT,
    });
  }

  public async create(userId: string, expiresAt: Date): Promise<CartRow> {
    return this.prisma.cart.create({ data: { userId, expiresAt }, select: CART_SELECT });
  }

  // markAbandoned => carrito vencido: se conserva como ABANDONED (insumo para campañas de recuperación)
  public async markAbandoned(cartId: string): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { status: "ABANDONED" } });
  }

  public async touch(cartId: string, expiresAt: Date): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { expiresAt } });
  }

  // upsertItem => si la variante ya está en el carrito suma la cantidad; si no, crea la línea (@@unique cartId+variantId)
  public async upsertItem(
    cartId: string,
    variantId: string,
    quantity: number,
    unitPriceCents: number
  ): Promise<void> {
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity, unitPriceCents },
      create: { cartId, variantId, quantity, unitPriceCents },
    });
  }

  public async updateQuantity(itemId: string, quantity: number): Promise<void> {
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  public async deleteItem(itemId: string): Promise<void> {
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  public async clear(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }
}

export const cartRepository = new CartRepository(prisma);
