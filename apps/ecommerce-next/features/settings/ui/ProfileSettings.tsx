"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useProfile } from "@/entities/user/api/user.api";
import { useSettingsActions } from "../api/settings.api";
import { profileSchema, type ProfileFormValues } from "../lib/settings.validator";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { toast } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";

export function ProfileSettings() {
  const t = useTranslations("settings.profile");
  const errorMessage = useErrorMessage();
  const { data: profile, isLoading } = useProfile();
  const { updateProfile } = useSettingsActions();
  const form = useZodForm({
    schema: profileSchema,
    initialValues: { firstName: "", lastName: "", phone: "" },
    onSubmit: (values: ProfileFormValues) =>
      updateProfile.mutate(values, {
        onSuccess: () => toast.success(t("saved")),
        onError: (error) => toast.error(errorMessage(error)),
      }),
  });
  const { resetForm } = form;

  useEffect(() => {
    if (profile)
      resetForm({
        values: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? "",
        },
      });
  }, [profile, resetForm]);

  if (isLoading || !profile) return <Skeleton className="h-48 w-full" />;
  return (
    <form onSubmit={form.handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <Input label={t("email")} value={profile.email} disabled readOnly hint={t("emailHint")} />
      <Input
        label={t("phone")}
        type="tel"
        autoComplete="tel"
        error={form.error("phone")}
        {...form.getFieldProps("phone")}
      />
      <Button
        type="submit"
        loading={updateProfile.isPending}
        disabled={!form.dirty}
        className="sm:col-span-2 sm:justify-self-start"
      >
        {t("save")}
      </Button>
    </form>
  );
}
