import { apiRequest } from "@/shared/lib/api-client";
import type { SignedWalletChallenge } from "@/shared/lib/wallet";
import type { LoginFormValues, RegisterFormValues } from "../lib/auth.validator";

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

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeId: string;
  expiresIn: number;
}

export type LoginResult = AuthTokenResponse | TwoFactorChallenge;

export const isTwoFactorChallenge = (result: LoginResult): result is TwoFactorChallenge =>
  "requiresTwoFactor" in result;

export async function loginRequest(credentials: LoginFormValues): Promise<LoginResult> {
  return (await apiRequest<LoginResult>("/auth/login", { method: "POST", body: credentials })).data;
}

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

export async function web3LoginRequest(
  challenge: SignedWalletChallenge
): Promise<AuthTokenResponse> {
  return (await apiRequest<AuthTokenResponse>("/auth/web3", { method: "POST", body: challenge }))
    .data;
}

export async function registerRequest(
  values: RegisterFormValues,
  locale: string
): Promise<{ userId: string }> {
  const { confirmPassword: _confirmPassword, ...payload } = values;
  return (
    await apiRequest<{ userId: string }>("/auth/register", {
      method: "POST",
      body: { ...payload, locale },
    })
  ).data;
}

export async function requestPasswordResetRequest(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", { method: "POST", body: { email } });
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<void> {
  await apiRequest("/auth/reset-password", { method: "POST", body: { token, newPassword } });
}

export async function verifyEmailRequest(userId: string, token: string): Promise<void> {
  await apiRequest(`/auth/user/${userId}/verify`, { method: "PATCH", body: { token } });
}

export async function resendVerificationRequest(email: string): Promise<void> {
  await apiRequest("/auth/verification/resend", { method: "POST", body: { email } });
}
