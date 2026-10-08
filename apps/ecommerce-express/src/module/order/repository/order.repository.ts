// order.repository.ts => acceso a datos de pedidos. "placeFromCheckout" es la transacción central del
// commerce flow: convierte una sesión de checkout PAGADA en un pedido, de forma atómica e idempotente.
import { Prisma, type OrderStatus, type PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { generateOrderNumber } from "../model/order.model";
import type { OrderDetailDto, OrderSummaryDto } from "../dto/order.dto";
import {
  CheckoutItemsSchema,
  ShippingAddressSnapshotSchema,
  type CheckoutItemSnapshot,
  type ShippingAddressSnapshot,
} from "../../checkout/schema/checkout.schema";
import { StockReservationException } from "../../checkout/exception/checkout.exception";
import type { CheckoutTotals } from "../../checkout/model/checkout.model";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";

const DETAIL_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "asc" } },
  shipment: { include: { events: { orderBy: { occurredAt: "asc" } } } },
  invoice: { select: { id: true, number: true } },
  refunds: { select: { id: true, status: true, amountCents: true } },
} satisfies Prisma.OrderInclude;

type DetailRow = Prisma.OrderGetPayload<{ include: typeof DETAIL_INCLUDE }>;

// OrderScope => qué pedidos puede ver quien consulta (propios, de sus productos o todos)
export type OrderScope = { userId: string } | { vendorId: string } | { all: true };

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findMany(
    scope: OrderScope,
    filters: { status?: OrderStatus | undefined; from?: Date | undefined; to?: Date | undefined },
    page: PageParams
  ): Promise<Paginated<OrderSummaryDto>> {
    const where: Prisma.OrderWhereInput = {
      ...("userId" in scope ? { userId: scope.userId } : {}),
      // VENDOR: pedidos que contienen al menos un producto suyo
      ...("vendorId" in scope
        ? { items: { some: { product: { vendorId: scope.vendorId } } } }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            placedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: page.skip,
        take: page.limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          currency: true,
          totalCents: true,
          placedAt: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, ...order }) => ({ ...order, itemCount: _count.items })),
      total,
    };
  }

  public async findDetail(id: string): Promise<OrderDetailDto | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    return row ? toDetail(row) : null;
  }

  public async findByCheckout(checkoutSessionId: string): Promise<{ id: string } | null> {
    return this.prisma.order.findUnique({ where: { checkoutSessionId }, select: { id: true } });
  }

  // vendorOwnsAnyItem => ¿el vendedor tiene productos en este pedido? (visibilidad y despacho del VENDOR)
  public async vendorOwnsAnyItem(orderId: string, vendorId: string): Promise<boolean> {
    return (await this.prisma.orderItem.count({ where: { orderId, product: { vendorId } } })) > 0;
  }

  // placeFromCheckout => TRANSACCIÓN (Unit of Work): pedido + ítems + stock + carrito + checkout + pago + cupón.
  // Si CUALQUIER paso falla, Postgres revierte todo: nunca queda un pedido sin descuento de stock ni al revés.
  // Devuelve null si el checkout no está listo (sin pago confirmado).
  public async placeFromCheckout(
    checkoutSessionId: string
  ): Promise<{ orderId: string; created: boolean } | null> {
    return this.prisma.$transaction(
      async (tx) => {
        // Idempotencia: el webhook de Stripe puede llegar dos veces; la segunda vez se devuelve el pedido existente
        const existing = await tx.order.findUnique({
          where: { checkoutSessionId },
          select: { id: true },
        });
        if (existing) return { orderId: existing.id, created: false };

        const checkout = await tx.checkoutSession.findUnique({ where: { id: checkoutSessionId } });
        const payment = await tx.payment.findFirst({
          where: { checkoutSessionId, status: "SUCCEEDED" },
          select: { id: true },
        });
        if (!checkout || checkout.status !== "PAYMENT_PENDING" || !payment) return null;

        // Los snapshots Json se validan con Zod: si la forma no es la esperada, la transacción aborta
        const items = CheckoutItemsSchema.parse(checkout.items);
        const shippingAddress = ShippingAddressSnapshotSchema.parse(checkout.shippingAddress);

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: checkout.userId,
            checkoutSessionId,
            currency: checkout.currency,
            subtotalCents: checkout.subtotalCents,
            discountCents: checkout.discountCents,
            shippingCents: checkout.shippingCents,
            taxCents: checkout.taxCents,
            totalCents: checkout.totalCents,
            shippingAddress,
            couponId: checkout.couponId,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName,
                variantName: item.variantName,
                sku: item.sku,
                imageUrl: item.imageUrl,
                unitPriceCents: item.unitPriceCents,
                quantity: item.quantity,
                totalCents: item.unitPriceCents * item.quantity,
              })),
            },
            statusHistory: { create: { toStatus: "CONFIRMED", note: "Pago confirmado" } },
          },
          select: { id: true },
        });

        // La reserva hecha en el checkout se convierte en venta: stock -= q y reservedStock -= q (SQL atómico)
        for (const item of items) {
          await tx.$executeRaw`UPDATE "product_variants" SET "stock" = "stock" - ${item.quantity}, "reservedStock" = "reservedStock" - ${item.quantity} WHERE "id" = ${item.variantId}`;
        }

        await tx.cart.update({ where: { id: checkout.cartId }, data: { status: "CONVERTED" } });
        await tx.checkoutSession.update({
          where: { id: checkoutSessionId },
          data: { status: "COMPLETED" },
        });
        await tx.payment.updateMany({
          where: { checkoutSessionId, status: "SUCCEEDED" },
          data: { orderId: order.id },
        });

        if (checkout.couponId) {
          await tx.couponRedemption.create({
            data: {
              couponId: checkout.couponId,
              userId: checkout.userId,
              orderId: order.id,
              discountCents: checkout.discountCents,
            },
          });
          await tx.coupon.update({
            where: { id: checkout.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
        return { orderId: order.id, created: true };
      },
      // Serializable => evita que dos webhooks concurrentes creen dos pedidos para el mismo checkout
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  // createManual => TRANSACCIÓN (Unit of Work) del pedido creado por el ADMIN: carrito y sesión de checkout cerrados
  // (el esquema los exige: el pedido sigue siendo trazable), pago MANUAL cobrado, ítems y descuento de stock.
  // El descuento usa SQL condicional: si una variante no alcanza, "throw" revierte TODO (nunca stock negativo).
  public async createManual(data: {
    userId: string;
    items: CheckoutItemSnapshot[];
    totals: CheckoutTotals;
    currency: string;
    shippingAddress: ShippingAddressSnapshot;
    note: string;
    changedById: string;
  }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        // "$executeRaw`...`" (Prisma) => tagged template parametrizado (sin inyección SQL); devuelve filas afectadas
        const affected = await tx.$executeRaw`
          UPDATE "product_variants" SET "stock" = "stock" - ${item.quantity}
          WHERE "id" = ${item.variantId} AND "isActive" = true AND "stock" - "reservedStock" >= ${item.quantity}`;
        if (affected === 0) throw new StockReservationException(item.sku);
      }
      const now = new Date();
      const cart = await tx.cart.create({
        data: { userId: data.userId, status: "CONVERTED", expiresAt: now },
        select: { id: true },
      });
      const checkout = await tx.checkoutSession.create({
        data: {
          userId: data.userId,
          cartId: cart.id,
          status: "COMPLETED",
          items: data.items as unknown as Prisma.InputJsonValue, // Snapshot validado por Zod al leerlo
          shippingAddress: data.shippingAddress,
          currency: data.currency,
          ...data.totals,
          expiresAt: now,
        },
        select: { id: true },
      });
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: data.userId,
          checkoutSessionId: checkout.id,
          currency: data.currency,
          ...data.totals,
          shippingAddress: data.shippingAddress,
          // Destructuring con descarte ("weightGrams: _weight") => el peso no es columna de OrderItem
          items: {
            create: data.items.map(({ weightGrams: _weight, ...item }) => ({
              ...item,
              totalCents: item.unitPriceCents * item.quantity,
            })),
          },
          statusHistory: {
            create: { toStatus: "CONFIRMED", note: data.note, changedById: data.changedById },
          },
        },
        select: { id: true },
      });
      // Pago MANUAL (efectivo, transferencia, prueba): "manual_<uuid>" cumple el índice único sin tocar Stripe
      await tx.payment.create({
        data: {
          userId: data.userId,
          checkoutSessionId: checkout.id,
          orderId: order.id,
          provider: "MANUAL",
          providerPaymentId: `manual_${checkout.id}`,
          amountCents: data.totals.totalCents,
          currency: data.currency,
          status: "SUCCEEDED",
        },
      });
      return order.id;
    });
  }

  // changeStatus => actualiza el estado + bitácora en la misma transacción
  public async changeStatus(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    note: string | null,
    changedById: string | null
  ): Promise<void> {
    await this.prisma.order.update({
      where: { id },
      data: {
        status: to,
        ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        statusHistory: { create: { fromStatus: from, toStatus: to, note, changedById } },
      },
    });
  }

  // cancelAndRestock => cancelación + devolución de unidades al inventario (atómico)
  public async cancelAndRestock(
    id: string,
    from: OrderStatus,
    note: string,
    changedById: string | null
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { orderId: id },
        select: { variantId: true, quantity: true },
      });
      for (const item of items) {
        if (item.variantId)
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
      }
      await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          statusHistory: { create: { fromStatus: from, toStatus: "CANCELLED", note, changedById } },
        },
      });
    });
  }
}

