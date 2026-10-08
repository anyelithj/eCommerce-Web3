// swagger.config.ts => documentación OpenAPI 3.0 de la API REST, GENERADA a partir de las rutas reales.
// En vez de escribir anotaciones a mano (que se desactualizan), se recorre el "stack" de cada Router de Express
// (introspección, patrón Builder) => la documentación siempre coincide con el código (DRY: una sola fuente de verdad).
// swagger-ui-express (open source, MIT) sirve la interfaz interactiva en /api/docs.
import type { Express, Router } from "express";
import swaggerUi from "swagger-ui-express";
import { appConfig } from "./app.config";
import { jwtAuthGuard } from "../module/auth/guard/auth.guard";

// ApiModule => par [segmento, router] que app.ts usa para montar las rutas y este archivo para documentarlas
export type ApiModule = readonly [segment: string, router: Router];

// Forma mínima (tipada localmente) de las capas internas de Express que se inspeccionan
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

// toOpenApiPath => "/:id/badge" (Express) -> "/{id}/badge" (OpenAPI) + lista de parámetros de ruta
function toOpenApiPath(path: string): { path: string; params: string[] } {
  const params: string[] = [];
  // "replace" con callback => captura cada ":nombre" y lo reescribe con llaves
  const converted = path.replace(/:(\w+)/g, (_match, name: string) => {
    params.push(name);
    return `{${name}}`;
  });
  return { path: converted, params };
}

// collectPaths => recorre las rutas de un Router y arma el objeto "paths" de OpenAPI (función pura)
function collectPaths(segment: string, router: Router, prefix: string): OpenApiPaths {
  const paths: OpenApiPaths = {};
  // "as unknown as" => los tipos públicos de Express no declaran "methods"; existe en runtime (API interna estable)
  for (const layer of router.stack as unknown as RouteLayer[]) {
    if (!layer.route) continue; // Middlewares sueltos (router.use) no son endpoints
    const { path, params } = toOpenApiPath(
      `${prefix}/${segment}${layer.route.path === "/" ? "" : layer.route.path}`
    );
    // Si la cadena de la ruta incluye el guard JWT, el endpoint exige "Authorization: Bearer"
    const secured = layer.route.stack.some((handler) => handler.handle === jwtAuthGuard);
    for (const method of Object.keys(layer.route.methods)) {
      paths[path] ??= {}; // "??=" => crea el objeto de la ruta solo si aún no existe
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

// buildOpenApiDocument => documento OpenAPI 3.0 completo para todos los módulos montados
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
    // "Object.assign({}, ...arrays)" => fusiona los "paths" de cada módulo en un solo objeto
    paths: Object.assign(
      {},
      ...modules.map(([segment, router]) => collectPaths(segment, router, prefix))
    ),
  };
}

// mountSwagger => /api/docs (UI interactiva) y /api/docs.json (documento crudo para generar clientes)
export function mountSwagger(app: Express, modules: readonly ApiModule[], prefix: string): void {
  const document = buildOpenApiDocument(modules, prefix);
  app.get("/api/docs.json", (_req, res) => res.json(document));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document));
}
