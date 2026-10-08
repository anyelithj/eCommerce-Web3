import { Router } from "express";
import { cartController } from "../controller/cart.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";

export const cartRouter = Router();
cartRouter.use(jwtAuthGuard);

cartRouter.get("/active", cartController.getActiveCart);
cartRouter.delete("/", cartController.clearCart);
cartRouter.post("/item", cartController.addItemToCart);
cartRouter.patch("/item/:id", cartController.updateItemQuantity);
cartRouter.delete("/item/:id", cartController.removeCartItem);
