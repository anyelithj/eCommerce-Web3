// redis.config.ts (ioredis) => cliente Redis ÚNICO (Singleton) para cache, rate-limit y códigos de un solo uso.
import Redis from "ioredis"; // Cliente Redis para Node con reconexión automática y soporte de Cluster
import { appConfig } from "./app.config";

// "new Redis(url, options)" => la conexión se abre de forma perezosa (lazyConnect) en el primer comando:
// importar este módulo no abre sockets (útil en tests unitarios que nunca tocan Redis)
export const redis = new Redis(appConfig.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2, // Falla rápido si Redis no responde: la cache es una optimización, no la fuente de verdad
  enableOfflineQueue: false, // No encola comandos si está desconectado (evita latencias acumuladas)
});

// "on('error')" => sin este listener, un error de conexión de ioredis se vuelve una excepción no capturada
redis.on("error", (error: Error) => {
  // Se registra y se continúa: los helpers de cache degradan con elegancia a la base de datos (Graceful Degradation)
  console.warn("[redis] conexión no disponible:", error.message);
});

// Prefijos de claves centralizados (DRY): evita colisiones entre módulos que comparten el mismo Redis
export const RedisKeys = {
  cart: (userId: string) => `cart:active:${userId}`,
  permissions: (roles: readonly string[]) => `rbac:perms:${[...roles].sort().join(",")}`,
  rateLimit: (bucket: string, identifier: string) => `ratelimit:${bucket}:${identifier}`,
  catalog: (resource: string, fingerprint: string) => `catalog:${resource}:${fingerprint}`,
  web3Nonce: (walletAddress: string) => `web3:nonce:${walletAddress.toLowerCase()}`,
  report: (kind: string, fingerprint: string) => `report:${kind}:${fingerprint}`,
} as const; // "as const" => objeto de solo lectura con tipos literales
