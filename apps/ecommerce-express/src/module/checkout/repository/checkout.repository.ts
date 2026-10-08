import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { StockReservationException } from "../exception/checkout.exception";
import { OPEN_STATUSES, type CheckoutTotals } from "../model/checkout.model";
import type { CheckoutItemSnapshot } from "../schema/checkout.schema";

const SESSION_INCLUDE = {
  coupon: { select: { code: true } },
  order: { select: { id: true } },
} satisfies Prisma.CheckoutSessionInclude;

export type CheckoutRow = Prisma.CheckoutSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

export class CheckoutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<CheckoutRow | null> {
    return this.prisma.checkoutSession.findUnique({ where: { id }, include: SESSION_INCLUDE });
  }

  public async findOpenByUser(
    userId: string
  ): Promise<Array<{ id: string; items: Prisma.JsonValue }>> {
    return this.prisma.checkoutSession.findMany({
      where: { userId, status: { in: OPEN_STATUSES } },
      select: { id: true, items: true },
    });
  }

  public async createWithReservation(data: {
    userId: string;
    cartId: string;
    items: CheckoutItemSnapshot[];
    totals: CheckoutTotals;
    couponId: string | null;
    currency: string;
    expiresAt: Date;
  }): Promise<CheckoutRow> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const affected = await tx.$executeRaw`
          UPDATE "product_variants" SET "reservedStock" = "reservedStock" + ${item.quantity}
          WHERE "id" = ${item.variantId} AND "isActive" = true AND "stock" - "reservedStock" >= ${item.quantity}`;
        if (affected === 0) throw new StockReservationException(item.sku);
      }
      return tx.checkoutSession.create({
        data: {
          userId: data.userId,
          cartId: data.cartId,
          items: data.items as unknown as Prisma.InputJsonValue,
          couponId: data.couponId,
          currency: data.currency,
          ...data.totals,
          expiresAt: data.expiresAt,
        },
        include: SESSION_INCLUDE,
      });
    });
  }

  public async update(
    id: string,
    data: Prisma.CheckoutSessionUncheckedUpdateInput
  ): Promise<CheckoutRow> {
    return this.prisma.checkoutSession.update({ where: { id }, data, include: SESSION_INCLUDE });
  }

  public async releaseAndClose(
    id: string,
    items: CheckoutItemSnapshot[],
    status: "ABANDONED" | "EXPIRED"
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.checkoutSession.updateMany({
        where: { id, status: { in: OPEN_STATUSES } },
        data: { status },
      });
      if (closed.count === 0) return false;
      for (const item of items) {
        await tx.$executeRaw`UPDATE "product_variants" SET "reservedStock" = GREATEST(0, "reservedStock" - ${item.quantity}) WHERE "id" = ${item.variantId}`;
      }
      return true;
    });
  }

  public async findExpired(
    limit: number
  ): Promise<Array<{ id: string; items: Prisma.JsonValue; status: string }>> {
    return this.prisma.checkoutSession.findMany({
      where: { status: { in: OPEN_STATUSES }, expiresAt: { lt: new Date() } },
      select: { id: true, items: true, status: true },
      take: limit,
    });
  }
}

export const checkoutRepository = new CheckoutRepository(prisma);
