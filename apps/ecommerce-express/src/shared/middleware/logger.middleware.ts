// logger.middleware.ts => logging estructurado (JSON) con Winston + log de acceso HTTP por request.
// Logs en JSON => indexables por Loki/ELK/CloudWatch sin parsers frágiles (observabilidad).
import type { NextFunction, Request, Response } from "express";
import winston from "winston"; // Librería de logging con niveles, formatos y transportes
import { isProduction } from "../../config/app.config";

// "createLogger" => instancia única (Singleton) usada por toda la app en lugar de console.log
export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  // "combine" => compone formateadores (patrón Pipeline): timestamp + stack de errores + JSON
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple()
  ),
  transports: [new winston.transports.Console()], // stdout: Docker/Kubernetes recolectan desde ahí
});

// requestLogger => registra método, ruta, status y duración al TERMINAR cada respuesta
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint(); // Reloj monotónico de alta resolución (nanosegundos)
  // "once('finish')" => evento de Node cuando la respuesta terminó de enviarse
  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info("http_request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });
  next();
}
