// error.tsx => Error Boundary de ruta (App Router): captura errores de renderizado de cualquier página hija
// y ofrece reintentar sin recargar toda la aplicación. Debe ser Client Component (usa "reset").
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.routeError");
  useEffect(() => {
    // "digest" => ID del error en los logs del servidor (sin exponer el stack al usuario)
    console.error("[route-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
