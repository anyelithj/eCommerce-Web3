// socket.config.ts (Socket.io) => canal de tiempo real para el chat de Communication (sprint 6.1).
// Las notificaciones in-app ya NO viajan por aquí: usan GraphQL Subscriptions (graphql.config.ts).
// Autenticación en el handshake con el MISMO access token JWT de la API; cada usuario entra a su sala privada
// "user:<id>" => el servidor emite solo al destinatario (nunca broadcast de datos personales).
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { appConfig } from "./app.config";
import { resolveAccessToken } from "../module/auth/strategy/jwt.strategy";
import { logger } from "../shared/middleware/logger.middleware";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: "/ws/socket.io",
    cors: { origin: appConfig.CORS_ORIGINS, credentials: true },
  });

  // Middleware de handshake: se ejecuta UNA vez por conexión (no por mensaje)
  io.use((socket, next) => {
    // El cliente envía el token en "auth" (no en la URL: las URLs quedan en logs de proxies)
    const token =
      typeof socket.handshake.auth["token"] === "string" ? socket.handshake.auth["token"] : "";
    resolveAccessToken(token)
      .then((user) => {
        if (!user) return next(new Error("UNAUTHORIZED"));
        socket.data["userId"] = user.id; // "socket.data" => estado tipado por conexión
        next();
      })
      .catch(() => next(new Error("UNAUTHORIZED")));
  });

  io.on("connection", (socket) => {
    const userId = String(socket.data["userId"]);
    void socket.join(`user:${userId}`); // Sala privada del usuario
    logger.debug("socket_connected", { userId });
  });

  return io;
}
