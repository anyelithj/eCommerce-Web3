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

  io.use((socket, next) => {
    const token = typeof socket.handshake.auth["token"] === "string" ? socket.handshake.auth["token"] : "";
    resolveAccessToken(token)
      .then((user) => {
        if (!user) return next(new Error("UNAUTHORIZED"));
        socket.data["userId"] = user.id;
        next();
      })
      .catch(() => next(new Error("UNAUTHORIZED")));
  });

  io.on("connection", (socket) => {
    const userId = String(socket.data["userId"]);
    void socket.join(`user:${userId}`);
    logger.debug("socket_connected", { userId });
  });

  return io;
}
