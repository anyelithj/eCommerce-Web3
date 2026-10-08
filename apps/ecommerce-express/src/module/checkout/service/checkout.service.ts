// checkout.service.ts => Saga de checkout (sprint 3.2): iniciar (reserva stock) → dirección/envío (PATCH)
// → pago (módulo Payment) → pedido (módulo Order). También cancela y expira sesiones liberando el stock.
import {
  checkoutRepository,
  type CheckoutRepository,
  type CheckoutRow,
} from "../repository/checkout.repository";
import { computeTotals, isOpen } from "../model/checkout.model";
import {
  CheckoutClosedException,
  CheckoutNotFoundException,
  EmptyCartException,
  InvalidShippingRateException,
} from "../exception/checkout.exception";
import type { CheckoutSessionDto, ShippingRateDto } from "../dto/checkout.dto";
import {
  CheckoutItemsSchema,
  ShippingAddressSnapshotSchema,
  type CheckoutItemSnapshot,
} from "../schema/checkout.schema";
import { cartService } from "../../cart/service/cart.service";
import {
  UnprocessableException,
  NotFoundException,
} from "../../../shared/filter/http-exception.filter";
import { prisma } from "../../../config/database.config";
import { appConfig } from "../../../config/app.config";
import { addMinutes } from "../../../shared/util/date.util";
import { logger } from "../../../shared/middleware/logger.middleware";

// ponytail: tarifa única gratis (no hay módulo de envíos); cotizar por peso/destino cuando exista shipping
const SHIPPING_RATES: readonly ShippingRateDto[] = [
  { code: "STANDARD", label: "Envío estándar", costCents: 0 },
];

// Sin módulo de cupones: un código recibido se rechaza explícitamente (no se ignora en silencio)
function rejectCoupon(code: string): never {
  throw new UnprocessableException("Los cupones no están disponibles", "COUPON_UNAVAILABLE", {
    code,
  });
}

export class CheckoutService {
  constructor(private readonly repository: CheckoutRepository) {}

  // initCheckout => "iniciar sesión checkout con ítems del carrito"
  public async initCheckout(userId: string, couponCode?: string): Promise<CheckoutSessionDto> {
    const cart = await cartService.getActiveCart(userId);
    if (cart.items.length === 0) throw new EmptyCartException();
    const blocked = cart.items.find((item) => !item.purchasable);
    if (blocked)
      throw new UnprocessableException(
        `${blocked.productName} no está disponible en la cantidad pedida`,
        "CART_ITEM_UNAVAILABLE",
        { itemId: blocked.id }
      );

    // Una sesión abierta a la vez: las anteriores se abandonan y liberan su stock
    for (const open of await this.repository.findOpenByUser(userId)) {
      await this.repository.releaseAndClose(
        open.id,
        CheckoutItemsSchema.parse(open.items),
        "ABANDONED"
      );
    }

    // Snapshot inmutable de los ítems con el precio VIGENTE (el total ya no cambia aunque cambie el catálogo)
    const weights = await prisma.productVariant.findMany({
      where: { id: { in: cart.items.map((item) => item.variantId) } },
      select: { id: true, weightGrams: true },
    });
    const weightById = new Map(weights.map((variant) => [variant.id, variant.weightGrams]));
    const items: CheckoutItemSnapshot[] = cart.items.map((item) => ({
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      imageUrl: item.imageUrl,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      weightGrams: weightById.get(item.variantId) ?? 0,
    }));

    if (couponCode) rejectCoupon(couponCode);
    const session = await this.repository.createWithReservation({
      userId,
      cartId: cart.id,
      items,
      totals: computeTotals({
        subtotalCents: cart.subtotalCents,
        discountCents: 0,
        shippingCents: 0,
        taxRate: appConfig.TAX_RATE,
      }),
      couponId: null,
      currency: cart.currency,
      expiresAt: addMinutes(new Date(), appConfig.CHECKOUT_TTL_MINUTES),
    });
    await cartService.invalidateCache(userId);
    return this.toDto(session);
  }

  // getCheckoutSessionById => "obtener estado completo de sesión checkout" (+ tarifas si ya hay dirección)
  public async getCheckoutSessionById(id: string, userId: string): Promise<CheckoutSessionDto> {
    const session = await this.findOwned(id, userId);
    const dto = this.toDto(session);
    if (session.addressId && isOpen(session.status)) {
      dto.shippingRates = [...SHIPPING_RATES];
    }
    return dto;
  }

