// auth-config.ts => configuración ÚNICA de next-auth v5 + instancia exportada (handlers, auth, signIn, signOut),
// importada por el route handler [...nextauth], el middleware y los Server Components (DRY: una sola fuente de verdad).
//
// Estrategia de sesión: el backend Express es la autoridad de identidad. Toda vía de login termina con los tokens
// del backend guardados en el JWT cifrado de next-auth (cookie httpOnly):
//  - Email/contraseña (+2FA): el formulario obtiene los tokens del backend y los entrega al provider "credentials",
//    que los VALIDA consultando el perfil con ese token (nunca se confía en datos del navegador sin verificarlos).
//  - Google/GitHub/Discord: next-auth completa OAuth2 y el callback "jwt" canjea el access token del proveedor
//    en POST /auth/oauth (el backend lo verifica contra el proveedor).
// El callback "jwt" renueva el access token antes de que venza (Refresh Token Rotation del backend).
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials"; // Provider para tokens emitidos por NUESTRO backend
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import { apiGet, apiRequest } from "./api-client";

// Respuesta de tokens del backend (TokenDto de Express)
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

// "declare module" => amplía los tipos de next-auth (module augmentation de TypeScript): sesión y JWT tipados, sin "any"
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

// Campos propios guardados en el JWT de next-auth. Se tipan con una intersección local porque "next-auth/jwt"
// solo re-exporta "@auth/core/jwt", que con pnpm (resolución estricta) no se puede ampliar desde la app.
interface AppToken {
  backend?: Omit<BackendTokens, "expiresIn"> & { expiresAt: number };
  error?: "RefreshFailed";
}

// toStored => tokens del backend -> forma guardada en el JWT (expiración absoluta en ms)
const toStored = (tokens: BackendTokens) => ({
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  sessionId: tokens.sessionId,
  user: tokens.user,
  expiresAt: Date.now() + tokens.expiresIn * 1000,
});

const REFRESH_MARGIN_MS = 60_000; // Se renueva 1 min antes de vencer (evita peticiones con token expirado)

export const authConfig: NextAuthConfig = {
  // "providers" => array de estrategias de autenticación habilitadas (patrón Strategy de next-auth)
  providers: [
    Credentials({
      id: "credentials",
      name: "Backend session",
      credentials: { payload: { type: "text" } },
      // "authorize" => recibe los tokens (JSON) que el formulario obtuvo del backend y los VERIFICA con el backend
      authorize: async (credentials) => {
        if (typeof credentials?.payload !== "string") return null;
        try {
          const tokens = JSON.parse(credentials.payload) as BackendTokens;
          // Verificación: si el token no es válido/vigente, el backend responde 401 y el login falla
          await apiGet(`/user/${tokens.user.id}`, { token: tokens.accessToken, cache: "no-store" });
          return {
            id: tokens.user.id,
            email: tokens.user.email,
            name: `${tokens.user.firstName} ${tokens.user.lastName}`,
            backend: tokens,
          };
        } catch {
          return null; // "null" => next-auth lo interpreta como credenciales inválidas
        }
      },
    }),
    // Scopes mínimos para obtener el email verificado (el backend lo exige para vincular cuentas)
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
    strategy: "jwt", // Sesión en cookie cifrada (sin tabla de sesiones en Next: el backend ya las gestiona)
    maxAge: 7 * 24 * 60 * 60, // Igual a la vida del refresh token del backend
  },
  callbacks: {
    // "jwt" callback => se ejecuta al iniciar sesión y en cada lectura de la sesión
    jwt: async ({ token: rawToken, user, account }) => {
      // "as typeof rawToken & AppToken" => el token de next-auth + nuestros campos (tipado explícito, sin "any")
      const token = rawToken as typeof rawToken & AppToken;
      // 1) Login con email/2FA: los tokens ya vienen verificados por "authorize"
      if (user?.backend) return { ...token, backend: toStored(user.backend), error: undefined };

      // 2) Login OAuth: se canjea el access token del proveedor por una sesión del backend
      if (account && account.provider !== "credentials" && account.access_token) {
        const { data } = await apiRequest<BackendTokens>("/auth/oauth", {
          method: "POST",
          body: { provider: account.provider.toUpperCase(), accessToken: account.access_token },
        });
        return { ...token, backend: toStored(data), error: undefined };
      }

      // 3) Token vigente => se devuelve tal cual (sin llamadas de red)
      if (!token.backend || Date.now() < token.backend.expiresAt - REFRESH_MARGIN_MS) return token;

      // 4) Token por vencer => renovación con rotación (el backend invalida el refresh token anterior)
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
        return { ...token, error: "RefreshFailed" as const }; // La UI/middleware fuerzan un nuevo login
      }
    },
    // "session" callback => forma final que consumen useSession()/auth() (solo datos necesarios para la UI)
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
    // Cerrar sesión en Next también revoca la sesión en el backend (logout real, no solo borrar la cookie)
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
    signIn: "/login", // Redirige a NUESTRA página de login personalizada, no a la UI genérica de next-auth
  },
};

// Instancia única de next-auth (Singleton de módulo) reutilizada por route handler, middleware y RSC
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
