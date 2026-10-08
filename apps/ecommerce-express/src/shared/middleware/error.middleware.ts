// error.middleware.ts => middleware GLOBAL de Express: captura TODO error lanzado con next(error)
// en cualquier controller, y lo traduce a una respuesta HTTP consistente (Clean Code: un solo lugar
// que decide el formato de error para TODA la API, no se repite en cada controller)
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client"; // Clases de error tipadas de Prisma (códigos P2002, P2025...)
import { MulterError } from "multer"; // Errores de subida de archivos (tamaño, cantidad)
import { logger } from "./logger.middleware";

// "AppError" => forma mínima que deben cumplir nuestras excepciones de dominio (duck typing estructural)
interface AppError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

// Type guard: función que ESTRECHA el tipo "unknown" a "AppError" verificando la forma en runtime
// (tipado seguro: nunca usamos "any" ni asumimos la forma del error sin comprobarla)
function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error &&
    "message" in error
  );
}

// Traducción de errores de Prisma a HTTP (patrón Adapter): el cliente nunca ve detalles internos de la base
// "Record<string, [number, string, string]>" => código Prisma -> [status, código API, mensaje]
const PRISMA_ERRORS: Record<string, [number, string, string]> = {
  P2002: [409, "DUPLICATE_RESOURCE", "Ya existe un registro con ese valor único"], // Violación de UNIQUE
  P2003: [409, "RELATION_CONSTRAINT", "El registro está relacionado con otros datos"], // Violación de FK
  P2025: [404, "RESOURCE_NOT_FOUND", "Registro no encontrado"], // update/delete sobre una fila inexistente
};

// "errorMiddleware" => DEBE tener 4 parámetros (err, req, res, next) para que Express lo reconozca
// como middleware de manejo de errores (contrato especial de Express, no es una convención libre)
export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Caso 1: error de validación Zod (falló .parse() en algún Controller)
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Error de validación",
      code: "VALIDATION_ERROR",
      // ".issues" => array detallado de Zod con QUÉ campo falló y POR QUÉ (útil para el frontend)
      errors: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  // Caso 2: excepción de dominio propia (AppException y las excepciones de cada módulo)
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      // Spread condicional: "details" solo se incluye si la excepción lo trae (ej. stock disponible)
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
    return;
  }

  // Caso 3: error conocido de Prisma (restricciones de la base de datos)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERRORS[error.code];
    if (mapped) {
      const [status, code, message] = mapped; // Desestructuración de tupla
      res.status(status).json({ success: false, message, code });
      return;
    }
  }

  // Caso 4: error de Multer (archivo demasiado grande, demasiados archivos)
  if (error instanceof MulterError) {
    res.status(400).json({ success: false, message: error.message, code: `UPLOAD_${error.code}` });
    return;
  }

  // Caso 5: error inesperado no controlado (bug real, DB caída, etc.)
  // Se loguea el stack completo en servidor, pero NUNCA se expone al cliente (evita fuga de información interna)
  logger.error("unhandled_error", { path: req.originalUrl, error });
  res
    .status(500)
    .json({ success: false, message: "Error interno del servidor", code: "INTERNAL_SERVER_ERROR" });
}
