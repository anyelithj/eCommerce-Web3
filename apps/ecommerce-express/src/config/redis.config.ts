import Redis from "ioredis";
import { appConfig } from "./app.config";

export const redis = new Redis(appConfig.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
});

redis.on("error", (error: Error) => {
  console.warn("[redis] conexión no disponible:", error.message);
});

export const RedisKeys = {
  cart: (userId: string) => `cart:active:${userId}`,
  permissions: (roles: readonly string[]) => `rbac:perms:${[...roles].sort().join(",")}`,
  rateLimit: (bucket: string, identifier: string) => `ratelimit:${bucket}:${identifier}`,
  catalog: (resource: string, fingerprint: string) => `catalog:${resource}:${fingerprint}`,
  web3Nonce: (walletAddress: string) => `web3:nonce:${walletAddress.toLowerCase()}`,
  report: (kind: string, fingerprint: string) => `report:${kind}:${fingerprint}`,
} as const;
