import type { Express, Router } from "express";
import swaggerUi from "swagger-ui-express";
import { appConfig } from "./app.config";
import { jwtAuthGuard } from "../module/auth/guard/auth.guard";

export type ApiModule = readonly [segment: string, router: Router];

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

type OpenApiOperation = {
  tags: string[];
  summary: string;
  parameters: object[];
  security?: object[];
  responses: object;
};
type OpenApiPaths = Record<string, Record<string, OpenApiOperation>>;

function toOpenApiPath(path: string): { path: string; params: string[] } {
  const params: string[] = [];
  const converted = path.replace(/:(\w+)/g, (_match, name: string) => {
    params.push(name);
    return `{${name}}`;
  });
  return { path: converted, params };
}

function collectPaths(segment: string, router: Router, prefix: string): OpenApiPaths {
  const paths: OpenApiPaths = {};
  for (const layer of router.stack as unknown as RouteLayer[]) {
    if (!layer.route) continue;
    const { path, params } = toOpenApiPath(
      `${prefix}/${segment}${layer.route.path === "/" ? "" : layer.route.path}`
    );
    const secured = layer.route.stack.some((handler) => handler.handle === jwtAuthGuard);
    for (const method of Object.keys(layer.route.methods)) {
      paths[path] ??= {};
      paths[path][method] = {
        tags: [segment],
        summary: `${method.toUpperCase()} ${path}`,
        parameters: params.map((name) => ({
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        })),
        ...(secured ? { security: [{ bearerAuth: [] }] } : {}),
        responses: {
          "200": { description: "Respuesta { success: true, data, meta? }" },
          "4XX": { description: "Error { success: false, message, code }" },
        },
      };
    }
  }
  return paths;
}

export function buildOpenApiDocument(modules: readonly ApiModule[], prefix: string): object {
  return {
    openapi: "3.0.3",
    info: {
      title: "eCommerce Web3 — API REST",
      version: "1.0.0",
      description:
        "Documentación generada desde las rutas de Express. GraphQL disponible en /graphql.",
    },
    servers: [{ url: `http://localhost:${appConfig.PORT}` }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    },
    paths: Object.assign(
      {},
      ...modules.map(([segment, router]) => collectPaths(segment, router, prefix))
    ),
  };
}

export function mountSwagger(app: Express, modules: readonly ApiModule[], prefix: string): void {
  const document = buildOpenApiDocument(modules, prefix);
  app.get("/api/docs.json", (_req, res) => res.json(document));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document));
}
