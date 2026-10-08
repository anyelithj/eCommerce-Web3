import type { OrderStatus, ShipmentStatus } from "@prisma/client";
import {
  orderRepository,
  type OrderRepository,
  type OrderScope,
} from "../repository/order.repository";
import { canBeCancelled, canTransitionOrder } from "../model/order.model";
import { commerceEvents, type OrderEventPayload } from "../event/order.event";
import {
  InvalidOrderTransitionException,
  OrderNotCancellableException,
  OrderNotFoundException,
  PaymentNotConfirmedException,
} from "../exception/order.exception";
import type { OrderDetailDto, OrderSummaryDto } from "../dto/order.dto";
import type { ListOrdersQuery, ManualOrderInput } from "../schema/order.schema";
import { computeTotals } from "../../checkout/model/checkout.model";
import type { CheckoutItemSnapshot } from "../../checkout/schema/checkout.schema";
import {
  NotFoundException,
  UnprocessableException,
} from "../../../shared/filter/http-exception.filter";
import { prisma } from "../../../config/database.config";
import { appConfig } from "../../../config/app.config";
import { buildPaginationMeta, toPageParams } from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import { Roles } from "../../../shared/constants/roles.constants";

export interface OrderViewer {
  id: string;
  roles: string[];
}

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  public async placeOrder(
    checkoutSessionId: string,
    viewer?: OrderViewer
  ): Promise<OrderDetailDto> {
    const result = await this.repository.placeFromCheckout(checkoutSessionId);
    if (!result) throw new PaymentNotConfirmedException();

    const order = await this.repository.findDetail(result.orderId);
    if (!order) throw new OrderNotFoundException(result.orderId);
    if (viewer && !this.canView(order, viewer)) throw new OrderNotFoundException(result.orderId);

    if (result.created) commerceEvents.emit("order.placed", toPayload(order));
    return order;
  }

  public async createManualOrder(
    input: ManualOrderInput,
    viewer: OrderViewer
  ): Promise<OrderDetailDto> {
    const customer = await prisma.user.findUnique({
      where: { email: input.customerEmail },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("User", input.customerEmail);

    const variants = await prisma.productVariant.findMany({
      where: { sku: { in: input.items.map((item) => item.sku) }, isActive: true },
      include: {
        product: {
          select: {
            name: true,
            images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    });
    const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
    const missing = input.items.find((item) => !bySku.has(item.sku));
    if (missing)
      throw new UnprocessableException(
        `No existe una variante activa con SKU ${missing.sku}`,
        "VARIANT_NOT_FOUND",
        { sku: missing.sku }
      );

    const items: CheckoutItemSnapshot[] = input.items.map(({ sku, quantity }) => {
      const variant = bySku.get(sku)!;
      return {
        variantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        variantName: variant.name,
        sku,
        imageUrl: variant.product.images[0]?.url ?? null,
        unitPriceCents: variant.priceCents,
        quantity,
        weightGrams: variant.weightGrams,
      };
    });
    const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const orderId = await this.repository.createManual({
      userId: customer.id,
      items,
      totals: computeTotals({
        subtotalCents,
        discountCents: 0,
        shippingCents: input.shippingCents,
        taxRate: appConfig.TAX_RATE,
      }),
      currency: appConfig.DEFAULT_CURRENCY,
      shippingAddress: input.shippingAddress,
      note: input.note || "Pedido creado por el administrador",
      changedById: viewer.id,
    });
    const order = await this.getOrderById(orderId, viewer);
    commerceEvents.emit("order.placed", toPayload(order));
    return order;
  }

  public async listOrders(
    query: ListOrdersQuery,
    viewer: OrderViewer
  ): Promise<{ items: OrderSummaryDto[]; meta: PaginationMeta }> {
    const page = toPageParams(query);
    const { items, total } = await this.repository.findMany(this.scopeFor(viewer), query, page);
    return { items, meta: buildPaginationMeta(page, total) };
  }

  public async getOrderById(id: string, viewer: OrderViewer): Promise<OrderDetailDto> {
    const order = await this.repository.findDetail(id);
    if (!order || !(await this.canViewAsync(order, viewer))) throw new OrderNotFoundException(id);
    return order;
  }

  public async updateOrderStatus(
    id: string,
    to: OrderStatus,
    note: string | undefined,
    viewer: OrderViewer
  ): Promise<OrderDetailDto> {
    const order = await this.getOrderById(id, viewer);
    if (to === "CANCELLED") return this.cancelOrder(id, note ?? "Cancelado por el staff", viewer);
    if (!canTransitionOrder(order.status, to))
      throw new InvalidOrderTransitionException(order.status, to);

    await this.repository.changeStatus(id, order.status, to, note ?? null, viewer.id);
    commerceEvents.emit("order.status-changed", { ...toPayload(order), from: order.status, to });
    return this.getOrderById(id, viewer);
  }

  public async cancelOrder(
    id: string,
    reason: string,
    viewer: OrderViewer
  ): Promise<OrderDetailDto> {
    const order = await this.getOrderById(id, viewer);
    if (!canBeCancelled(order.status)) throw new OrderNotCancellableException(order.status);

    await this.repository.cancelAndRestock(id, order.status, reason, viewer.id);
    commerceEvents.emit("order.cancelled", { ...toPayload(order), reason });
    return this.getOrderById(id, viewer);
  }

  public async syncFromShipment(orderId: string, shipmentStatus: ShipmentStatus): Promise<void> {
    const target: OrderStatus | null =
      shipmentStatus === "IN_TRANSIT" || shipmentStatus === "OUT_FOR_DELIVERY"
        ? "SHIPPED"
        : shipmentStatus === "DELIVERED"
          ? "DELIVERED"
          : null;
    if (!target) return;
    const order = await this.repository.findDetail(orderId);
    if (!order || order.status === target) return;

    const path: OrderStatus[] = ["CONFIRMED", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"];
    let current = order.status;
    while (
      current !== target &&
      canTransitionOrder(current, path[path.indexOf(current) + 1] as OrderStatus)
    ) {
      const next = path[path.indexOf(current) + 1] as OrderStatus;
      await this.repository.changeStatus(
        orderId,
        current,
        next,
        "Actualizado por el estado del envío",
        null
      );
      commerceEvents.emit("order.status-changed", { ...toPayload(order), from: current, to: next });
      current = next;
    }
  }

  private scopeFor(viewer: OrderViewer): OrderScope {
    if (viewer.roles.includes(Roles.ADMIN)) return { all: true };
    if (viewer.roles.includes(Roles.VENDOR)) return { vendorId: viewer.id };
    return { userId: viewer.id };
  }

  private canView(order: OrderDetailDto, viewer: OrderViewer): boolean {
    return order.userId === viewer.id || viewer.roles.includes(Roles.ADMIN);
  }

  private async canViewAsync(order: OrderDetailDto, viewer: OrderViewer): Promise<boolean> {
    if (this.canView(order, viewer)) return true;
    return (
      viewer.roles.includes(Roles.VENDOR) && this.repository.vendorOwnsAnyItem(order.id, viewer.id)
    );
  }
}

function toPayload(order: OrderDetailDto): OrderEventPayload {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    totalCents: order.totalCents,
    currency: order.currency,
  };
}

export const orderService = new OrderService(orderRepository);
