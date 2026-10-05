import { redis } from "../../config/redis.config";
import { appConfig } from "../../config/app.config";

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
  }
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await redis.del(...keys);
    }
  } catch {
  }
}

export type CatalogEntity = "product" | "brand" | "category" | "collection";

export async function invalidateCatalog(...entities: CatalogEntity[]): Promise<void> {
  await Promise.all(entities.map((entity) => invalidatePattern(`catalog:${entity}:*`)));
  notifyStorefront();
}

function notifyStorefront(): void {
  const { STOREFRONT_REVALIDATE_URL: url, REVALIDATE_SECRET: secret } = appConfig;
  if (!url || !secret) return;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ tags: ["catalog"] }),
    signal: AbortSignal.timeout(3_000),
  }).catch(() => undefined);
}
