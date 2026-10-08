import type { Locale } from "../../../shared/util/i18n.util";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export type OAuthProviderName = "GOOGLE" | "GITHUB" | "DISCORD";

export interface OAuthProfile {
  provider: OAuthProviderName;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string | undefined;
}

export interface Web3WalletPayload {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  roles: string[];
  sessionId: string;
}

export type AuthEvents = {
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
