// validate.decorator.ts => "decorador" de rutas Express: valida body/query/params con Zod ANTES del controller.
// Patrón Decorator (envuelve el handler con validación) + Chain of Responsibility (es un middleware más).
// El controller recibe datos ya validados y tipados: no repite "Schema.parse" (DRY) y queda solo con HTTP (SRP).
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

// "Partial<Record<...>>" => se puede validar cualquier combinación de las tres fuentes
type RequestSchemas = Partial<Record<"body" | "query" | "params", ZodTypeAny>>;

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    // "parse" lanza ZodError; error.middleware lo traduce a 400 con el detalle por campo
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    // req.query se reemplaza con valores coercionados/por defecto (ej. page "2" -> 2)
    if (schemas.query) req.query = schemas.query.parse(req.query);
    next();
  };
}
