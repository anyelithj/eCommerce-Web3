// checkout.route.ts => la saga de checkout es siempre del usuario autenticado (Guard JWT en todas las rutas).
import { Router } from "express";
import { checkoutController } from "../controller/checkout.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";

export const checkoutRouter = Router();
checkoutRouter.use(jwtAuthGuard);

checkoutRouter.post("/", checkoutController.initCheckout);
checkoutRouter.get("/:id", checkoutController.getCheckoutSessionById);
checkoutRouter.patch("/:id/address", checkoutController.updateCheckoutStep);
checkoutRouter.delete("/:id", checkoutController.abandonCheckout);
