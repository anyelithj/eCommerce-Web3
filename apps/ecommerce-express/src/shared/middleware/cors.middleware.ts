// cors.middleware.ts => política CORS basada en una lista blanca de orígenes (CORS_ORIGINS).
// Corrige la versión anterior de app.ts, que decidía el origen según NEXT_PUBLIC_API_URL (variable del frontend,
// sin relación con quién puede llamar a la API) y con "*" + credentials (combinación que los navegadores rechazan).
import cors from "cors";
import { appConfig } from "../../config/app.config";

export const corsMiddleware = cors({
  // Función de origen: acepta peticiones sin Origin (curl, server-to-server, webhooks) y las de la lista blanca
  origin: (origin, callback) => {
    if (!origin || appConfig.CORS_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false); // Origen no permitido: el navegador bloqueará la respuesta
  },
  credentials: true, // Permite Authorization/cookies en peticiones cross-origin
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 600, // Cachea la respuesta preflight 10 min (menos peticiones OPTIONS = mejor performance)
});
