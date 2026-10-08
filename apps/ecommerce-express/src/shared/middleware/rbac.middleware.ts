// rbac.middleware.ts => autorización GRANULAR por permiso "ACCIÓN:recurso" (sprint 1.2 "Permisos granulares").
// Complementa requireRoles (auth.guard): en vez de "¿eres ADMIN?" pregunta "¿algún rol tuyo tiene UPDATE:product?".
// Así se crean roles nuevos desde la API (POST /role) sin tocar código (OCP).
// Patrón: Decorator configurable (Factory que devuelve un middleware) + Cache-Aside de permisos por conjunto de roles.
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { RedisKeys } from "../../config/redis.config";
import { cached, invalidatePattern } from "../interceptor/cache.interceptor";
import type { Action, Resource } from "../constants/roles.constants";
import { ForbiddenException, UnauthorizedException } from "../filter/http-exception.filter";

const PERMISSIONS_TTL_SECONDS = 300; // 5 minutos: los cambios de permisos se propagan rápido sin consultar la DB en cada request

// loadPermissions => conjunto de "ACCIÓN:recurso" concedidos a una combinación de roles (una query con JOIN)
export async function loadPermissions(roles: readonly string[]): Promise<Set<string>> {
  const list = await cached(RedisKeys.permissions(roles), PERMISSIONS_TTL_SECONDS, async () => {
    const rows = await prisma.permission.findMany({
      // "some" => permisos que pertenezcan a AL MENOS un rol cuyo nombre esté en la lista
      where: { roles: { some: { role: { name: { in: [...roles] } } } } },
      select: { action: true, resource: true },
    });
    return rows.map((row) => `${row.action}:${row.resource}`);
  });
  return new Set(list); // "Set" => búsqueda O(1) con .has()
}

// invalidatePermissionsCache => se llama al modificar roles/permisos (role.service / permission.service)
export async function invalidatePermissionsCache(): Promise<void> {
  await invalidatePattern("rbac:perms:*");
}

// requirePermission => uso: router.patch("/:id", jwtAuthGuard, requirePermission("UPDATE", "product"), handler)
export function requirePermission(action: Action, resource: Resource) {
  // El closure captura action/resource; el middleware devuelto es asíncrono
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(new UnauthorizedException());

    // ".then/.catch" => se encadena la promesa sin convertir el middleware en async (Express 4 no captura rechazos)
    loadPermissions(user.roles)
      .then((permissions) => {
        if (permissions.has(`${action}:${resource}`)) return next();
        next(new ForbiddenException(`Requiere el permiso ${action}:${resource}`));
      })
      .catch(next);
  };
}
