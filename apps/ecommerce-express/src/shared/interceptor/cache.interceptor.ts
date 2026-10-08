// cache.interceptor.ts => patrón Cache-Aside sobre Redis (lecturas calientes del catálogo y del carrito).
// Flujo: 1) leer de Redis  2) si no está (miss) => ejecutar el loader (DB)  3) guardar con TTL.
// Graceful Degradation: si Redis está caído se consulta la base de datos directamente (la cache nunca rompe la app).
import { redis } from "../../config/redis.config";
import { appConfig } from "../../config/app.config";

// cached => "<T>" genérico: devuelve el mismo tipo que produce el loader
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key); // GET => string serializado o null
    if (hit !== null) return JSON.parse(hit) as T; // Cache hit: se evita la consulta a la DB
  } catch {
    // Redis no disponible: se ignora y se sigue a la fuente de verdad
  }

  const value = await loader(); // Cache miss: fuente de verdad (PostgreSQL)

  try {
    // "EX" => expiración en segundos (TTL): la cache se autolimpia aunque falle una invalidación
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Escritura de cache fallida: no afecta la respuesta
  }
  return value;
}

// invalidate => borra claves exactas tras una escritura (consistencia: la próxima lectura va a la DB)
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Si Redis está caído el TTL corto limita cuánto tiempo puede servirse un dato viejo
  }
}

// invalidatePattern => borra por prefijo usando SCAN (NO "KEYS", que bloquea Redis en producción)
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    // "scanStream" => itera el keyspace en lotes sin bloquear el servidor
    const stream = redis.scanStream({ match: pattern, count: 100 });
    // "for await...of" => consume un stream asíncrono lote por lote
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await redis.del(...keys);
    }
  } catch {
    // Degradación elegante: el TTL expirará las claves
  }
}

// CatalogEntity => cada entidad del catálogo tiene su prefijo "catalog:<entidad>:*" en Redis
export type CatalogEntity = "product" | "brand" | "category" | "collection";

// invalidateCatalog => tras escribir en el catálogo: 1) limpia la cache Redis de las entidades afectadas
// 2) avisa al storefront Next.js para regenerar sus páginas ISR (on-demand revalidation) sin esperar los 60 s.
// Un solo punto de invalidación para los 4 servicios del catálogo (DRY).
export async function invalidateCatalog(...entities: CatalogEntity[]): Promise<void> {
  await Promise.all(entities.map((entity) => invalidatePattern(`catalog:${entity}:*`)));
  notifyStorefront();
}

// notifyStorefront => "fire-and-forget" (sin await): la respuesta al admin no espera a Next.js.
// ponytail: una sola etiqueta "catalog" regenera todo el catálogo; etiquetas por entidad si el volumen lo exige.
function notifyStorefront(): void {
  const { STOREFRONT_REVALIDATE_URL: url, REVALIDATE_SECRET: secret } = appConfig;
  if (!url || !secret) return; // Integración opcional: sin configuración, el ISR expira solo por tiempo
  // "fetch" nativo de Node 20 (sin dependencias); el secreto viaja en un header, nunca en la URL
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ tags: ["catalog"] }),
    signal: AbortSignal.timeout(3_000), // No dejar sockets colgados si el frontend no responde
  }).catch(() => undefined); // El TTL del ISR (60 s) es la red de seguridad
}
