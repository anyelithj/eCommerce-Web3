import type { Request, Response } from "express";
import { dashboardService } from "../service/dashboard.service";
import { KPIQuerySchema, UpdateWidgetSchema, WidgetSchema } from "../schema/dashboard.schema";
import { asyncHandler, sendNoContent, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseObjectId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class DashboardController {
  public readonly listDashboardConfigs = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.listDashboardConfigs(currentUser(req).id));
  });

  public readonly listDashboardKPIs = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.listDashboardKPIs(KPIQuerySchema.parse(req.query)));
  });

  public readonly createDashboardWidget = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.createDashboardWidget(currentUser(req).id, WidgetSchema.parse(req.body)), HttpStatus.CREATED);
  });

  public readonly updateDashboardWidget = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.updateDashboardWidget(parseObjectId(req), currentUser(req).id, UpdateWidgetSchema.parse(req.body)));
  });

  public readonly deleteDashboardWidgetById = asyncHandler(async (req: Request, res: Response) => {
    await dashboardService.deleteDashboardWidgetById(parseObjectId(req), currentUser(req).id);
    sendNoContent(res);
  });
}

export const dashboardController = new DashboardController();
