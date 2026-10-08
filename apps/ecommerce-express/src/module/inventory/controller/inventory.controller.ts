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
  public readonly listInventorys = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await inventoryService.listInventorys(
      ListInventoryQuerySchema.parse(req.query)
    );
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  public readonly getInventoryById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await inventoryService.getInventoryById(parseId(req)));
  });

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

  public readonly deleteStockMovementById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await inventoryService.deleteStockMovementById(parseObjectId(req), currentUser(req).id)
    );
  });
}

export const inventoryController = new InventoryController();
