// auth.decorator.ts => helpers para leer el usuario autenticado de forma tipada en los controllers.
// Equivalente funcional del decorador "@CurrentUser()" de NestJS (Express no tiene decoradores de parámetros).
import type { Request } from "express";
import type { AuthenticatedRequestUser } from "../../module/auth/types/auth.types";
import { UnauthorizedException } from "../filter/http-exception.filter";
import { Roles } from "../constants/roles.constants";

// currentUser => devuelve req.user o lanza 401. Tras el jwtAuthGuard siempre existe; la comprobación
// convierte el tipo "User | undefined" en "User" (narrowing) sin usar el operador "!" inseguro.
export function currentUser(req: Request): AuthenticatedRequestUser {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
}

// isAdmin => regla reutilizada por los services para decidir visibilidad (el admin ve todos los recursos)
export function isAdmin(user: Pick<AuthenticatedRequestUser, "roles">): boolean {
  return user.roles.includes(Roles.ADMIN);
}

// isStaff => ADMIN o VENDOR (operaciones de catálogo y despacho)
export function isStaff(user: Pick<AuthenticatedRequestUser, "roles">): boolean {
  return user.roles.includes(Roles.ADMIN) || user.roles.includes(Roles.VENDOR);
}
