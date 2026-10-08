// auth.dto.ts => DTO (Data Transfer Object): describe QUÉ datos viajan entre capas (Controller<->Service<->Repository)
// Diferencia con Schema: el Schema VALIDA en runtime; el DTO es el TIPO resultante que ya pasó la validación
// más los datos que se agregan/combinan internamente (ej. IP, userAgent) antes de llegar al Service.
import type { RegisterInput, LoginInput, Web3LoginInput } from "../schema/auth.schema";

// RequestContextDto => metadata de la petición HTTP (no viene del body; la agrega el Controller)
// "string | undefined" explícito: compatible con "exactOptionalPropertyTypes" del tsconfig strict
export interface RequestContextDto {
  userAgent?: string | undefined; // Se usa para mostrarle al usuario "sesiones activas por dispositivo"
  ipAddress?: string | undefined; // Se captura desde req.ip en el Controller, no lo envía el cliente
}

// RegisterDto => extiende el input validado + metadata de contexto de la request
export interface RegisterDto extends RegisterInput, RequestContextDto {}

// LoginDto => datos ya validados + contexto de la petición HTTP
export interface LoginDto extends LoginInput, RequestContextDto {}

// Web3LoginDto => input validado + contexto
export interface Web3LoginDto extends Web3LoginInput, RequestContextDto {}

// AuthUserDto => datos mínimos del usuario que se devuelven junto a los tokens (evita un round-trip extra)
export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
}

// TokenDto => forma de la respuesta HTTP tras login/refresh exitoso (lo que el Controller envía al cliente)
export interface TokenDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string; // El frontend lo necesita para PATCH/DELETE /auth/sessions/:sessionId
  user: AuthUserDto;
}

// TwoFactorChallengeDto => respuesta del login cuando la cuenta tiene 2FA: todavía NO hay tokens
export interface TwoFactorChallengeDto {
  requiresTwoFactor: true; // Tipo literal: el frontend lo usa como discriminante de la unión LoginResultDto
  challengeId: string;
  expiresIn: number;
}

// LoginResultDto => unión discriminada: o tokens, o desafío 2FA
export type LoginResultDto = TokenDto | TwoFactorChallengeDto;

// AuthErrorResponseDto => forma estándar de error para TODOS los endpoints de auth (Clean Code: consistencia)
export interface AuthErrorResponseDto {
  success: false;
  message: string;
  code: string; // Código interno (ej. "INVALID_CREDENTIALS") => el frontend puede mapearlo a i18n
}
