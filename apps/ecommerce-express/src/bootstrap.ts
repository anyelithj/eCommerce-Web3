import { createServer } from "node:http";
import { createApp } from "./app";
import { appConfig } from "./config/app.config";
import { connectMongo, disconnectDatabases } from "./config/database.config";
import { redis } from "./config/redis.config";
import { initSocket } from "./config/socket.config";
import { attachGraphqlSubscriptions } from "./config/graphql.config";
import { logger } from "./shared/middleware/logger.middleware";
import { invoiceService } from "./module/invoice/service/invoice.service";
import { registerInventorySubscribers } from "./module/inventory/event/inventory.event";
import { registerNotificationSubscribers } from "./module/notification/event/notification.event";

function registerDomainSubscribers(): void {
  invoiceService.registerSubscribers();
  registerInventorySubscribers();
  registerNotificationSubscribers();
}

export async function bootstrap(): Promise<void> {
  await connectMongo().catch((error: unknown) => logger.error("mongo_unavailable", { error }));
  await redis.connect().catch(() => logger.warn("redis_unavailable_starting_without_cache"));

  const app = await createApp();
  const server = createServer(app);
  attachGraphqlSubscriptions(server);
  initSocket(server);
  registerDomainSubscribers();

  server.listen(appConfig.PORT, () => {
    logger.info(`Express API (Fases 1-4) escuchando en http://localhost:${appConfig.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info("shutdown_started", { signal });
    server.close(() => {
      Promise.all([disconnectDatabases(), redis.quit().catch(() => undefined)])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
