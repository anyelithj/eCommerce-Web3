import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import { apiGet, apiRequest } from "./api-client";

interface BackendTokens {
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

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshFailed";
    user: { id: string; email: string; name: string; roles: string[]; avatarUrl: string | null };
  }
  interface User {
    backend?: BackendTokens;
  }
}

interface AppToken {
  backend?: Omit<BackendTokens, "expiresIn"> & { expiresAt: number };
  error?: "RefreshFailed";
}

const toStored = (tokens: BackendTokens) => ({
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  sessionId: tokens.sessionId,
  user: tokens.user,
  expiresAt: Date.now() + tokens.expiresIn * 1000,
});

const REFRESH_MARGIN_MS = 60_000;

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: "credentials",
      name: "Backend session",
      credentials: { payload: { type: "text" } },
      authorize: async (credentials) => {
        if (typeof credentials?.payload !== "string") return null;
        try {
          const tokens = JSON.parse(credentials.payload) as BackendTokens;
          await apiGet(`/user/${tokens.user.id}`, { token: tokens.accessToken, cache: "no-store" });
          return {
            id: tokens.user.id,
            email: tokens.user.email,
            name: `${tokens.user.firstName} ${tokens.user.lastName}`,
            backend: tokens,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    jwt: async ({ token: rawToken, user, account }) => {
      const token = rawToken as typeof rawToken & AppToken;
      if (user?.backend) return { ...token, backend: toStored(user.backend), error: undefined };

      if (account && account.provider !== "credentials" && account.access_token) {
        const { data } = await apiRequest<BackendTokens>("/auth/oauth", {
          method: "POST",
          body: { provider: account.provider.toUpperCase(), accessToken: account.access_token },
        });
        return { ...token, backend: toStored(data), error: undefined };
      }

      if (!token.backend || Date.now() < token.backend.expiresAt - REFRESH_MARGIN_MS) return token;

      try {
        const { data } = await apiRequest<BackendTokens>(
          `/auth/sessions/${token.backend.sessionId}`,
          {
            method: "PATCH",
            body: { refreshToken: token.backend.refreshToken },
          }
        );
        return { ...token, backend: toStored(data), error: undefined };
      } catch {
        return { ...token, error: "RefreshFailed" as const };
      }
    },
    session: async ({ session, token: rawToken }) => {
      const token = rawToken as typeof rawToken & AppToken;
      const backendUser = token.backend?.user;
      if (backendUser) {
        session.user = {
          ...session.user,
          id: backendUser.id,
          email: backendUser.email,
          name: `${backendUser.firstName} ${backendUser.lastName}`,
          roles: backendUser.roles,
          avatarUrl: backendUser.avatarUrl,
        };
      }
      if (token.backend?.accessToken) session.accessToken = token.backend.accessToken;
      if (token.error) session.error = token.error;
      return session;
    },
  },
  events: {
    signOut: async (message) => {
      const backend = "token" in message ? (message.token as AppToken | null)?.backend : undefined;
      if (!backend) return;
      await apiRequest(`/auth/sessions/${backend.sessionId}`, {
        method: "DELETE",
        token: backend.accessToken,
      }).catch(() => undefined);
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
