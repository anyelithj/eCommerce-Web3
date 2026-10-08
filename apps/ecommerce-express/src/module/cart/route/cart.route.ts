// cart.route.ts => rutas del carrito; todas protegidas por JWT (el carrito es del usuario autenticado).
import { Router } from "express";
import { cartController } from "../controller/cart.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";

export const cartRouter = Router();
cartRouter.use(jwtAuthGuard);

// "/active" se declara ANTES de rutas con parámetros para que Express no lo interprete como ":id"
cartRouter.get("/active", cartController.getActiveCart);
cartRouter.delete("/", cartController.clearCart);
cartRouter.post("/item", cartController.addItemToCart);
cartRouter.patch("/item/:id", cartController.updateItemQuantity);
cartRouter.delete("/item/:id", cartController.removeCartItem);
