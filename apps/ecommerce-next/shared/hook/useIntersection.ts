// useIntersection.ts (React Hook + IntersectionObserver API nativa) => ¿el elemento es visible en el viewport?
// Uso: carga perezosa de secciones bajo el pliegue (productos recomendados, reseñas) => mejor LCP/TTI.
"use client";

import { useEffect, useRef, useState } from "react";

export function useIntersection<T extends Element>(
  options: IntersectionObserverInit = { rootMargin: "200px" }
) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isVisible) return; // Una vez visible no se vuelve a observar (carga única)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setIsVisible(true);
    }, options);
    observer.observe(element);
    return () => observer.disconnect(); // Cleanup: libera el observer al desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps -- "options" es configuración estática del llamador
  }, [isVisible]);

  return { ref, isVisible };
}
