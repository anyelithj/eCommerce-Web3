import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import type { JwtPayload } from "../types/auth.types";
import { jwtConfig } from "../../../config/jwt.config";

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plainTextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash);
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
    issuer: jwtConfig.issuer,
  });
}

export function signRefreshToken(payload: Pick<JwtPayload, "sub" | "sessionId">): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    jwtid: crypto.randomUUID(),
  });
}

export function signServiceToken(): string {
  const payload: JwtPayload = {
    sub: "ecommerce-express",
    email: "",
    roles: ["SERVICE"],
    sessionId: "service",
  };
  return jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: 60, issuer: jwtConfig.issuer });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.accessSecret, { issuer: jwtConfig.issuer }) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, "sub" | "sessionId"> {
  return jwt.verify(token, jwtConfig.refreshSecret, { issuer: jwtConfig.issuer }) as Pick<
    JwtPayload,
    "sub" | "sessionId"
  >;
}

export function generateOtp(): string {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
