import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import type { AuthenticatedRequestUser } from "../../module/auth/types/auth.types";

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) return next();

  passport.authenticate(
    "jwt",
    { session: false },
    (error: Error | null, user: AuthenticatedRequestUser | false) => {
      if (!error && user) req.user = user;
      next();
    }
  )(req, res, next);
}
