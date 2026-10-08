"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/shared/lib/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { web3LoginRequest } from "../api/auth.api";
import { useCompleteLogin } from "./LoginForm";
import { signWalletChallenge } from "@/shared/lib/wallet";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";

interface OAuthProviderConfig {
  providerId: "google" | "github" | "discord";
  label: "google" | "github" | "discord";
}

const providers: OAuthProviderConfig[] = [
  { providerId: "google", label: "google" },
  { providerId: "github", label: "github" },
  { providerId: "discord", label: "discord" },
];

const BUTTON_CLASS =
  "h-11 rounded-md border border-input text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export default function OAuthButtons() {
  const t = useTranslations("auth.oauth");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const searchParams = useSearchParams();
  const completeLogin = useCompleteLogin();
  const next = searchParams.get("callbackUrl");
  const callbackUrl = getPathname({ href: next?.startsWith("/") ? next : "/", locale });

  const walletLogin = useMutation({
    mutationFn: async () => completeLogin(await web3LoginRequest(await signWalletChallenge())),
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-2" role="group" aria-label={t("label")}>
      {providers.map((provider) => (
        <button
          key={provider.providerId}
          type="button"
          onClick={() => void signIn(provider.providerId, { callbackUrl })}
          className={BUTTON_CLASS}
        >
          {t(provider.label)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => walletLogin.mutate()}
        disabled={walletLogin.isPending}
        aria-busy={walletLogin.isPending}
        className={BUTTON_CLASS}
      >
        {walletLogin.isPending ? t("walletPending") : t("wallet")}
      </button>
      {walletLogin.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(walletLogin.error, t("walletFailed"))}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("walletHint")}</p>
    </div>
  );
}
