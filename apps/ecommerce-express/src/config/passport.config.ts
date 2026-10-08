import passport from "passport";
import { jwtStrategy } from "../module/auth/strategy/jwt.strategy";

export function configurePassport(): void {
  passport.use(jwtStrategy);
}
