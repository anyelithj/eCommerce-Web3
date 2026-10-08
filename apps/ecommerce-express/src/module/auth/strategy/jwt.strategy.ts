// jwt.strategy.ts => PATRÓN DE DISEÑO "Strategy": encapsula UN algoritmo de autenticación (JWT)
// detrás de una interfaz común de Passport. Permite intercambiar/agregar estrategias (OCP: se
// pueden sumar más strategies sin tocar el código que ya usa Passport).
import {
  Strategy as JwtPassportStrategy,
  ExtractJwt,
  type StrategyOptionsWithoutRequest,
} from "passport-jwt";
import type { AuthenticatedRequestUser, JwtPayload } from "../types/auth.types";
import { authRepository } from "../repository/auth.repository";
import { jwtConfig } from "../../../config/jwt.config";
import { verifyAccessToken } from "../util/token.util";

// StrategyOptionsWithoutRequest => tipo de Passport que define de dónde y cómo extraer el token
const jwtOptions: StrategyOptionsWithoutRequest = {
  // ExtractJwt.fromAuthHeaderAsBearerToken() => busca el token en el header "Authorization: Bearer <token>"
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtConfig.accessSecret, // Misma clave usada al firmar en token.util.ts (validada al arrancar)
  issuer: jwtConfig.issuer, // Rechaza tokens cuyo "iss" no sea esta API
};

// "new JwtPassportStrategy(options, verifyCallback)" => Passport ya validó la FIRMA del JWT;
// este callback solo se ejecuta si la firma es correcta y el token no expiró.
export const jwtStrategy = new JwtPassportStrategy(
  jwtOptions,
  // "async (payload, done) => {}" => callback de verificación; "done" es el patrón Node de callback (err, user)
  async (
    payload: JwtPayload,
    done: (error: unknown, user?: AuthenticatedRequestUser | false) => void
  ) => {
    try {
      // Verificamos que la sesión (refresh token asociado) siga activa en DB — permite REVOCAR
      // accessTokens antes de que expiren por sí solos (ej. al hacer logout)
      const session = await authRepository.findSessionById(payload.sessionId);

      // "!session || !session.isValid()" => si no existe la sesión o fue revocada, rechazamos
      if (!session || !session.isValid() || !session.belongsTo(payload.sub)) {
        // "done(null, false)" => Passport interpreta esto como "no autenticado", sin lanzar excepción
        return done(null, false);
      }

      // Construimos el objeto tipado que quedará disponible como "req.user" en los controllers
      const authenticatedUser: AuthenticatedRequestUser = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        sessionId: payload.sessionId,
      };

      // "done(null, user)" => éxito: Passport adjunta "authenticatedUser" a la request
      return done(null, authenticatedUser);
    } catch (error) {
      // "done(error)" => error inesperado (ej. DB caída): Passport lo propaga como 500
      return done(error, false);
    }
  }
);

// resolveAccessToken => token -> usuario autenticado, o null si no es válido. Para canales SIN request de Express
// (WebSocket de GraphQL Subscriptions y Socket.io): misma regla que jwt.strategy (firma vigente + sesión activa del
// mismo usuario), así un logout revoca también las conexiones en tiempo real (DRY entre canales).
export async function resolveAccessToken(token: string): Promise<AuthenticatedRequestUser | null> {
  try {
    const payload = verifyAccessToken(token); // Lanza si la firma es inválida o el token expiró
    const session = await authRepository.findSessionById(payload.sessionId);
    // "?." => sin sesión el resultado es undefined (falsy) y se rechaza
    if (!session?.isValid() || !session.belongsTo(payload.sub)) return null;
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      sessionId: payload.sessionId,
    };
  } catch {
    return null; // Token ilegible/expirado o base de datos caída => conexión anónima rechazada
  }
}
