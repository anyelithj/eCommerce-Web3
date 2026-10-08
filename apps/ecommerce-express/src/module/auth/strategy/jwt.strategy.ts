import {
  Strategy as JwtPassportStrategy,
  ExtractJwt,
  type StrategyOptionsWithoutRequest,
} from "passport-jwt";
import type { AuthenticatedRequestUser, JwtPayload } from "../types/auth.types";
import { authRepository } from "../repository/auth.repository";
import { jwtConfig } from "../../../config/jwt.config";
import { verifyAccessToken } from "../util/token.util";

const jwtOptions: StrategyOptionsWithoutRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtConfig.accessSecret,
  issuer: jwtConfig.issuer,
};

export const jwtStrategy = new JwtPassportStrategy(
  jwtOptions,
  async (
    payload: JwtPayload,
    done: (error: unknown, user?: AuthenticatedRequestUser | false) => void
  ) => {
    try {
      const session = await authRepository.findSessionById(payload.sessionId);

      if (!session || !session.isValid() || !session.belongsTo(payload.sub)) {
        return done(null, false);
      }

      const authenticatedUser: AuthenticatedRequestUser = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        sessionId: payload.sessionId,
      };

      return done(null, authenticatedUser);
    } catch (error) {
      return done(error, false);
    }
  }
);

export async function resolveAccessToken(token: string): Promise<AuthenticatedRequestUser | null> {
  try {
    const payload = verifyAccessToken(token);
    const session = await authRepository.findSessionById(payload.sessionId);
    if (!session?.isValid() || !session.belongsTo(payload.sub)) return null;
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}
