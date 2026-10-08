// RegisterForm.tsx => registro de cuenta. Tras registrarse NO se inicia sesión: la cuenta requiere verificar el
// email (regla de negocio del backend). Se muestra la confirmación con opción de reenviar el enlace.
"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { registerSchema, type RegisterFormValues } from "../lib/auth.validator";
import { registerRequest, resendVerificationRequest } from "../api/auth.api";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const errorMessage = useErrorMessage();
  const locale = useLocale();
  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) => registerRequest(values, locale),
  });
  const form = useZodForm({
    schema: registerSchema,
    initialValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    onSubmit: (values: RegisterFormValues) => registerMutation.mutate(values),
  });
  const email = form.values.email.trim();
  const resendMutation = useMutation({ mutationFn: () => resendVerificationRequest(email) });

  // Estado de éxito: el formulario se reemplaza por instrucciones (role="status" => anunciado por lectores de pantalla)
  if (registerMutation.isSuccess) {
    return (
      <div role="status" className="flex w-full max-w-sm flex-col gap-3 text-center">
        <p className="text-sm text-slate-700">
          {t.rich("sent", { email, strong: (chunk) => <strong>{chunk}</strong> })}
        </p>
        <Button
          variant="secondary"
          loading={resendMutation.isPending}
          disabled={resendMutation.isSuccess}
          onClick={() => resendMutation.mutate()}
        >
          {resendMutation.isSuccess ? t("resent") : t("resend")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      {/* "grid-cols-1 sm:grid-cols-2" => responsive: 1 columna en móvil, 2 desde el breakpoint "sm" */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("firstName")}
          autoComplete="given-name"
          error={form.error("firstName")}
          {...form.getFieldProps("firstName")}
        />
        <Input
          label={t("lastName")}
          autoComplete="family-name"
          error={form.error("lastName")}
          {...form.getFieldProps("lastName")}
        />
      </div>
      <Input
        label={t("email")}
        type="email"
        autoComplete="email"
        error={form.error("email")}
        {...form.getFieldProps("email")}
      />
      <Input
        label={t("password")}
        type="password"
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={form.error("password")}
        {...form.getFieldProps("password")}
      />
      <Input
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={form.error("confirmPassword")}
        {...form.getFieldProps("confirmPassword")}
      />
      {registerMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(registerMutation.error, t("failed"))}
        </p>
      )}
      <Button type="submit" loading={registerMutation.isPending} fullWidth>
        {registerMutation.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
