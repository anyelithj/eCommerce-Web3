// auth.api.ts => capa de acceso a datos del frontend para Auth: encapsula TODOS los endpoints /auth del backend.
// Los componentes NUNCA llaman fetch() directamente; siempre pasan por estas funciones (DRY + testabilidad).
// Usa el cliente HTTP compartido (shared/lib/api-client): mismo manejo de errores en toda la app.
import { apiRequest } from "@/shared/lib/api-client";
import type { SignedWalletChallenge } from "@/shared/lib/wallet";
import type { LoginFormValues, RegisterFormValues } from "../lib/auth.validator";

// Forma de la respuesta del backend tras login/2FA/refresh (TokenDto de Express)
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    roles: string[];
  };
}

// Desafío 2FA: el login no entrega tokens hasta validar el código enviado al email
export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeId: string;
  expiresIn: number;
}

// Unión discriminada por "requiresTwoFactor"
export type LoginResult = AuthTokenResponse | TwoFactorChallenge;

// Type guard: estrecha la unión (TS sabe qué campos existen en cada rama)
export const isTwoFactorChallenge = (result: LoginResult): result is TwoFactorChallenge =>
  "requiresTwoFactor" in result;

// loginRequest => POST /auth/login
export async function loginRequest(credentials: LoginFormValues): Promise<LoginResult> {
  return (await apiRequest<LoginResult>("/auth/login", { method: "POST", body: credentials })).data;
}

// verifyTwoFactorRequest => POST /auth/2fa/verify
export async function verifyTwoFactorRequest(
  challengeId: string,
  code: string
): Promise<AuthTokenResponse> {
  return (
    await apiRequest<AuthTokenResponse>("/auth/2fa/verify", {
      method: "POST",
      body: { challengeId, code },
    })
  ).data;
}

// web3LoginRequest => POST /auth/web3 (firma SIWE de una wallet ya vinculada a la cuenta)
export async function web3LoginRequest(
  challenge: SignedWalletChallenge
): Promise<AuthTokenResponse> {
  return (await apiRequest<AuthTokenResponse>("/auth/web3", { method: "POST", body: challenge }))
    .data;
}

// registerRequest => POST /auth/register — se descarta "confirmPassword" antes de enviar (el backend no lo espera)
// "locale" => idioma de la interfaz al registrarse: el correo de verificación y los avisos llegan en ese idioma
export async function registerRequest(
  values: RegisterFormValues,
  locale: string
): Promise<{ userId: string }> {
  // Destructuring con "rest spread": extrae confirmPassword para EXCLUIRLO, y agrupa el resto en "payload"
  const { confirmPassword: _confirmPassword, ...payload } = values;
  return (
    await apiRequest<{ userId: string }>("/auth/register", {
      method: "POST",
      body: { ...payload, locale },
    })
  ).data;
}

// requestPasswordResetRequest => POST /auth/forgot-password
export async function requestPasswordResetRequest(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", { method: "POST", body: { email } });
}

// resetPasswordRequest => POST /auth/reset-password (token del email + nueva contraseña)
export async function resetPasswordRequest(token: string, newPassword: string): Promise<void> {
  await apiRequest("/auth/reset-password", { method: "POST", body: { token, newPassword } });
}

// verifyEmailRequest => PATCH /auth/user/:id/verify
export async function verifyEmailRequest(userId: string, token: string): Promise<void> {
  await apiRequest(`/auth/user/${userId}/verify`, { method: "PATCH", body: { token } });
}

// resendVerificationRequest => POST /auth/verification/resend
export async function resendVerificationRequest(email: string): Promise<void> {
  await apiRequest("/auth/verification/resend", { method: "POST", body: { email } });
}

// (El interruptor de 2FA vive en features/settings: es una operación de configuración de la cuenta)
