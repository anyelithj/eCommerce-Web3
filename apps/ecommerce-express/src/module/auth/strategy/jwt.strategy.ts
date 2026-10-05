import jwt from "jsonwebtoken";
import { ExtractJwt, Strategy } from "passport-jwt";
import { prisma } from "../../../config/database.config";
import { jwtConfig } from "../../../config/jwt.config";
import { isLocale, DEFAULT_LOCALE } from "../../../shared/util/i18n.util";
import type { AuthenticatedRequestUser } from "../types/auth.types";

interface AccessTokenPayload {
  sub: string;
}

async function loadUser(userId: string): Promise<AuthenticatedRequestUser | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: { id: true, email: true, locale: true, roles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    roles: user.roles.map((row) => row.role.name),
    locale: isLocale(user.locale) ? user.locale : DEFAULT_LOCALE,
  };
}

export const jwtStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtConfig.accessSecret,
    issuer: jwtConfig.issuer,
  },
  (payload: AccessTokenPayload, done: (error: unknown, user?: AuthenticatedRequestUser | false) => void) => {
    loadUser(payload.sub)
      .then((user) => done(null, user ?? false))
      .catch((error: unknown) => done(error));
  }
);

export async function resolveAccessToken(token: string): Promise<AuthenticatedRequestUser | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret, { issuer: jwtConfig.issuer }) as AccessTokenPayload;
    return await loadUser(payload.sub);
  } catch {
    return null;
  }
}
