// token.util.ts => funciones PURAS (sin estado, sin efectos secundarios más allá de su retorno).
// Paradigma: Programación Funcional dentro de un módulo POO más amplio — SRP: solo maneja tokens/hash.
import jwt from "jsonwebtoken"; // Librería estándar para firmar/verificar JWT (RFC 7519)
import bcrypt from "bcrypt"; // Librería estándar para hash de contraseñas (algoritmo bcrypt, con salt)
import crypto from "node:crypto"; // Módulo nativo de Node para generar bytes aleatorios criptográficamente seguros
import type { JwtPayload } from "../types/auth.types";
import { jwtConfig } from "../../../config/jwt.config"; // Secretos y expiraciones centralizados (DRY)

const BCRYPT_SALT_ROUNDS = 12; // Rondas de hashing: más alto = más lento pero más seguro contra fuerza bruta

// hashPassword => convierte una contraseña en texto plano en un hash seguro (nunca se guarda el texto plano)
export async function hashPassword(plainTextPassword: string): Promise<string> {
  // bcrypt.hash corre en el thread pool de libuv: no bloquea el event loop de Node
  return bcrypt.hash(plainTextPassword, BCRYPT_SALT_ROUNDS);
}

// comparePassword => compara un texto plano contra un hash ya almacenado; bcrypt reconstruye el salt internamente
export async function comparePassword(plainTextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash);
}

// signAccessToken => firma un JWT de vida corta (usado en cada request autenticado)
export function signAccessToken(payload: JwtPayload): string {
  // jwt.sign(payload, secret, options) => devuelve el string "header.payload.signature"
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
    issuer: jwtConfig.issuer, // "iss": el strategy rechaza tokens emitidos por otro sistema con el mismo secreto
  });
}

// signRefreshToken => firma un JWT de vida larga (usado solo para pedir nuevos accessTokens)
// "jti" (JWT ID) aleatorio => cada refresh token es único aunque se emita dos veces en el mismo segundo
export function signRefreshToken(payload: Pick<JwtPayload, "sub" | "sessionId">): string {
  // "Pick<JwtPayload, "sub" | "sessionId">" => tipo derivado que solo incluye 2 propiedades del original
  // (el refresh token no necesita llevar roles/email, reduce superficie de datos sensibles expuestos)
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    jwtid: crypto.randomUUID(),
  });
}

// signServiceToken => JWT de servicio (Express -> motor IA FastAPI): rol SERVICE, válido 60 s, sin usuario.
// No abre Express: jwt.strategy exige una sesión real en la BD y "service" no existe (Passport lo rechaza).
export function signServiceToken(): string {
  const payload: JwtPayload = {
    sub: "ecommerce-express",
    email: "",
    roles: ["SERVICE"],
    sessionId: "service",
  };
  return jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: 60, issuer: jwtConfig.issuer });
}

// verifyAccessToken => valida la firma y expiración de un access token; lanza si es inválido
export function verifyAccessToken(token: string): JwtPayload {
  // jwt.verify lanza automáticamente (JsonWebTokenError/TokenExpiredError) si el token es inválido/expiró
  return jwt.verify(token, jwtConfig.accessSecret, { issuer: jwtConfig.issuer }) as JwtPayload;
}

// verifyRefreshToken => valida la firma y expiración de un refresh token
export function verifyRefreshToken(token: string): Pick<JwtPayload, "sub" | "sessionId"> {
  return jwt.verify(token, jwtConfig.refreshSecret, { issuer: jwtConfig.issuer }) as Pick<
    JwtPayload,
    "sub" | "sessionId"
  >;
}

// generateOtp => genera un código numérico de 6 dígitos para 2FA/verificación (no usa Math.random,
// que NO es criptográficamente seguro)
export function generateOtp(): string {
  // crypto.randomInt(min, maxExclusive) => entero aleatorio criptográficamente seguro en el rango [100000, 999999]
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString(); // Convierte el número a string para enviarlo por email tal cual
}

// generateSecureToken => genera un token opaco (para verificación de email / recuperación de password)
export function generateSecureToken(): string {
  // crypto.randomBytes(32) => 32 bytes aleatorios (256 bits de entropía); "base64url" => seguro dentro de una URL
  return crypto.randomBytes(32).toString("base64url");
}
