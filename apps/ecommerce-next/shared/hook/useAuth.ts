// useAuth.ts (React Hook + next-auth) => acceso tipado a la sesión: usuario, token del backend y estado.
// Encapsula la forma de la sesión de next-auth (Facade): los componentes no conocen sus detalles internos.
"use client";

import { useSession } from "next-auth/react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatarUrl: string | null;
}

export function useAuth() {
  const { data: session, status } = useSession();
  // La sesión de next-auth se amplía en shared/lib/auth-config.ts (callbacks jwt/session)
  const user = (session?.user as SessionUser | undefined) ?? null;
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  return {
    user,
    accessToken,
    isAuthenticated: status === "authenticated" && Boolean(accessToken),
    isLoading: status === "loading",
    hasRole: (role: string) => user?.roles.includes(role) ?? false,
  };
}
