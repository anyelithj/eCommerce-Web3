// role.route.ts => enrutamiento del módulo Role; TODAS las mutaciones requieren rol ADMIN
// (gestionar roles/permisos es una operación crítica de seguridad, nunca se delega a otros roles)
import { Router } from "express";
import { roleController } from "../controller/role.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";

export const roleRouter = Router();

// POST /api/v1/role => crear rol (solo ADMIN)
roleRouter.post(
  "/",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.createRole.bind(roleController)
);

// GET /api/v1/role => listar roles (cualquier usuario autenticado puede CONSULTAR, ej. para un selector de UI)
roleRouter.get("/", jwtAuthGuard, roleController.listRoles.bind(roleController));

// GET /api/v1/role/:id => detalle de un rol con sus permisos
roleRouter.get("/:id", jwtAuthGuard, roleController.getRoleById.bind(roleController));

// PATCH /api/v1/role/:id => modificar rol (solo ADMIN)
roleRouter.patch(
  "/:id",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.updateRole.bind(roleController)
);

// DELETE /api/v1/role/:id => eliminar rol (solo ADMIN)
roleRouter.delete(
  "/:id",
  jwtAuthGuard,
  requireRoles("ADMIN"),
  roleController.deleteRoleById.bind(roleController)
);
