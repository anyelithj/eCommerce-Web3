// useMediaQuery.ts (React 18+ useSyncExternalStore + matchMedia) => suscripción a una media query CSS.
// useSyncExternalStore evita "tearing" y funciona con SSR (getServerSnapshot devuelve false en el servidor).
"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches, // Snapshot en el navegador
    () => false // Snapshot en el servidor (mobile-first: se asume pantalla pequeña)
  );
}

// Atajo semántico alineado al breakpoint "lg" de Tailwind (1024px)
export const useIsDesktop = (): boolean => useMediaQuery("(min-width: 1024px)");
