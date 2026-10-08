import { Router } from "express";
import { recommendationController } from "../controller/recommendation.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";

export const recommendationRouter = Router();
recommendationRouter.use(jwtAuthGuard);

recommendationRouter.post(
  "/session",
  rateLimit({ bucket: "recommendation-session", limit: 30, windowSeconds: 60 }),
  recommendationController.createRecommendationSession
);
recommendationRouter.get("/", recommendationController.listRecommendations);
recommendationRouter.delete("/history", recommendationController.deleteAllRecommendations);
recommendationRouter.get("/:id", recommendationController.getRecommendationById);
