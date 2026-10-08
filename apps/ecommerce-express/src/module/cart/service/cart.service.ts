// cart.service.ts => casos de uso del carrito: obtener activo, agregar, cambiar cantidad, quitar, vaciar.
// Cache-Aside en Redis con TTL: el carrito se lee en cada página (badge del header) y se escribe poco.
import { cartRepository, type CartRepository, type CartRow } from "../repository/cart.repository";
import {
  cartSubtotal,
  lineTotal,
  PrismaStockGateway,
  type StockGateway,
} from "../model/cart.model";
import {
  CartItemNotFoundException,
  CurrencyMismatchException,
  InsufficientStockException,
  ProductUnavailableException,
} from "../exception/cart.exception";
import type { CartDto } from "../dto/cart.dto";
import type { AddCartItemInput } from "../schema/cart.schema";
import { prisma } from "../../../config/database.config";
import { appConfig } from "../../../config/app.config";
import { RedisKeys } from "../../../config/redis.config";
import { cached, invalidate } from "../../../shared/interceptor/cache.interceptor";
import { addDays } from "../../../shared/util/date.util";

const CART_CACHE_TTL = 300; // 5 minutos

export class CartService {
  // Dos dependencias inyectadas (DIP): persistencia del carrito y consulta de inventario
  constructor(
    private readonly repository: CartRepository,
    private readonly stock: StockGateway
  ) {}

  // getActiveCart => "obtener carrito activo del usuario autenticado vía JWT"
  public async getActiveCart(userId: string): Promise<CartDto> {
    return cached(RedisKeys.cart(userId), CART_CACHE_TTL, async () =>
      this.toDto(await this.resolveActiveCart(userId))
    );
  }

  // addItemToCart => "agregar producto al carrito con validación de stock"
  public async addItemToCart(userId: string, input: AddCartItemInput): Promise<CartDto> {
    const cart = await this.resolveActiveCart(userId);
    const availability = (await this.stock.getAvailability([input.variantId])).get(input.variantId);
    if (!availability || !availability.purchasable) throw new ProductUnavailableException();
    if (availability.currency !== appConfig.DEFAULT_CURRENCY)
      throw new CurrencyMismatchException(appConfig.DEFAULT_CURRENCY, availability.currency);

    // Cantidad resultante = lo que ya había en el carrito + lo nuevo; debe caber en el disponible
    const existing = cart.items.find((item) => item.variantId === input.variantId);
    const quantity = (existing?.quantity ?? 0) + input.quantity;
    if (quantity > availability.available)
      throw new InsufficientStockException(availability.sku, availability.available);

    await this.repository.upsertItem(cart.id, input.variantId, quantity, availability.priceCents);
    return this.afterWrite(userId, cart.id);
  }

  // updateItemQuantity => "cambiar cantidad del ítem — PATCH parcial"
  public async updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<CartDto> {
    const { cart, item } = await this.findOwnedItem(userId, itemId);
    const availability = (await this.stock.getAvailability([item.variantId])).get(item.variantId);
    if (!availability?.purchasable) throw new ProductUnavailableException();
    if (quantity > availability.available)
      throw new InsufficientStockException(availability.sku, availability.available);

    await this.repository.updateQuantity(itemId, quantity);
    return this.afterWrite(userId, cart.id);
  }

  // removeCartItem => "eliminar ítem específico del carrito"
  public async removeCartItem(userId: string, itemId: string): Promise<CartDto> {
    const { cart } = await this.findOwnedItem(userId, itemId);
    await this.repository.deleteItem(itemId);
    return this.afterWrite(userId, cart.id);
  }

  // deleteAllCarts => "vaciar carrito completo"
  public async clearCart(userId: string): Promise<CartDto> {
    const cart = await this.resolveActiveCart(userId);
    await this.repository.clear(cart.id);
    return this.afterWrite(userId, cart.id);
  }

  // invalidateCache => lo usa el Checkout al convertir el carrito
  public async invalidateCache(userId: string): Promise<void> {
    await invalidate(RedisKeys.cart(userId));
  }

  // resolveActiveCart => devuelve el carrito ACTIVE vigente; si venció lo marca ABANDONED y crea uno nuevo
  private async resolveActiveCart(userId: string): Promise<CartRow> {
    const cart = await this.repository.findActive(userId);
    if (cart && cart.expiresAt > new Date()) return cart;
    if (cart) await this.repository.markAbandoned(cart.id);
    return this.repository.create(userId, addDays(new Date(), appConfig.CART_TTL_DAYS));
  }

  // findOwnedItem => el ítem debe pertenecer al carrito activo del usuario (ownership, sin revelar ítems ajenos)
  private async findOwnedItem(userId: string, itemId: string) {
    const cart = await this.resolveActiveCart(userId);
    const item = cart.items.find((line) => line.id === itemId);
    if (!item) throw new CartItemNotFoundException(itemId);
    return { cart, item };
  }

  // afterWrite => extiende la vigencia, invalida la cache y devuelve el estado fresco
  private async afterWrite(userId: string, cartId: string): Promise<CartDto> {
    await this.repository.touch(cartId, addDays(new Date(), appConfig.CART_TTL_DAYS));
    await this.invalidateCache(userId);
    return this.getActiveCart(userId);
  }

  // toDto => enriquece cada línea con datos vivos del catálogo (precio actual, disponibilidad)
  private async toDto(cart: CartRow): Promise<CartDto> {
    const availability = await this.stock.getAvailability(cart.items.map((item) => item.variantId));
    const items = cart.items.flatMap((item) => {
      const info = availability.get(item.variantId);
      if (!info) return []; // Variante eliminada del catálogo: la línea se omite ("flatMap" con [] = filtrar)
      const current = { unitPriceCents: info.priceCents, quantity: item.quantity };
      return [
        {
          id: item.id,
          variantId: item.variantId,
          productId: info.productId,
          productName: info.productName,
          productSlug: info.productSlug,
          variantName: info.variantName,
          sku: info.sku,
          imageUrl: info.imageUrl,
          unitPriceCents: info.priceCents,
          quantity: item.quantity,
          lineTotalCents: lineTotal(current),
          available: info.available,
          priceChanged: info.priceCents !== item.unitPriceCents,
          purchasable: info.purchasable && info.available >= item.quantity,
        },
      ];
    });
    return {
      id: cart.id,
      currency: appConfig.DEFAULT_CURRENCY,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: cartSubtotal(items),
      expiresAt: cart.expiresAt,
    };
  }
}

// Composición de dependencias (Composition Root del módulo): hoy el inventario lo resuelve PostgreSQL
export const cartService = new CartService(cartRepository, new PrismaStockGateway(prisma));
