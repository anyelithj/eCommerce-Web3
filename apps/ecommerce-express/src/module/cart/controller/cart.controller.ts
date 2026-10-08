// cart.controller.ts => capa HTTP del carrito (todas las operaciones sobre el carrito del usuario del JWT).
import type { Request, Response } from "express";
import { cartService } from "../service/cart.service";
import { AddCartItemSchema, UpdateCartItemSchema } from "../schema/cart.schema";
import { asyncHandler, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class CartController {
  // getActiveCart => GET /api/v1/cart/active
  public readonly getActiveCart = asyncHandler(async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store"); // Dato personal: nunca en caches compartidas
    sendSuccess(res, await cartService.getActiveCart(currentUser(req).id));
  });

  // deleteAllCarts => DELETE /api/v1/cart ("vaciar carrito completo"); devuelve el carrito vacío
  public readonly clearCart = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await cartService.clearCart(currentUser(req).id));
  });

  // addItemToCart => POST /api/v1/cart/item
  public readonly addItemToCart = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await cartService.addItemToCart(currentUser(req).id, AddCartItemSchema.parse(req.body)),
      HttpStatus.CREATED
    );
  });

  // updateItemQuantity => PATCH /api/v1/cart/item/:id
  public readonly updateItemQuantity = asyncHandler(async (req: Request, res: Response) => {
    const { quantity } = UpdateCartItemSchema.parse(req.body);
    sendSuccess(
      res,
      await cartService.updateItemQuantity(currentUser(req).id, parseId(req), quantity)
    );
  });

  // removeCartItem => DELETE /api/v1/cart/item/:id
  public readonly removeCartItem = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await cartService.removeCartItem(currentUser(req).id, parseId(req)));
  });
}

export const cartController = new CartController();
