// inventory.controller.ts => capa HTTP del módulo Inventory: valida con Zod y delega en el service (SRP).
import type { Request, Response } from "express";
import { inventoryService } from "../service/inventory.service";
import {
  ListInventoryQuerySchema,
  MovementSchema,
  StockAdjustSchema,
} from "../schema/inventory.schema";
import { asyncHandler, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseId, parseObjectId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class InventoryController {
  // GET /api/v1/inventory?q=&lowStock=&threshold=&page=
  public readonly listInventorys = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await inventoryService.listInventorys(
      ListInventoryQuerySchema.parse(req.query)
    );
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  // GET /api/v1/inventory/:id (":id" = ID de la variante)
  public readonly getInventoryById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await inventoryService.getInventoryById(parseId(req)));
  });

  // PATCH /api/v1/inventory/:id { stock, reason }
  public readonly updateInventory = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await inventoryService.updateInventory(
        parseId(req),
        StockAdjustSchema.parse(req.body),
        currentUser(req).id
      )
    );
  });

  // POST /api/v1/inventory/movement
  public readonly createStockMovement = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await inventoryService.createStockMovement(
        MovementSchema.parse(req.body),
        currentUser(req).id
      ),
      HttpStatus.CREATED
    );
  });

  // DELETE /api/v1/inventory/movement/:id (ObjectId del movimiento) => devuelve el nivel de stock resultante
  public readonly deleteStockMovementById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await inventoryService.deleteStockMovementById(parseObjectId(req), currentUser(req).id)
    );
  });
}

export const inventoryController = new InventoryController();
