// jwt.middleware.ts => autenticación OPCIONAL: si llega un Bearer token válido adjunta req.user; si no, continúa anónimo.
// Uso: endpoints públicos que personalizan la respuesta para usuarios logueados (búsqueda con historial,
// catálogo que muestra borradores al vendedor dueño). Para rutas protegidas se usa jwtAuthGuard (auth.guard.ts).
import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import type { AuthenticatedRequestUser } from "../../module/auth/types/auth.types";

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Sin header Authorization no se invoca Passport (ahorra la consulta de sesión)
  if (!req.headers.authorization) return next();

  passport.authenticate(
    "jwt",
    { session: false },
    (error: Error | null, user: AuthenticatedRequestUser | false) => {
      // Un token inválido en un endpoint público NO bloquea: simplemente se trata como anónimo
      if (!error && user) req.user = user;
      next();
    }
  )(req, res, next);
}
