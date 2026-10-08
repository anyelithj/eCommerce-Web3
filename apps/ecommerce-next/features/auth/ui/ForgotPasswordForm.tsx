"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../lib/auth.validator";
import { requestPasswordResetRequest } from "../api/auth.api";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useZodForm } from "@/shared/hook/useZodForm";

export default function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const resetMutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => requestPasswordResetRequest(values.email),
  });
  const form = useZodForm({
    schema: forgotPasswordSchema,
    initialValues: { email: "" },
    onSubmit: (values: ForgotPasswordFormValues) => resetMutation.mutate(values),
  });

  if (resetMutation.isSuccess) {
    return (
      <p role="status" className="max-w-sm text-sm text-slate-700">
        {t("sent")}
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      <Input
        label={t("email")}
        type="email"
        autoComplete="email"
        error={form.error("email")}
        {...form.getFieldProps("email")}
      />
      <Button type="submit" loading={resetMutation.isPending} fullWidth>
        {resetMutation.isPending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
