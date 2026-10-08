// jwt.config.ts => parámetros de firma de tokens en UN solo lugar (DRY: token.util y jwt.strategy los leen de aquí).
import type { SignOptions } from "jsonwebtoken"; // "import type" => solo el tipo, se elimina al compilar
import { appConfig } from "./app.config";

// "SignOptions['expiresIn']" => tipo indexado: reutiliza exactamente el tipo que espera jsonwebtoken
type ExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export const jwtConfig = {
  accessSecret: appConfig.JWT_ACCESS_SECRET,
  refreshSecret: appConfig.JWT_REFRESH_SECRET,
  // "as ExpiresIn" => el string del entorno ("15m", "7d") cumple el formato "ms" que acepta jsonwebtoken
  accessExpiresIn: appConfig.JWT_ACCESS_EXPIRES_IN as ExpiresIn,
  refreshExpiresIn: appConfig.JWT_REFRESH_EXPIRES_IN as ExpiresIn,
  issuer: "ecommerce-web3-express", // Claim "iss": identifica al emisor del token
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000, // Vida de la sesión en milisegundos (debe coincidir con refreshExpiresIn)
  accessTtlSeconds: 15 * 60, // Informado al cliente como "expiresIn" para programar el refresh
} as const;
