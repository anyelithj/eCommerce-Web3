import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { logger } from "./logger.middleware";

interface AppError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error &&
    "message" in error
  );
}

const PRISMA_ERRORS: Record<string, [number, string, string]> = {
  P2002: [409, "DUPLICATE_RESOURCE", "Ya existe un registro con ese valor único"],
  P2003: [409, "RELATION_CONSTRAINT", "El registro está relacionado con otros datos"],
  P2025: [404, "RESOURCE_NOT_FOUND", "Registro no encontrado"],
};

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Error de validación",
      code: "VALIDATION_ERROR",
      errors: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERRORS[error.code];
    if (mapped) {
      const [status, code, message] = mapped;
      res.status(status).json({ success: false, message, code });
      return;
    }
  }

  if (error instanceof MulterError) {
    res.status(400).json({ success: false, message: error.message, code: `UPLOAD_${error.code}` });
    return;
  }

  logger.error("unhandled_error", { path: req.originalUrl, error });
  res
    .status(500)
    .json({ success: false, message: "Error interno del servidor", code: "INTERNAL_SERVER_ERROR" });
}
