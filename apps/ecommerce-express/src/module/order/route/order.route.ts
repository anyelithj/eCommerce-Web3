import { Router } from "express";
import { orderController } from "../controller/order.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";
import { Roles } from "../../../shared/constants/roles.constants";
import { requirePermission } from "../../../shared/middleware/rbac.middleware";

export const orderRouter = Router();
orderRouter.use(jwtAuthGuard);

orderRouter.post("/", orderController.placeOrder);
orderRouter.post("/manual", requireRoles(Roles.ADMIN), orderController.createManualOrder);
orderRouter.get("/", orderController.listOrders);
orderRouter.get("/:id", orderController.getOrderById);
orderRouter.patch(
  "/:id/status",
  requirePermission("UPDATE", "order"),
  orderController.updateOrderStatus
);
orderRouter.delete("/:id", orderController.cancelOrder);
