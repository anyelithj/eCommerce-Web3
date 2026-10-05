import { Router } from "express";
import { dashboardController } from "../controller/dashboard.controller";
import { jwtAuthGuard, requireRoles } from "../../auth/guard/auth.guard";
import { Roles } from "../../../shared/constants/roles.constants";

export const dashboardRouter = Router();
dashboardRouter.use(jwtAuthGuard, requireRoles(Roles.ADMIN));

dashboardRouter.get("/config", dashboardController.listDashboardConfigs);
dashboardRouter.get("/kpi", dashboardController.listDashboardKPIs);
dashboardRouter.post("/widget", dashboardController.createDashboardWidget);
dashboardRouter.patch("/widget/:id", dashboardController.updateDashboardWidget);
dashboardRouter.delete("/widget/:id", dashboardController.deleteDashboardWidgetById);
