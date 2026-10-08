// order.route.ts => todos los endpoints requieren sesión; la visibilidad (propios/staff) la decide el service.
import { Router } from "express";
import { orderController } from "../controller/order.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";
import { Roles } from "../../../shared/constants/roles.constants";
import { requirePermission } from "../../../shared/middleware/rbac.middleware";

export const orderRouter = Router();
orderRouter.use(jwtAuthGuard);

orderRouter.post("/", orderController.placeOrder);
// Pedido creado por el staff (venta asistida o pruebas): solo ADMIN (Guard); el service valida stock y precios
orderRouter.post("/manual", requireRoles(Roles.ADMIN), orderController.createManualOrder);
orderRouter.get("/", orderController.listOrders);
orderRouter.get("/:id", orderController.getOrderById);
// Cambiar el estado es operación de staff (permiso granular UPDATE:order)
orderRouter.patch(
  "/:id/status",
  requirePermission("UPDATE", "order"),
  orderController.updateOrderStatus
);
// Cancelar: el dueño o el staff (el service valida ownership y estado)
orderRouter.delete("/:id", orderController.cancelOrder);
