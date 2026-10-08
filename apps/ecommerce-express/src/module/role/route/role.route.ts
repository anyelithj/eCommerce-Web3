import { Router } from "express";
import { roleController } from "../controller/role.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";

export const roleRouter = Router();

roleRouter.post(
  "/",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.createRole.bind(roleController)
);

roleRouter.get("/", jwtAuthGuard, roleController.listRoles.bind(roleController));

roleRouter.get("/:id", jwtAuthGuard, roleController.getRoleById.bind(roleController));

roleRouter.patch(
  "/:id",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.updateRole.bind(roleController)
);

roleRouter.delete(
  "/:id",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.deleteRoleById.bind(roleController)
);
