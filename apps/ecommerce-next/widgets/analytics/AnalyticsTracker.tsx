// AnalyticsTracker.tsx (Client Component, React) => registra "page_view" en cada navegación del App Router y envía
// el buffer de eventos (shared/lib/analytics.ts) en lotes: cada 30 s, al ocultar la pestaña y al desmontar.
// Patrón Observer (escucha cambios de ruta y de visibilidad). No dibuja nada (return null).
// Ahorro: un lote cada 30 s en vez de una petición por evento; el panel admin no se registra (no es tráfico de clientes).
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation"; // Ruta real (con prefijo de idioma): la que se reporta
import { enqueue, flushEvents } from "@/shared/lib/analytics";
import { useAuth } from "@/shared/hook/useAuth";

const FLUSH_MS = 30_000;

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken); // useRef => último token sin reiniciar los listeners en cada renovación
  tokenRef.current = accessToken;
  const firstView = useRef(true);

  // Cada cambio de ruta = page_view; el referrer externo solo tiene sentido en la primera vista
  useEffect(() => {
    if (pathname.includes("/dashboard")) return;
    enqueue("page_view", firstView.current ? { referrer: document.referrer } : {});
    firstView.current = false;
  }, [pathname]);

  useEffect(() => {
    const flush = () => flushEvents(tokenRef.current);
    const onVisibility = () => document.visibilityState === "hidden" && flush(); // Pestaña oculta o cerrándose
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(flush, FLUSH_MS);
    // Limpieza: quita listeners y temporizador (sin fugas de memoria) y envía lo pendiente
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
      flush();
    };
  }, []);

  return null;
}
