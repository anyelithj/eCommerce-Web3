import type { SignOptions } from "jsonwebtoken";
import { appConfig } from "./app.config";

type ExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export const jwtConfig = {
  accessSecret: appConfig.JWT_ACCESS_SECRET,
  refreshSecret: appConfig.JWT_REFRESH_SECRET,
  accessExpiresIn: appConfig.JWT_ACCESS_EXPIRES_IN as ExpiresIn,
  refreshExpiresIn: appConfig.JWT_REFRESH_EXPIRES_IN as ExpiresIn,
  issuer: "ecommerce-web3-express",
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
  accessTtlSeconds: 15 * 60,
} as const;
