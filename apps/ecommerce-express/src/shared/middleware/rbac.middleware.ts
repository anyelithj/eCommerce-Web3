import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { RedisKeys } from "../../config/redis.config";
import { cached, invalidatePattern } from "../interceptor/cache.interceptor";
import type { Action, Resource } from "../constants/roles.constants";
import { ForbiddenException, UnauthorizedException } from "../filter/http-exception.filter";

const PERMISSIONS_TTL_SECONDS = 300;

export async function loadPermissions(roles: readonly string[]): Promise<Set<string>> {
  const list = await cached(RedisKeys.permissions(roles), PERMISSIONS_TTL_SECONDS, async () => {
    const rows = await prisma.permission.findMany({
      where: { roles: { some: { role: { name: { in: [...roles] } } } } },
      select: { action: true, resource: true },
    });
    return rows.map((row) => `${row.action}:${row.resource}`);
  });
  return new Set(list);
}

export async function invalidatePermissionsCache(): Promise<void> {
  await invalidatePattern("rbac:perms:*");
}

export function requirePermission(action: Action, resource: Resource) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(new UnauthorizedException());

    loadPermissions(user.roles)
      .then((permissions) => {
        if (permissions.has(`${action}:${resource}`)) return next();
        next(new ForbiddenException(`Requiere el permiso ${action}:${resource}`));
      })
      .catch(next);
  };
}
