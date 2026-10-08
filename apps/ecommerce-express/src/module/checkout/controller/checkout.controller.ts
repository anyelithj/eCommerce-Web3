import type { Request, Response } from "express";
import { checkoutService } from "../service/checkout.service";
import { InitCheckoutSchema, UpdateCheckoutAddressSchema } from "../schema/checkout.schema";
import {
  asyncHandler,
  sendNoContent,
  sendSuccess,
} from "../../../shared/interceptor/transform.interceptor";
import { parseId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class CheckoutController {
  public readonly initCheckout = asyncHandler(async (req: Request, res: Response) => {
    const { couponCode } = InitCheckoutSchema.parse(req.body ?? {});
    sendSuccess(
      res,
      await checkoutService.initCheckout(currentUser(req).id, couponCode),
      HttpStatus.CREATED
    );
  });

  public readonly getCheckoutSessionById = asyncHandler(async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    sendSuccess(
      res,
      await checkoutService.getCheckoutSessionById(parseId(req), currentUser(req).id)
    );
  });

  public readonly updateCheckoutStep = asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateCheckoutAddressSchema.parse(req.body);
    sendSuccess(
      res,
      await checkoutService.updateCheckoutStep(parseId(req), currentUser(req).id, input)
    );
  });

  public readonly abandonCheckout = asyncHandler(async (req: Request, res: Response) => {
    await checkoutService.abandonCheckout(parseId(req), currentUser(req).id);
    sendNoContent(res);
  });
}

export const checkoutController = new CheckoutController();
