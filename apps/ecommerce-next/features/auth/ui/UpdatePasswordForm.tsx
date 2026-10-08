"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { updatePasswordSchema, type UpdatePasswordFormValues } from "../lib/auth.validator";
import { resetPasswordRequest } from "../api/auth.api";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";

interface UpdatePasswordFormProps {
  resetToken: string;
}

export default function UpdatePasswordForm({ resetToken }: UpdatePasswordFormProps) {
  const t = useTranslations("auth.updatePassword");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const updateMutation = useMutation({
    mutationFn: (values: UpdatePasswordFormValues) =>
      resetPasswordRequest(resetToken, values.newPassword),
    onSuccess: () => {
      toast.success(t("success"));
      router.push("/login");
    },
  });
  const form = useZodForm({
    schema: updatePasswordSchema,
    initialValues: { newPassword: "", confirmPassword: "" },
    onSubmit: (values: UpdatePasswordFormValues) => updateMutation.mutate(values),
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4">
      <Input
        label={t("newPassword")}
        type="password"
        autoComplete="new-password"
        error={form.error("newPassword")}
        {...form.getFieldProps("newPassword")}
      />
      <Input
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={form.error("confirmPassword")}
        {...form.getFieldProps("confirmPassword")}
      />
      {updateMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(updateMutation.error, t("failed"))}
        </p>
      )}
      <Button type="submit" loading={updateMutation.isPending} fullWidth>
        {updateMutation.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
