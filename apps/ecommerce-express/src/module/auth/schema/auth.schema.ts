import { z } from "zod";
import { LOCALES } from "../../../shared/util/i18n.util";

export const PasswordRule = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .max(128, { message: "La contraseña no puede superar 128 caracteres" })
  .regex(/[A-Z]/, { message: "Debe incluir al menos una mayúscula" })
  .regex(/[0-9]/, { message: "Debe incluir al menos un número" });

const EmailRule = z.string().trim().toLowerCase().email({ message: "Email inválido" });

export const RegisterSchema = z.object({
  email: EmailRule,
  password: PasswordRule,
  firstName: z.string().trim().min(1, { message: "El nombre es obligatorio" }).max(80),
  lastName: z.string().trim().min(1, { message: "El apellido es obligatorio" }).max(80),
  phone: z.string().trim().optional(),
  locale: z.enum(LOCALES).optional(),
});

export const LoginSchema = z.object({
  email: EmailRule,
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
});

export const OAuthSchema = z.object({
  provider: z.enum(["GOOGLE", "GITHUB", "DISCORD"], {
    errorMap: () => ({ message: "Proveedor OAuth no soportado" }),
  }),
  accessToken: z.string().min(1, { message: "El access token del proveedor es obligatorio" }),
});

export const ForgotPasswordSchema = z.object({ email: EmailRule });

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token de recuperación requerido" }),
  newPassword: PasswordRule,
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Token de verificación requerido" }),
});

export const ResendVerificationSchema = z.object({ email: EmailRule });

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: "El refresh token es obligatorio" }),
});

export const TwoFactorVerifySchema = z.object({
  challengeId: z.string().uuid({ message: "challengeId inválido" }),
  code: z.string().regex(/^\d{6}$/, { message: "El código debe tener 6 dígitos" }),
});

export const TwoFactorToggleSchema = z.object({
  enabled: z.boolean(),
  password: z.string().min(1, { message: "Confirma tu contraseña" }),
});

const WalletRule = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Dirección de wallet inválida" });

export const Web3NonceSchema = z.object({ walletAddress: WalletRule });

export const Web3LoginSchema = z.object({
  walletAddress: WalletRule,
  signature: z.string().min(1),
  message: z.string().min(1),
});

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
