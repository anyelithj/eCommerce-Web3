// app.ts => configura la instancia de Express (middlewares globales + montaje de rutas).
// Se separa de "server.ts" (que crea el servidor HTTP) para poder importar "app" en los tests
// de integración con Supertest SIN levantar un servidor real (más rápido, sin puertos ocupados).
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet"; // Middleware que setea headers HTTP de seguridad (XSS, clickjacking, etc.)
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
// --- Routers por módulo (cada Router es independiente: SRP a nivel de módulo) ---
import { productRouter } from "./module/product/route/product.route";
import { inventoryRouter } from "./module/inventory/route/inventory.route";

const API_PREFIX = "/api/v1"; // Versionado por URL: /api/v2 convivirá sin romper clientes existentes

// API_MODULES => registro [segmento, router] de todos los módulos REST ("as const" + readonly: inmutable)
const API_MODULES: readonly ApiModule[] = [
  ["product", productRouter],
  ["inventory", inventoryRouter],
];

// "createApp" => Factory Function asíncrona: Apollo Server debe iniciarse (await) antes de montar /graphql
export async function createApp(): Promise<Express> {
  const app = express();

  // "trust proxy" => detrás de Nginx/ALB, req.ip es la IP real del cliente (necesario para el rate limit)
  app.set("trust proxy", 1);
  app.disable("x-powered-by"); // No revelar la tecnología del servidor

  // --- Middlewares globales (se ejecutan en TODAS las requests, en el orden declarado) ---
  app.use(helmet()); // 1º: headers de seguridad antes que cualquier otra cosa
  app.use(corsMiddleware); // Lista blanca de orígenes (CORS_ORIGINS)
  app.use(requestLogger); // Log estructurado de cada request (método, ruta, status, duración)

  app.use(express.json({ limit: "1mb" })); // Parsea JSON con límite de tamaño (protección contra payloads gigantes)
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Inicializa Passport y registra las strategies ANTES de montar las rutas que las usan
  configurePassport();
  app.use(passport.initialize());

  // --- API REST v1 --- (un solo registro monta las rutas Y genera la documentación: DRY)
  for (const [segment, router] of API_MODULES) app.use(`${API_PREFIX}/${segment}`, router);

  // --- Documentación OpenAPI 3.0 (/api/docs) --- fuera de producción no expone la superficie de la API
  if (!isProduction) mountSwagger(app, API_MODULES, API_PREFIX);

  // --- API GraphQL (catálogo, solo lectura) ---
  app.use(GRAPHQL_PATH, optionalAuth, await createGraphqlHandler());

  // Liveness: el proceso responde (Docker healthcheck / Kubernetes livenessProbe)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Readiness: además la base de datos responde (Kubernetes readinessProbe: no enviar tráfico si la DB cayó)
  app.get("/ready", (_req: Request, res: Response) => {
    prisma.$queryRaw`SELECT 1`
      .then(() => res.status(200).json({ status: "ready" }))
      .catch(() => res.status(503).json({ status: "unavailable" }));
  });

  // 404 en formato JSON estándar para rutas de la API inexistentes (en vez del HTML por defecto de Express)
  app.use("/api", (_req: Request, res: Response) => {
    res
      .status(404)
      .json({ success: false, message: "Recurso no encontrado", code: "ROUTE_NOT_FOUND" });
  });

  // El middleware de errores SIEMPRE se registra AL FINAL (Express lo detecta por su firma de 4 argumentos)
  app.use(errorMiddleware);

  return app;
}
