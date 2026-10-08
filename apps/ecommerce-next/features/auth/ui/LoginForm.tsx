"use client";

import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation";
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
import { useZodForm } from "@/shared/hook/useZodForm";

export function useCompleteLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { reset } = useAuthStore();
  const t = useTranslations("auth.login");

  return async (tokens: AuthTokenResponse) => {
    const result = await signIn("credentials", {
      payload: JSON.stringify(tokens),
      redirect: false,
    });
    if (result?.error) throw new Error(t("sessionFailed"));
    reset();
    const callbackUrl = searchParams.get("callbackUrl");
    router.replace(callbackUrl?.startsWith("/") ? callbackUrl : "/");
    router.refresh();
  };
}

function CredentialsStep() {
  const t = useTranslations("auth.login");
  const errorMessage = useErrorMessage();
  const completeLogin = useCompleteLogin();
  const { requireTwoFactor } = useAuthStore();
  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: async (result, values) => {
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
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
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
        inputMode="numeric"
        autoComplete="one-time-code"
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

export default function LoginForm() {
  const { step } = useAuthStore();
  return step.name === "two-factor" ? (
    <TwoFactorStep challengeId={step.challengeId} email={step.email} />
  ) : (
    <CredentialsStep />
  );
}
