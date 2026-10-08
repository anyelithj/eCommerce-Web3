// passport.config.ts => punto ÚNICO donde se registran TODAS las strategies de Passport (DRY:
// si se agrega otra strategy, solo se toca este archivo, no cada módulo que la usa)
// OAuth2 (Google/GitHub/Discord) ya no se registra aquí: el flujo lo completa next-auth en el frontend y el
// backend verifica el access token del proveedor en POST /auth/oauth (ver auth/strategy/oauth.strategy.ts).
import passport from "passport";
import { jwtStrategy } from "../module/auth/strategy/jwt.strategy";

export function configurePassport(): void {
  // "passport.use(strategy)" registra la Strategy bajo el "name" interno que Passport le asigna ("jwt")
  passport.use(jwtStrategy); // Se invoca como passport.authenticate('jwt', ...)
}