  // updateCheckoutStep => "seleccionar dirección de envío — PATCH parcial" (+ tarifa y cupón)
  public async updateCheckoutStep(
    id: string,
    userId: string,
    input: { addressId: string; shippingRateCode: string; couponCode?: string | null | undefined }
  ): Promise<CheckoutSessionDto> {
    const session = await this.findOwned(id, userId);
    // Solo se edita antes de pagar (PAYMENT_PENDING ya tiene un PaymentIntent por un monto fijo)
    if (session.status !== "OPEN" && session.status !== "ADDRESS_SET")
      throw new CheckoutClosedException(session.status);

    const address = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
    if (!address) throw new NotFoundException("Address", input.addressId);

    const rates = [...SHIPPING_RATES];
    const rate = rates.find((option) => option.code === input.shippingRateCode);
    if (!rate) throw new InvalidShippingRateException(input.shippingRateCode);

    const { couponId, discountCents, freeShipping } = this.resolveCoupon(session, input.couponCode);

    const shippingAddress = ShippingAddressSnapshotSchema.parse(address); // Proyección: solo campos de envío
    const updated = await this.repository.update(id, {
      status: "ADDRESS_SET",
      addressId: address.id,
      shippingAddress,
      shippingRateCode: rate.code,
      couponId,
      ...computeTotals({
        subtotalCents: session.subtotalCents,
        discountCents,
        shippingCents: freeShipping ? 0 : rate.costCents,
        taxRate: appConfig.TAX_RATE,
      }),
    });
    const dto = this.toDto(updated);
    dto.shippingRates = rates;
    return dto;
  }

  // abandonCheckout => "cancelar/expirar sesión de checkout y liberar stock reservado"
  public async abandonCheckout(id: string, userId: string): Promise<void> {
    const session = await this.findOwned(id, userId);
    if (!isOpen(session.status)) throw new CheckoutClosedException(session.status);
    await this.repository.releaseAndClose(
      id,
      CheckoutItemsSchema.parse(session.items),
      "ABANDONED"
    );
  }

  // markPaymentPending => lo invoca el módulo Payment al crear el PaymentIntent (extiende la reserva 15 min)
  public async markPaymentPending(id: string): Promise<void> {
    await this.repository.update(id, {
      status: "PAYMENT_PENDING",
      expiresAt: addMinutes(new Date(), 15),
    });
  }

  // requireForPayment => sesión propia y lista para pagar (dirección y envío definidos)
  public async requireForPayment(id: string, userId: string): Promise<CheckoutRow> {
    const session = await this.findOwned(id, userId);
    if (session.status !== "ADDRESS_SET" && session.status !== "PAYMENT_PENDING") {
      throw new UnprocessableException(
        "Completa la dirección y el envío antes de pagar",
        "CHECKOUT_NOT_READY"
      );
    }
    return session;
  }

  // expireStaleSessions => job periódico: libera el stock de sesiones vencidas (lo agenda server.ts)
  public async expireStaleSessions(batchSize = 100): Promise<number> {
    let expired = 0;
    for (const session of await this.repository.findExpired(batchSize)) {
      const closed = await this.repository.releaseAndClose(
        session.id,
        CheckoutItemsSchema.parse(session.items),
        "EXPIRED"
      );
      if (closed) expired += 1;
    }
    if (expired > 0) logger.info("checkout_sessions_expired", { expired });
    return expired;
  }

  // resolveCoupon => undefined: se conserva (y se revalida) | null: se quita | string: se aplica el nuevo código
  private resolveCoupon(
    session: CheckoutRow,
    couponCode: string | null | undefined
  ): { couponId: string | null; discountCents: number; freeShipping: boolean } {
    if (couponCode === null) return { couponId: null, discountCents: 0, freeShipping: false };
    const code = couponCode ?? session.coupon?.code;
    if (!code) return { couponId: null, discountCents: 0, freeShipping: false };
    return rejectCoupon(code);
  }

  private async findOwned(id: string, userId: string): Promise<CheckoutRow> {
    const session = await this.repository.findById(id);
    // Sesión ajena => 404 (no se revela que existe)
    if (!session || session.userId !== userId) throw new CheckoutNotFoundException(id);
    return session;
  }

  private toDto(session: CheckoutRow): CheckoutSessionDto {
    return {
      id: session.id,
      status: session.status,
      currency: session.currency,
      items: CheckoutItemsSchema.parse(session.items),
      addressId: session.addressId,
      shippingAddress: session.shippingAddress
        ? ShippingAddressSnapshotSchema.parse(session.shippingAddress)
        : null,
      shippingRateCode: session.shippingRateCode,
      couponCode: session.coupon?.code ?? null,
      subtotalCents: session.subtotalCents,
      discountCents: session.discountCents,
      shippingCents: session.shippingCents,
      taxCents: session.taxCents,
      totalCents: session.totalCents,
      expiresAt: session.expiresAt,
      orderId: session.order?.id ?? null,
    };
  }
}

export const checkoutService = new CheckoutService(checkoutRepository);
