import type { Request } from "express";
import type { AuthenticatedRequestUser } from "../../module/auth/types/auth.types";
import { UnauthorizedException } from "../filter/http-exception.filter";
import { Roles } from "../constants/roles.constants";

export function currentUser(req: Request): AuthenticatedRequestUser {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
}

export function isAdmin(user: Pick<AuthenticatedRequestUser, "roles">): boolean {
  return user.roles.includes(Roles.ADMIN);
}

export function isStaff(user: Pick<AuthenticatedRequestUser, "roles">): boolean {
  return user.roles.includes(Roles.ADMIN) || user.roles.includes(Roles.VENDOR);
}
