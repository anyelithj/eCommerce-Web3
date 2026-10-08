// bootstrap.ts => Composition Root de la aplicación: conecta bases de datos, crea el servidor HTTP + WebSocket,
// registra los suscriptores de eventos de dominio, agenda los jobs y maneja el apagado ordenado.
// Lo carga server.ts DESPUÉS de resolver los secretos (Key Vault opcional o .env), porque app.config valida el
// entorno en cuanto se importa.
import { createServer } from "node:http";
import { createApp } from "./app";
import { appConfig } from "./config/app.config";
import { connectMongo, disconnectDatabases } from "./config/database.config";
import { redis } from "./config/redis.config";
import { initSocket } from "./config/socket.config";
import { attachGraphqlSubscriptions } from "./config/graphql.config";
import { logger } from "./shared/middleware/logger.middleware";
import { registerInventorySubscribers } from "./module/inventory/event/inventory.event";

// registerDomainSubscribers => cada módulo registra sus reacciones a eventos (Observer); UNA sola vez por proceso
function registerDomainSubscribers(): void {
  registerInventorySubscribers(); // Stock ajustado => invalida caché; stock bajo => aviso a administradores
}

export async function bootstrap(): Promise<void> {
  // MongoDB (notificaciones, historial): si no conecta, la API sigue sirviendo el resto (degradación parcial)
  await connectMongo().catch((error: unknown) => logger.error("mongo_unavailable", { error }));
  await redis.connect().catch(() => logger.warn("redis_unavailable_starting_without_cache"));

  const app = await createApp();
  const server = createServer(app); // Servidor HTTP compartido por Express, GraphQL WebSocket y Socket.io (mismo puerto)
  attachGraphqlSubscriptions(server); // GraphQL Subscriptions (graphql-ws) en /graphql
  initSocket(server); // Socket.io en /ws/socket.io (chat de Communication)
  registerDomainSubscribers();

  server.listen(appConfig.PORT, () => {
    // Template literal con interpolación: confirma en consola que el servidor arrancó y en qué puerto
    logger.info(`Express API (Fases 1-4) escuchando en http://localhost:${appConfig.PORT}`);
  });

  // Graceful shutdown: Docker/Kubernetes envían SIGTERM; se deja de aceptar conexiones y se cierran recursos
  const shutdown = (signal: string) => {
    logger.info("shutdown_started", { signal });
    server.close(() => {
      Promise.all([disconnectDatabases(), redis.quit().catch(() => undefined)])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // Si algo se cuelga, se fuerza la salida a los 10 s
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
