// useErrorMessage.ts => mensaje de error en el idioma del usuario. Los errores del backend traen un "code" estable
// (INVALID_CREDENTIALS, OUT_OF_STOCK...): si existe traducción para ese código se usa; si no, el mensaje del backend.
"use client";

import { useTranslations } from "next-intl";

export function useErrorMessage() {
  const t = useTranslations("errors");
  // Devuelve "(error, fallback?) => string": se usa como errorMessage(error, t("mensajePorDefecto"))
  return (error: unknown, fallback?: string): string => {
    // Narrowing estructural: cualquier objeto con "code" string (ApiError, WalletUnavailableError...) se traduce
    const code =
      typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (typeof code === "string" && t.has(code)) return t(code);
    if (error instanceof Error && error.message) return error.message;
    return fallback ?? t("UNEXPECTED");
  };
}
