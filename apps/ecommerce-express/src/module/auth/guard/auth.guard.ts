// auth.guard.ts => PATRÓN "Decorator/Middleware": envuelve un route handler agregándole
// una verificación PREVIA (¿está autenticado? ¿tiene el rol correcto?) sin modificar el handler original.
import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import type { AuthenticatedRequestUser } from "../types/auth.types";

// Extiende el tipo global "Request" de Express para que TypeScript sepa que "req.user" existe
// y tiene la forma "AuthenticatedRequestUser" (tipado seguro end-to-end, sin "any" en los controllers)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- necesario para "module augmentation" de Express
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- "declaration merging": la interfaz vacía fusiona AuthenticatedRequestUser en Express.User
    interface User extends AuthenticatedRequestUser {}
  }
}

// jwtAuthGuard => middleware que se antepone a cualquier ruta protegida: "router.get('/x', jwtAuthGuard, handler)"
export function jwtAuthGuard(req: Request, res: Response, next: NextFunction): void {
  // "passport.authenticate('jwt', { session: false }, callback)" => ejecuta la jwt.strategy.ts registrada;
  // "session: false" => NUNCA usamos sesiones de cookie server-side (JWT es stateless por diseño)
  passport.authenticate(
    "jwt",
    { session: false },
    (error: Error | null, user: AuthenticatedRequestUser | false) => {
      if (error) {
        // "next(error)" => delega el error al middleware global de manejo de errores (evita try/catch repetido)
        return next(error);
      }

      if (!user) {
        // 401 Unauthorized: el token no vino, es inválido, expiró o la sesión fue revocada
        res.status(401).json({ success: false, message: "No autenticado", code: "UNAUTHORIZED" });
        return;
      }

      // Adjuntamos el usuario autenticado a la request para que el Controller lo use directamente
      req.user = user;
      next(); // Continúa hacia el siguiente middleware o el route handler final
    }
  )(req, res, next); // Passport.authenticate devuelve una función; se invoca inmediatamente con (req, res, next)
}

// requireRoles => PATRÓN "Decorator" configurable: Factory que devuelve un middleware específico por rol
// Ej: router.delete('/x', jwtAuthGuard, requireRoles('ADMIN'), handler)
export function requireRoles(...allowedRoles: string[]) {
  // Devuelve la función middleware real; "allowedRoles" queda capturado en el closure (clausura de JS)
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user; // Ya fue seteado por jwtAuthGuard, que SIEMPRE debe ejecutarse antes

    // "!user" => defensa extra por si este middleware se usa sin jwtAuthGuard antes (error de configuración)
    if (!user) {
      res.status(401).json({ success: false, message: "No autenticado", code: "UNAUTHORIZED" });
      return;
    }

    // "some()" => true si AL MENOS UNO de los roles del usuario está en la lista permitida
    const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      // 403 Forbidden: el usuario SÍ está autenticado, pero no tiene el rol requerido
      res
        .status(403)
        .json({ success: false, message: "Rol insuficiente para esta acción", code: "FORBIDDEN" });
      return;
    }

    next();
  };
}

// selfOrAdminGuard => regla común en módulos de Usuario: permite la acción si el usuario
// autenticado es el DUEÑO del recurso (params.id === user.id) O si tiene rol ADMIN
export function selfOrAdminGuard(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  const targetId = req.params["id"]; // Acceso con bracket notation: requerido por "noUncheckedIndexedAccess"

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
