import { Router } from "express";

process.env["DATABASE_URL"] ??= "postgresql://test:test@localhost:5432/test";
process.env["JWT_ACCESS_SECRET"] ??= "test-access-secret-with-enough-length-0000";
process.env["JWT_REFRESH_SECRET"] ??= "test-refresh-secret-with-enough-length-000";

describe("buildOpenApiDocument", () => {
  it("convierte rutas Express en paths OpenAPI y marca las protegidas con JWT", async () => {
    const { buildOpenApiDocument } = await import("../../src/config/swagger.config");
    const { jwtAuthGuard } = await import("../../src/module/auth/guard/auth.guard");
    const router = Router();
    router.get("/", (_req, res) => res.end());
    router.patch("/:id/point", jwtAuthGuard, (_req, res) => res.end());

    const document = buildOpenApiDocument([["loyalty", router]], "/api/v1") as {
      paths: Record<string, Record<string, { security?: unknown; parameters: unknown[] }>>;
    };

    expect(Object.keys(document.paths)).toEqual(["/api/v1/loyalty", "/api/v1/loyalty/{id}/point"]);
    expect(document.paths["/api/v1/loyalty"]?.["get"]?.security).toBeUndefined();
    expect(document.paths["/api/v1/loyalty/{id}/point"]?.["patch"]?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(document.paths["/api/v1/loyalty/{id}/point"]?.["patch"]?.parameters).toHaveLength(1);
  });
});
