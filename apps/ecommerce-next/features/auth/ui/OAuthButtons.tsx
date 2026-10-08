// OAuthButtons.tsx => inicio de sesión con proveedores externos: OAuth2 (next-auth completa el flujo y el
// backend verifica el token) y wallet Web3 (Sign-In With Ethereum: firma de un nonce, sin contraseña).
"use client";

import { signIn } from "next-auth/react"; // Dispara el flujo OAuth2 redirect completo
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/shared/lib/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { web3LoginRequest } from "../api/auth.api";
import { useCompleteLogin } from "./LoginForm";
import { signWalletChallenge } from "@/shared/lib/wallet";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";

// PATRÓN "Strategy" a nivel de UI: cada proveedor comparte el MISMO botón; solo cambia la configuración (DRY)
interface OAuthProviderConfig {
  providerId: "google" | "github" | "discord"; // Debe coincidir con el "id" del provider en auth-config.ts
  label: "google" | "github" | "discord"; // Clave de traducción del texto del botón
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
  // Conserva el destino original (ej. el checkout) tras volver del proveedor; solo rutas internas
  const next = searchParams.get("callbackUrl");
  // next-auth redirige con una URL "cruda": se le agrega el prefijo del idioma (/en) con getPathname
  const callbackUrl = getPathname({ href: next?.startsWith("/") ? next : "/", locale });

  // Login con wallet: firmar desafío -> canjear firma por tokens -> sesión next-auth (mismo cierre que email/password)
  const walletLogin = useMutation({
    mutationFn: async () => completeLogin(await web3LoginRequest(await signWalletChallenge())),
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-2" role="group" aria-label={t("label")}>
      {providers.map((provider) => (
        <button
          key={provider.providerId} // "key" obligatorio en listas de React
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
      {/* role="alert" => el lector de pantalla anuncia el error de inmediato */}
      {walletLogin.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(walletLogin.error, t("walletFailed"))}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("walletHint")}</p>
    </div>
  );
}
