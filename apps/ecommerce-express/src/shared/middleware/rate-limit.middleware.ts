import type { NextFunction, Request, Response } from "express";
import { redis, RedisKeys } from "../../config/redis.config";
import { TooManyRequestsException } from "../filter/http-exception.filter";

export interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

export async function consumeRateLimit(
  options: RateLimitOptions,
  ip: string
): Promise<number | null> {
  const key = RedisKeys.rateLimit(options.bucket, ip);
  const results = await redis
    .multi()
    .incr(key)
    .expire(key, options.windowSeconds, "NX")
    .exec()
    .catch(() => null);
  return results ? Number(results[0]?.[1] ?? 0) : null;
}

export async function assertRateLimit(options: RateLimitOptions, ip: string): Promise<void> {
  const count = await consumeRateLimit(options, ip);
  if (count !== null && count > options.limit) throw new TooManyRequestsException();
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    consumeRateLimit(options, req.ip ?? "unknown")
      .then((count) => {
        if (count === null) return next();
        res.setHeader("RateLimit-Limit", options.limit);
        res.setHeader("RateLimit-Remaining", Math.max(0, options.limit - count));
        if (count > options.limit) return next(new TooManyRequestsException());
        next();
      })
      .catch(next);
  };
}
