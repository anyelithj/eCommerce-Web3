import type { Request, Response } from "express";
import { orderService } from "../service/order.service";
import {
  CancelOrderSchema,
  ListOrdersQuerySchema,
  ManualOrderSchema,
  PlaceOrderSchema,
  UpdateOrderStatusSchema,
} from "../schema/order.schema";
import { asyncHandler, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class OrderController {
  public readonly placeOrder = asyncHandler(async (req: Request, res: Response) => {
    const { checkoutSessionId } = PlaceOrderSchema.parse(req.body);
    sendSuccess(
      res,
      await orderService.placeOrder(checkoutSessionId, currentUser(req)),
      HttpStatus.CREATED
    );
  });

  public readonly createManualOrder = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await orderService.createManualOrder(ManualOrderSchema.parse(req.body), currentUser(req)),
      HttpStatus.CREATED
    );
  });

  public readonly listOrders = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await orderService.listOrders(
      ListOrdersQuerySchema.parse(req.query),
      currentUser(req)
    );
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  public readonly getOrderById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await orderService.getOrderById(parseId(req), currentUser(req)));
  });

  public readonly updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, note } = UpdateOrderStatusSchema.parse(req.body);
    sendSuccess(
      res,
      await orderService.updateOrderStatus(parseId(req), status, note, currentUser(req))
    );
  });

  public readonly cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const { reason } = CancelOrderSchema.parse(req.body ?? {});
    sendSuccess(res, await orderService.cancelOrder(parseId(req), reason, currentUser(req)));
  });
}

export const orderController = new OrderController();
