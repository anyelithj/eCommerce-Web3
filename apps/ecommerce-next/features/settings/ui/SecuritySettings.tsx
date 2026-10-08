"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useProfile } from "@/entities/user/api/user.api";
import { useSettingsActions } from "../api/settings.api";
import { passwordSchema, type PasswordFormInput } from "../lib/settings.validator";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { toast } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";

function WalletSection() {
  const t = useTranslations("settings.wallet");
  const errorMessage = useErrorMessage();
  const { data: profile } = useProfile();
  const { linkWallet } = useSettingsActions();
  return (
    <section aria-labelledby="wallet-title" className="flex max-w-md flex-col gap-3">
      <h2 id="wallet-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {profile?.walletAddress ? (
        <p className="break-all text-sm text-slate-700">
          {t.rich("linked", {
            address: profile.walletAddress,
            mono: (chunk) => <span className="font-mono">{chunk}</span>,
          })}
        </p>
      ) : (
        <p className="text-sm text-slate-600">{t("description")}</p>
      )}
      <Button
        variant="secondary"
        loading={linkWallet.isPending}
        className="self-start"
        onClick={() =>
          linkWallet.mutate(undefined, {
            onSuccess: () => toast.success(t("success")),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      >
        {profile?.walletAddress ? t("change") : t("link")}
      </Button>
    </section>
  );
}

export function SecuritySettings() {
  const t = useTranslations("settings.security");
  const errorMessage = useErrorMessage();
  const { data: profile } = useProfile();
  const { changePassword, setTwoFactor, deleteAccount } = useSettingsActions();
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useZodForm({
    schema: passwordSchema,
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    onSubmit: ({ currentPassword, newPassword }: PasswordFormInput, helpers) =>
      changePassword.mutate(
        { currentPassword, newPassword },
        {
          onSuccess: () => {
            helpers.resetForm();
            toast.success(t("passwordSaved"));
          },
          onError: (error) => toast.error(errorMessage(error)),
        }
      ),
  });

  const twoFactorOn = profile?.twoFactorEnabled ?? false;

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="password-title" className="flex flex-col gap-4">
        <h2 id="password-title" className="text-lg font-semibold">
          {t("passwordTitle")}
        </h2>
        <form onSubmit={form.handleSubmit} noValidate className="grid max-w-md grid-cols-1 gap-4">
          <Input
            label={t("currentPassword")}
            type="password"
            autoComplete="current-password"
            error={form.error("currentPassword")}
            {...form.getFieldProps("currentPassword")}
          />
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
          <Button type="submit" loading={changePassword.isPending} className="justify-self-start">
            {t("updatePassword")}
          </Button>
        </form>
      </section>

      <section aria-labelledby="twofactor-title" className="flex max-w-md flex-col gap-3">
        <h2 id="twofactor-title" className="text-lg font-semibold">
          {t("twoFactorTitle")}
        </h2>
        <p className="text-sm text-slate-600">
          {twoFactorOn ? t("twoFactorOn") : t("twoFactorOff")}
        </p>
        <Input
          label={t("confirmWithPassword")}
          type="password"
          autoComplete="current-password"
          value={twoFactorPassword}
          onChange={(event) => setTwoFactorPassword(event.target.value)}
        />
        <Button
          variant={twoFactorOn ? "secondary" : "primary"}
          loading={setTwoFactor.isPending}
          disabled={!twoFactorPassword}
          className="justify-self-start self-start"
          onClick={() =>
            setTwoFactor.mutate(
              { enabled: !twoFactorOn, password: twoFactorPassword },
              {
                onSuccess: () => {
                  setTwoFactorPassword("");
                  toast.success(twoFactorOn ? t("twoFactorDisabled") : t("twoFactorEnabled"));
                },
                onError: (error) => toast.error(errorMessage(error)),
              }
            )
          }
        >
          {twoFactorOn ? t("disableTwoFactor") : t("enableTwoFactor")}
        </Button>
      </section>

      <WalletSection />

      <section
        aria-labelledby="delete-title"
        className="flex max-w-md flex-col gap-3 rounded-lg border border-red-200 p-4"
      >
        <h2 id="delete-title" className="text-lg font-semibold text-red-700">
          {t("deleteTitle")}
        </h2>
        <p className="text-sm text-slate-600">{t("deleteDescription")}</p>
        <Button variant="danger" className="self-start" onClick={() => setConfirmDelete(true)}>
          {t("deleteButton")}
        </Button>
      </section>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteConfirmTitle")}
      >
        <p className="mb-4 text-sm text-slate-700">{t("deleteConfirmText")}</p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            loading={deleteAccount.isPending}
            onClick={() =>
              deleteAccount.mutate(undefined, {
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          >
            {t("deleteConfirm")}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
