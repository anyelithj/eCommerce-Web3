// auth.types.ts => contratos de TIPOS puros (sin lógica), reutilizados por service/strategy/guard.
// Paradigma: tipado estático estructural de TypeScript — "interface" describe la FORMA del dato,
// no una clase con comportamiento (eso vive en Model/Service).
import type { Locale } from "../../../shared/util/i18n.util";

// JwtPayload => estructura que se firma dentro del JWT (header.payload.signature)
export interface JwtPayload {
  sub: string; // "sub" (subject) => estándar JWT/OIDC para el ID del usuario dueño del token
  email: string; // Email embebido para evitar una query extra en cada request autenticado
  roles: string[]; // Array de nombres de rol (ej. ["ADMIN"]) => usado por el Guard para RBAC
  sessionId: string; // ID de la Session en DB => permite revocar el token específico (logout real)
  iat?: number; // "issued at" (emitido en) — lo agrega jsonwebtoken automáticamente
  exp?: number; // "expiration" (expira en) — lo agrega jsonwebtoken automáticamente
}

// OAuthProviderName => unión de literales: los únicos proveedores OAuth soportados en todo el proyecto
export type OAuthProviderName = "GOOGLE" | "GITHUB" | "DISCORD";

// OAuthProfile => forma normalizada del perfil que devuelve CUALQUIER proveedor OAuth2
// (Google/GitHub/Discord tienen campos distintos; este tipo es el "adaptador" común)
export interface OAuthProfile {
  provider: OAuthProviderName; // Unión de literales de string => tipado seguro, sin "any"
  providerAccountId: string; // ID único que el proveedor asigna a la cuenta externa
  email: string;
  emailVerified: boolean; // Solo se vincula por email a una cuenta existente si el proveedor lo verificó
  firstName: string;
  lastName: string;
  avatarUrl?: string | undefined; // Opcional: no todos los proveedores lo entregan
}

// Web3WalletPayload => datos necesarios para verificar la firma criptográfica de una wallet
// (patrón "Sign-In with Ethereum" / SIWE)
export interface Web3WalletPayload {
  walletAddress: string; // Dirección pública (0x...)
  signature: string; // Firma generada por la wallet del usuario (MetaMask, etc.)
  message: string; // Mensaje original que el usuario firmó; DEBE contener el nonce emitido (evita replay attacks)
}

// TokenPair => par de tokens que se devuelve tras login/refresh exitoso
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Segundos hasta que expira el accessToken (útil para el frontend programar el refresh)
}

// AuthenticatedRequestUser => lo que el Guard inyecta en "req.user" tras validar el JWT
export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  roles: string[];
  sessionId: string;
}

// AuthEvents => catálogo tipado de eventos de dominio que publica el módulo Auth/RBAC (patrón Observer).
// "type" (no interface) para cumplir la restricción Record<string, unknown> del TypedEventBus.
export type AuthEvents = {
  // "locale" => idioma preferido del usuario: el correo se redacta y enlaza en ese idioma
  "user.registered": {
    userId: string;
    email: string;
    firstName: string;
    locale: Locale;
    verificationToken: string;
  };
  "user.password-reset-requested": {
    userId: string;
    email: string;
    firstName: string;
    locale: Locale;
    resetToken: string;
  };
  "user.password-changed": { userId: string; email: string; firstName: string };
  "user.two-factor-code": {
    userId: string;
    email: string;
    firstName: string;
    locale: Locale;
    code: string;
  };
  "role.created": { roleId: string; roleName: string };
  "role.updated": { roleId: string; changes: Record<string, unknown> };
  "role.deleted": { roleId: string };
};
