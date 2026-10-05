import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import type { AuthenticatedRequestUser } from "../types/auth.types";
import { ForbiddenException, UnauthorizedException } from "../../../shared/filter/http-exception.filter";

export function jwtAuthGuard(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate("jwt", { session: false }, (error: Error | null, user: AuthenticatedRequestUser | false) => {
    if (error) return next(error);
    if (!user) return next(new UnauthorizedException());
    req.user = user;
    next();
  })(req, res, next);
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedException());
    if (!roles.some((role) => req.user?.roles.includes(role))) return next(new ForbiddenException());
    next();
  };
}
