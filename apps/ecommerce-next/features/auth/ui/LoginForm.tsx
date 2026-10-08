// LoginForm.tsx => login en DOS pasos: (1) credenciales, (2) código OTP si la cuenta tiene 2FA.
// El resultado final (tokens del backend) se entrega a next-auth con signIn("credentials"), que los verifica
// y crea la sesión en cookie httpOnly. Paradigma: componentes funcionales + hooks; máquina de estados en Redux Toolkit (Client State); llamadas al backend con TanStack Query.
"use client"; // Directiva de Next.js 15 App Router: usa hooks => Client Component

import { useMutation } from "@tanstack/react-query"; // Operaciones de escritura con estados loading/error
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation"; // Router con idioma: /en se conserva al redirigir
import { signIn } from "next-auth/react";
import {
  loginSchema,
  otpSchema,
  type LoginFormValues,
  type OtpFormValues,
} from "../lib/auth.validator";
import {
  isTwoFactorChallenge,
  loginRequest,
  verifyTwoFactorRequest,
  type AuthTokenResponse,
} from "../api/auth.api";
import { useAuthStore } from "../model/auth.store";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm"; // Formik + Zod: estado del formulario y validación (misma fuente de reglas)

// useCompleteLogin => hook compartido por ambos pasos y por el login con wallet: crea la sesión de next-auth y redirige (DRY)
export function useCompleteLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { reset } = useAuthStore();
  const t = useTranslations("auth.login");

  return async (tokens: AuthTokenResponse) => {
    // "redirect: false" => manejamos la navegación nosotros (permite mostrar errores sin recargar)
    const result = await signIn("credentials", {
      payload: JSON.stringify(tokens),
      redirect: false,
    });
    if (result?.error) throw new Error(t("sessionFailed"));
    reset();
    // Solo se aceptan rutas internas en callbackUrl (evita "open redirect" hacia sitios externos)
    const callbackUrl = searchParams.get("callbackUrl");
    router.replace(callbackUrl?.startsWith("/") ? callbackUrl : "/");
    router.refresh(); // Re-renderiza los Server Components con la nueva sesión
  };
}

// --- Paso 1: credenciales ---
function CredentialsStep() {
  const t = useTranslations("auth.login");
  const errorMessage = useErrorMessage();
  const completeLogin = useCompleteLogin();
  const { requireTwoFactor } = useAuthStore();
  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: async (result, values) => {
      // Unión discriminada: o desafío 2FA, o tokens
      if (isTwoFactorChallenge(result))
        return requireTwoFactor(result.challengeId, values.email, result.expiresIn);
      await completeLogin(result);
    },
  });
  const form = useZodForm({
    schema: loginSchema,
    initialValues: { email: "", password: "" },
    onSubmit: (values: LoginFormValues) => loginMutation.mutate(values),
  });

  return (
    // "noValidate" => desactiva la validación nativa del navegador; solo Zod (mensajes consistentes)
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      {/* "getFieldProps" => name, value, onChange y onBlur del campo, conectados al estado de Formik */}
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
        autoComplete="current-password"
        error={form.error("password")}
        {...form.getFieldProps("password")}
      />
      {/* Error del servidor (credenciales, cuenta no verificada) — distinto de errores de validación local */}
      {loginMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(loginMutation.error, t("failed"))}
        </p>
      )}
      <Button type="submit" loading={loginMutation.isPending} fullWidth>
        {loginMutation.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

// --- Paso 2: código de verificación (2FA por email) ---
function TwoFactorStep({ challengeId, email }: { challengeId: string; email: string }) {
  const t = useTranslations("auth.twoFactor");
  const errorMessage = useErrorMessage();
  const completeLogin = useCompleteLogin();
  const { reset } = useAuthStore();
  const verifyMutation = useMutation({
    mutationFn: (values: OtpFormValues) => verifyTwoFactorRequest(challengeId, values.code),
    onSuccess: completeLogin,
  });
  const form = useZodForm({
    schema: otpSchema,
    initialValues: { code: "" },
    onSubmit: (values: OtpFormValues) => verifyMutation.mutate(values),
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-slate-600">
        {t.rich("sent", { email, strong: (chunk) => <strong>{chunk}</strong> })}
      </p>
      <Input
        label={t("code")}
        inputMode="numeric" // Teclado numérico en móviles
        autoComplete="one-time-code" // iOS/Android ofrecen autocompletar el código recibido
        maxLength={6}
        autoFocus
        error={form.error("code")}
        {...form.getFieldProps("code")}
      />
      {verifyMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(verifyMutation.error, t("invalid"))}
        </p>
      )}
      <Button type="submit" loading={verifyMutation.isPending} fullWidth>
        {t("submit")}
      </Button>
      <Button variant="ghost" onClick={() => reset()}>
        {t("otherAccount")}
      </Button>
    </form>
  );
}

// "export default function LoginForm()" => orquesta los pasos según el estado del store (render condicional)
export default function LoginForm() {
  const { step } = useAuthStore();
  return step.name === "two-factor" ? (
    <TwoFactorStep challengeId={step.challengeId} email={step.email} />
  ) : (
    <CredentialsStep />
  );
}