function toDetail(row: DetailRow): OrderDetailDto {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    totalCents: row.totalCents,
    itemCount: row.items.length,
    placedAt: row.placedAt,
    userId: row.userId,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    shippingCents: row.shippingCents,
    taxCents: row.taxCents,
    shippingAddress: ShippingAddressSnapshotSchema.parse(row.shippingAddress),
    items: row.items.map(({ orderId: _orderId, ...item }) => item),
    statusHistory: row.statusHistory.map((entry) => ({
      from: entry.fromStatus,
      to: entry.toStatus,
      note: entry.note,
      at: entry.createdAt,
    })),
    payments: row.payments.map(({ id, status, amountCents, refundedCents, createdAt }) => ({
      id,
      status,
      amountCents,
      refundedCents,
      createdAt,
    })),
    shipment: row.shipment
      ? {
          id: row.shipment.id,
          orderId: row.id,
          orderNumber: row.orderNumber,
          status: row.shipment.status,
          rateCode: row.shipment.rateCode,
          carrier: row.shipment.carrier,
          service: row.shipment.service,
          trackingNumber: row.shipment.trackingNumber,
          labelUrl: row.shipment.labelUrl,
          costCents: row.shipment.costCents,
          estimatedDelivery: row.shipment.estimatedDelivery,
          shippedAt: row.shipment.shippedAt,
          deliveredAt: row.shipment.deliveredAt,
          events: row.shipment.events.map(({ status, description, location, occurredAt }) => ({
            status,
            description,
            location,
            occurredAt,
          })),
        }
      : null,
    invoice: row.invoice,
    refunds: row.refunds,
    cancelledAt: row.cancelledAt,
  };
}

export const orderRepository = new OrderRepository(prisma);
