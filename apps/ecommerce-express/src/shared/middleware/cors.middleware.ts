import cors from "cors";
import { appConfig } from "../../config/app.config";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || appConfig.CORS_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 600,
});
