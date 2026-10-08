// useDebounce.ts (React Hook) => retrasa la propagación de un valor hasta que deja de cambiar "delay" ms.
// Uso: autocompletado de búsqueda (una petición al terminar de escribir, no una por tecla => menos carga y latencia).
"use client";

import { useEffect, useState } from "react";

// "<T>" => genérico: sirve para strings, números u objetos
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Cleanup: si el valor cambia antes del plazo, se cancela el timer anterior
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
