import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import passport from "passport";
import { configurePassport } from "./config/passport.config";
import { createGraphqlHandler, GRAPHQL_PATH } from "./config/graphql.config";
import { mountSwagger, type ApiModule } from "./config/swagger.config";
import { isProduction } from "./config/app.config";
import { prisma } from "./config/database.config";
import { corsMiddleware } from "./shared/middleware/cors.middleware";
import { requestLogger } from "./shared/middleware/logger.middleware";
import { optionalAuth } from "./shared/middleware/jwt.middleware";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { productRouter } from "./module/product/route/product.route";
import { inventoryRouter } from "./module/inventory/route/inventory.route";

const API_PREFIX = "/api/v1";

const API_MODULES: readonly ApiModule[] = [
  ["product", productRouter],
  ["inventory", inventoryRouter],
];

export async function createApp(): Promise<Express> {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(requestLogger);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  configurePassport();
  app.use(passport.initialize());

  for (const [segment, router] of API_MODULES) app.use(`${API_PREFIX}/${segment}`, router);

  if (!isProduction) mountSwagger(app, API_MODULES, API_PREFIX);

  app.use(GRAPHQL_PATH, optionalAuth, await createGraphqlHandler());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/ready", (_req: Request, res: Response) => {
    prisma.$queryRaw`SELECT 1`
      .then(() => res.status(200).json({ status: "ready" }))
      .catch(() => res.status(503).json({ status: "unavailable" }));
  });

  app.use("/api", (_req: Request, res: Response) => {
    res
      .status(404)
      .json({ success: false, message: "Recurso no encontrado", code: "ROUTE_NOT_FOUND" });
  });

  app.use(errorMiddleware);

  return app;
}
