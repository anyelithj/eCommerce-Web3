// transform.interceptor.ts => "interceptores" HTTP compartidos: envuelven handlers y respuestas.
// Patrón Decorator/Interceptor + DRY: elimina el try/catch repetido en cada método de controller y
// garantiza que TODAS las respuestas exitosas tengan el mismo sobre { success, data, meta? }.
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PaginationMeta } from "../types/pagination.types";
import { HttpStatus, type SuccessStatus } from "../constants/http.constants";

// Firma de un handler asíncrono de Express (devuelve una Promesa en vez de void)
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// asyncHandler => Express 4 NO captura promesas rechazadas: sin este wrapper un "throw" dentro de un
// handler async dejaría la petición colgada. ".catch(next)" delega el error al error.middleware global.
// Higher-Order Function (paradigma funcional): recibe una función y devuelve otra función.
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    // "void" => marca explícitamente que la promesa se maneja aquí (regla no-floating-promises)
    void handler(req, res, next).catch(next);
  };
}

// sendSuccess => respuesta estándar ApiSuccess<T> (contrato del paquete @ecommerce/shared-types)
// "<T>" => genérico: el tipo del payload se conserva hasta el JSON
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: SuccessStatus = HttpStatus.OK,
  meta?: PaginationMeta
): void {
  // Spread condicional: "meta" solo aparece en la respuesta cuando existe (listados paginados)
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

// sendNoContent => 204 sin cuerpo (convención REST para DELETE exitosos)
export function sendNoContent(res: Response): void {
  res.status(HttpStatus.NO_CONTENT).send();
}
