import type { RegisterInput, LoginInput, Web3LoginInput } from "../schema/auth.schema";

export interface RequestContextDto {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface RegisterDto extends RegisterInput, RequestContextDto {}

export interface LoginDto extends LoginInput, RequestContextDto {}

export interface Web3LoginDto extends Web3LoginInput, RequestContextDto {}

export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface TokenDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  user: AuthUserDto;
}

export interface TwoFactorChallengeDto {
  requiresTwoFactor: true;
  challengeId: string;
  expiresIn: number;
}

export type LoginResultDto = TokenDto | TwoFactorChallengeDto;

export interface AuthErrorResponseDto {
  success: false;
  message: string;
  code: string;
}
