import { Router } from "express";
import { inventoryController } from "../controller/inventory.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";
import { Roles } from "../../../shared/constants/roles.constants";

export const inventoryRouter = Router();
inventoryRouter.use(jwtAuthGuard, requireRoles(Roles.ADMIN));

inventoryRouter.post("/movement", inventoryController.createStockMovement);
inventoryRouter.delete("/movement/:id", inventoryController.deleteStockMovementById);
inventoryRouter.get("/", inventoryController.listInventorys);
inventoryRouter.get("/:id", inventoryController.getInventoryById);
inventoryRouter.patch("/:id", inventoryController.updateInventory);
