"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { verifyEmailRequest } from "../api/auth.api";

interface VerifyEmailFormProps {
  userId: string;
  token: string;
}

export default function VerifyEmailForm({ userId, token }: VerifyEmailFormProps) {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const verifyMutation = useMutation({
    mutationFn: () => verifyEmailRequest(userId, token),
    onSuccess: () => setTimeout(() => router.push("/login"), 2000),
  });

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    verifyMutation.mutate();
  }, [verifyMutation]);

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
