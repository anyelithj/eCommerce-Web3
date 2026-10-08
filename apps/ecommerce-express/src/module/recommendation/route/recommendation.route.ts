// recommendation.route.ts => recomendaciones personalizadas del usuario autenticado (historial propio).
import { Router } from "express";
import { recommendationController } from "../controller/recommendation.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";

export const recommendationRouter = Router();
recommendationRouter.use(jwtAuthGuard);

// Cada sesión puede invocar al LLM local: 30 por minuto por IP evitan gastar CPU/energía por abuso
recommendationRouter.post(
  "/session",
  rateLimit({ bucket: "recommendation-session", limit: 30, windowSeconds: 60 }),
  recommendationController.createRecommendationSession
);
recommendationRouter.get("/", recommendationController.listRecommendations);
recommendationRouter.delete("/history", recommendationController.deleteAllRecommendations); // Ruta literal antes de "/:id"
recommendationRouter.get("/:id", recommendationController.getRecommendationById);
