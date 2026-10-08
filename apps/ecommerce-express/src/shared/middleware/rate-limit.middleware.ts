// rate-limit.middleware.ts => límite de peticiones por IP con ventana fija en Redis (INCR + EXPIRE atómicos).
// Protege login, registro, 2FA y reset de password contra fuerza bruta y abuso (OWASP API4: Unrestricted Resource Consumption).
// Se implementa sobre ioredis (ya instalado) en lugar de agregar otra librería que haría lo mismo.
import type { NextFunction, Request, Response } from "express";
import { redis, RedisKeys } from "../../config/redis.config";
import { TooManyRequestsException } from "../filter/http-exception.filter";

export interface RateLimitOptions {
  bucket: string; // Nombre lógico del límite ("auth-login")
  limit: number; // Máximo de peticiones por ventana
  windowSeconds: number; // Duración de la ventana
}

// consumeRateLimit => núcleo reutilizable (REST y GraphQL comparten el MISMO cupo por bucket: DRY y sin evasión).
// Devuelve el contador de la ventana, o null si Redis no responde.
export async function consumeRateLimit(
  options: RateLimitOptions,
  ip: string
): Promise<number | null> {
  const key = RedisKeys.rateLimit(options.bucket, ip);
  // "multi()" => transacción MULTI/EXEC: INCR y EXPIRE NX se ejecutan juntos (sin condición de carrera)
  const results = await redis
    .multi()
    .incr(key)
    .expire(key, options.windowSeconds, "NX") // "NX" => solo fija el TTL la primera vez (ventana fija)
    .exec()
    // Fail-open: si Redis cae, se permite la petición (disponibilidad > protección parcial);
    // el listener "error" de redis.config.ts ya deja constancia de la caída en los logs
    .catch(() => null);
  // results = [[error, valor], ...]; el primer comando (INCR) devuelve el contador actual
  return results ? Number(results[0]?.[1] ?? 0) : null;
}

// assertRateLimit => versión para resolvers GraphQL: lanza 429 si se superó el cupo
export async function assertRateLimit(options: RateLimitOptions, ip: string): Promise<void> {
  const count = await consumeRateLimit(options, ip);
  if (count !== null && count > options.limit) throw new TooManyRequestsException();
}

// rateLimit => Factory de middlewares (un bucket por endpoint sensible)
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // "req.ip" => IP del cliente (con "trust proxy" configurado en app.ts detrás de un balanceador)
    consumeRateLimit(options, req.ip ?? "unknown")
      .then((count) => {
        if (count === null) return next(); // Redis caído => fail-open
        // Cabeceras estándar para que el cliente conozca su cuota restante
        res.setHeader("RateLimit-Limit", options.limit);
        res.setHeader("RateLimit-Remaining", Math.max(0, options.limit - count));
        if (count > options.limit) return next(new TooManyRequestsException());
        next();
      })
      .catch(next);
  };
}
