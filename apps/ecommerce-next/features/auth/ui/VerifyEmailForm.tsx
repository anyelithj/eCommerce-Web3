// VerifyEmailForm.tsx => confirma la cuenta automáticamente al abrir el enlace del email.
"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { verifyEmailRequest } from "../api/auth.api";

// "interface Props" => contrato de las props que recibe desde app/(auth)/verify/[token]/page.tsx
interface VerifyEmailFormProps {
  userId: string; // Query param "?uid=" del enlace (el segmento dinámico solo trae el token)
  token: string; // Segmento dinámico [token] de la URL
}

export default function VerifyEmailForm({ userId, token }: VerifyEmailFormProps) {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const verifyMutation = useMutation({
    mutationFn: () => verifyEmailRequest(userId, token),
    // "setTimeout" da tiempo a LEER el mensaje de éxito antes de redirigir (mejor UX)
    onSuccess: () => setTimeout(() => router.push("/login"), 2000),
  });

  // "useRef" como bandera: React 18/19 en desarrollo monta dos veces (StrictMode); el token es de un solo uso,
  // así que se garantiza UNA sola petición
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    verifyMutation.mutate();
  }, [verifyMutation]);

  // Render condicional según el estado (paradigma declarativo: la UI es función del estado)
  if (verifyMutation.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {t("invalid")}
      </p>
    );
  }
  if (verifyMutation.isSuccess) {
    return (
      <p role="status" className="text-sm text-green-700">
        {t("success")}
      </p>
    );
  }
  return (
    <p role="status" className="text-sm text-slate-700">
      {t("pending")}
    </p>
  );
}
