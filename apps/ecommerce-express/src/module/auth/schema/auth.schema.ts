// auth.schema.ts => Zod define REGLAS DE VALIDACIÓN en runtime (no solo tipos en compile-time).
// Patrón: "Schema as Single Source of Truth" — el tipo TypeScript se INFIERE del schema (z.infer),
// así el tipo y la validación nunca se desincronizan (principio DRY aplicado a validación + tipado).
import { z } from "zod";
import { LOCALES } from "../../../shared/util/i18n.util"; // z => objeto raíz de Zod, expone los "builders" de esquemas (z.object, z.string, etc.)

// PasswordRule => regla de complejidad reutilizada por registro, reset y cambio de contraseña (DRY)
export const PasswordRule = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .max(128, { message: "La contraseña no puede superar 128 caracteres" }) // Límite: bcrypt solo usa 72 bytes y evita DoS
  .regex(/[A-Z]/, { message: "Debe incluir al menos una mayúscula" })
  .regex(/[0-9]/, { message: "Debe incluir al menos un número" });

// Email normalizado: ".trim().toLowerCase()" => "Ana@Mail.com " y "ana@mail.com" son la MISMA cuenta
const EmailRule = z.string().trim().toLowerCase().email({ message: "Email inválido" });

// RegisterSchema => valida el body de POST /api/v1/auth/register
export const RegisterSchema = z.object({
  email: EmailRule,
  password: PasswordRule,
  firstName: z.string().trim().min(1, { message: "El nombre es obligatorio" }).max(80),
  lastName: z.string().trim().min(1, { message: "El apellido es obligatorio" }).max(80),
  // .optional() => el campo puede omitirse en el JSON de entrada sin que falle la validación
  phone: z.string().trim().optional(),
  // Idioma de la interfaz al registrarse: emails y notificaciones se envían en ese idioma
  locale: z.enum(LOCALES).optional(),
});

// LoginSchema => valida el body de POST /api/v1/auth/login
export const LoginSchema = z.object({
  email: EmailRule,
  // En login NO se repiten las reglas de complejidad: si el hash no coincide, el service lo rechaza igual
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
});

// OAuthSchema => valida el body de POST /api/v1/auth/oauth ("provider en body", matriz)
// next-auth completa el flujo OAuth2 en el frontend y envía el ACCESS TOKEN del proveedor;
// el backend lo verifica contra el endpoint "userinfo" del proveedor antes de confiar en la identidad.
export const OAuthSchema = z.object({
  // z.enum([...]) => lista cerrada de valores permitidos (tipado seguro, sin strings libres)
  provider: z.enum(["GOOGLE", "GITHUB", "DISCORD"], {
    // "errorMap" personaliza el mensaje cuando el valor no está en el enum
    errorMap: () => ({ message: "Proveedor OAuth no soportado" }),
  }),
  accessToken: z.string().min(1, { message: "El access token del proveedor es obligatorio" }),
});

// ForgotPasswordSchema => valida el body de POST /api/v1/auth/forgot-password
export const ForgotPasswordSchema = z.object({ email: EmailRule });

// ResetPasswordSchema => valida el body al confirmar el cambio de contraseña con el token recibido
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token de recuperación requerido" }),
  newPassword: PasswordRule,
});

// VerifyEmailSchema => valida el token recibido por email al confirmar la cuenta
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Token de verificación requerido" }),
});

// ResendVerificationSchema => reenviar el enlace de verificación (el primero pudo expirar o perderse)
export const ResendVerificationSchema = z.object({ email: EmailRule });

// RefreshTokenSchema => valida el body al pedir un nuevo accessToken
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: "El refresh token es obligatorio" }),
});

// TwoFactorVerifySchema => segundo paso del login cuando la cuenta tiene 2FA
export const TwoFactorVerifySchema = z.object({
  challengeId: z.string().uuid({ message: "challengeId inválido" }),
  // ".regex(/^\d{6}$/)" => exactamente 6 dígitos
  code: z.string().regex(/^\d{6}$/, { message: "El código debe tener 6 dígitos" }),
});

// TwoFactorToggleSchema => activar/desactivar 2FA exige reautenticarse con la contraseña
export const TwoFactorToggleSchema = z.object({
  enabled: z.boolean(),
  password: z.string().min(1, { message: "Confirma tu contraseña" }),
});

// Dirección Ethereum: "0x" + 40 caracteres hexadecimales
const WalletRule = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Dirección de wallet inválida" });

// Web3NonceSchema => paso 1 de SIWE: pedir un nonce de un solo uso
export const Web3NonceSchema = z.object({ walletAddress: WalletRule });

// Web3LoginSchema => valida el body de login mediante wallet (SIWE)
export const Web3LoginSchema = z.object({
  walletAddress: WalletRule,
  signature: z.string().min(1),
  message: z.string().min(1),
});

// "z.infer<typeof X>" => extrae automáticamente el TYPE de TypeScript desde el schema Zod (DRY)
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type OAuthInput = z.infer<typeof OAuthSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type TwoFactorVerifyInput = z.infer<typeof TwoFactorVerifySchema>;
export type TwoFactorToggleInput = z.infer<typeof TwoFactorToggleSchema>;
export type Web3LoginInput = z.infer<typeof Web3LoginSchema>;
