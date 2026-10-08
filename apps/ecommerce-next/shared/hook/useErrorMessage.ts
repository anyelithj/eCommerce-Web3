"use client";

import { useTranslations } from "next-intl";

export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: unknown, fallback?: string): string => {
    const code =
      typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (typeof code === "string" && t.has(code)) return t(code);
    if (error instanceof Error && error.message) return error.message;
    return fallback ?? t("UNEXPECTED");
  };
}
