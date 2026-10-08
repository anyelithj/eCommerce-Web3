import type { Request, Response, NextFunction } from "express";
import { roleService } from "../service/role.service";
import { CreateRoleSchema, UpdateRoleSchema } from "../schema/role.schema";

export class RoleController {
  public async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateRoleSchema.parse(req.body);
      const role = await roleService.createRole(validatedInput);
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  public async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await roleService.listRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  public async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id) {
        res.status(400).json({ success: false, message: "id requerido" });
        return;
      }

      const role = await roleService.getRoleById(id);
      res.status(200).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  public async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id) {
        res.status(400).json({ success: false, message: "id requerido" });
        return;
      }

      const validatedInput = UpdateRoleSchema.parse(req.body);
      const role = await roleService.updateRole(id, validatedInput);
      res.status(200).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  public async deleteRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id) {
        res.status(400).json({ success: false, message: "id requerido" });
        return;
      }

      await roleService.deleteRoleById(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
