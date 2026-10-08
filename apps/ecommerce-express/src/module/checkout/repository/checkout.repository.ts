// checkout.repository.ts => persistencia de la sesión de checkout + RESERVA ATÓMICA de stock.
// La reserva usa SQL condicional ("UPDATE ... WHERE stock - reserved >= q"): si dos clientes compiten por la
// última unidad, solo uno obtiene filas afectadas = 1 (control de concurrencia optimista a nivel de fila).
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

  // findOpenByUser => sesiones abiertas del usuario (se abandonan al iniciar una nueva: una a la vez)
  public async findOpenByUser(
    userId: string
  ): Promise<Array<{ id: string; items: Prisma.JsonValue }>> {
    return this.prisma.checkoutSession.findMany({
      where: { userId, status: { in: OPEN_STATUSES } },
      select: { id: true, items: true },
    });
  }

  // createWithReservation => crea la sesión y reserva el stock de cada ítem en UNA transacción
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
        // "$executeRaw`...`" => tagged template: los valores se envían como parámetros (sin inyección SQL)
        const affected = await tx.$executeRaw`
          UPDATE "product_variants" SET "reservedStock" = "reservedStock" + ${item.quantity}
          WHERE "id" = ${item.variantId} AND "isActive" = true AND "stock" - "reservedStock" >= ${item.quantity}`;
        // 0 filas => no alcanzó el stock: el "throw" revierte TODAS las reservas previas de la transacción
        if (affected === 0) throw new StockReservationException(item.sku);
      }
      return tx.checkoutSession.create({
        data: {
          userId: data.userId,
          cartId: data.cartId,
          items: data.items as unknown as Prisma.InputJsonValue, // Snapshot validado por Zod al leerlo
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

  // releaseAndClose => libera las reservas y cierra la sesión (ABANDONED por el usuario o EXPIRED por el job)
  // "status: { in: OPEN_STATUSES }" en el WHERE => idempotente y sin doble liberación si dos procesos coinciden
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
      if (closed.count === 0) return false; // Otro proceso ya la cerró o se completó el pago
      for (const item of items) {
        // GREATEST(0, ...) => nunca deja reservas negativas aunque haya datos inconsistentes
        await tx.$executeRaw`UPDATE "product_variants" SET "reservedStock" = GREATEST(0, "reservedStock" - ${item.quantity}) WHERE "id" = ${item.variantId}`;
      }
      return true;
    });
  }

  // findExpired => sesiones abiertas cuyo plazo venció (las procesa el job de expiración)
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
