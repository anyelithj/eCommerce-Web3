import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import type { AuthenticatedRequestUser } from "../types/auth.types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- necesario para "module augmentation" de Express
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- "declaration merging": la interfaz vacía fusiona AuthenticatedRequestUser en Express.User
    interface User extends AuthenticatedRequestUser {}
  }
}

export function jwtAuthGuard(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    "jwt",
    { session: false },
    (error: Error | null, user: AuthenticatedRequestUser | false) => {
      if (error) {
        return next(error);
      }

      if (!user) {
        res.status(401).json({ success: false, message: "No autenticado", code: "UNAUTHORIZED" });
        return;
      }

      req.user = user;
      next();
    }
  )(req, res, next);
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: "No autenticado", code: "UNAUTHORIZED" });
      return;
    }

    const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      res
        .status(403)
        .json({ success: false, message: "Rol insuficiente para esta acción", code: "FORBIDDEN" });
      return;
    }

    next();
  };
}

export function selfOrAdminGuard(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  const targetId = req.params["id"];

  if (!user) {
    res.status(401).json({ success: false, message: "No autenticado", code: "UNAUTHORIZED" });
    return;
  }

  const isOwner = user.id === targetId;
  const isAdmin = user.roles.includes("ADMIN");

  if (!isOwner && !isAdmin) {
    res
      .status(403)
      .json({ success: false, message: "No puedes modificar este recurso", code: "FORBIDDEN" });
    return;
  }

  next();
}
