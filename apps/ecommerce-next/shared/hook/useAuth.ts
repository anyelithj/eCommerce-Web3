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
