"use client";

import { useEffect, useRef, useState } from "react";

export function useIntersection<T extends Element>(
  options: IntersectionObserverInit = { rootMargin: "200px" }
) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isVisible) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setIsVisible(true);
    }, options);
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- "options" es configuración estática del llamador
  }, [isVisible]);

  return { ref, isVisible };
}
