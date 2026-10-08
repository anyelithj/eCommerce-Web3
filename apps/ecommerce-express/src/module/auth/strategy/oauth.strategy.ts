// oauth.strategy.ts => PATRÓN "Strategy" aplicado a proveedores OAuth2 externos + PATRÓN "Adapter".
// El flujo OAuth2 (redirect + intercambio del code) lo completa next-auth en el frontend. El backend
// recibe el ACCESS TOKEN del proveedor y lo VERIFICA llamando al endpoint "userinfo" del propio proveedor:
// si el token es falso o de otra app, el proveedor responde 401 y no se emite sesión (verificación sin confianza ciega).
// Antes se usaba passport-oauth2 aquí, lo que duplicaba el flujo que ya hace next-auth; además la Strategy
// genérica de passport-oauth2 no descarga el perfil, así que el email siempre llegaba vacío.
import axios, { AxiosError } from "axios"; // Cliente HTTP (prescrito en el SETUP para APIs externas sin SDK)
import type { OAuthProfile, OAuthProviderName } from "../types/auth.types";
import { OAuthVerificationException } from "../exception/auth.exception";

// "interface" => contrato común de todas las estrategias (OCP: un 4º proveedor = una clase nueva que lo cumpla)
interface OAuthProfileStrategy {
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

// Cliente HTTP con timeout: un proveedor lento no debe colgar el login indefinidamente
const http = axios.create({ timeout: 5000 });

// Helper: cabecera Bearer estándar de OAuth2
const bearer = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` } });

// Divide un nombre completo en nombre/apellido (Adapter para proveedores que solo entregan "name")
function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const [first = "Usuario", ...rest] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: first, lastName: rest.join(" ") };
}

// --- Google (OpenID Connect userinfo) ---
class GoogleProfileStrategy implements OAuthProfileStrategy {
  public async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    // "http.get<T>" => genérico: tipa la forma esperada de la respuesta JSON
    const { data } = await http.get<{
      sub: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    }>("https://openidconnect.googleapis.com/v1/userinfo", bearer(accessToken));

    const fallbackName = splitName(data.name);
    return {
      provider: "GOOGLE",
      providerAccountId: data.sub,
      email: data.email ?? "",
      emailVerified: data.email_verified === true,
      firstName: data.given_name ?? fallbackName.firstName,
      lastName: data.family_name ?? fallbackName.lastName,
      avatarUrl: data.picture,
    };
  }
}

// --- GitHub (el email puede ser privado: se consulta /user/emails para obtener el primario verificado) ---
class GitHubProfileStrategy implements OAuthProfileStrategy {
  public async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    // "Promise.all" => ambas llamadas en paralelo (menor latencia del login)
    const [userResponse, emailsResponse] = await Promise.all([
      http.get<{ id: number; name: string | null; login: string; avatar_url?: string }>(
        "https://api.github.com/user",
        bearer(accessToken)
      ),
      http.get<Array<{ email: string; primary: boolean; verified: boolean }>>(
        "https://api.github.com/user/emails",
        bearer(accessToken)
      ),
    ]);

    // ".find" => primer email marcado como primario Y verificado
    const primary = emailsResponse.data.find((entry) => entry.primary && entry.verified);
    const { firstName, lastName } = splitName(userResponse.data.name ?? userResponse.data.login);
    return {
      provider: "GITHUB",
      providerAccountId: String(userResponse.data.id), // GitHub usa IDs numéricos: se normalizan a string
      email: primary?.email ?? "",
      emailVerified: Boolean(primary),
      firstName,
      lastName,
      avatarUrl: userResponse.data.avatar_url,
    };
  }
}

// --- Discord ---
class DiscordProfileStrategy implements OAuthProfileStrategy {
  public async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const { data } = await http.get<{
      id: string;
      email?: string;
      verified?: boolean;
      global_name?: string | null;
      username: string;
      avatar?: string | null;
    }>("https://discord.com/api/users/@me", bearer(accessToken));

    const { firstName, lastName } = splitName(data.global_name ?? data.username);
    return {
      provider: "DISCORD",
      providerAccountId: data.id,
      email: data.email ?? "",
      emailVerified: data.verified === true,
      firstName,
      lastName,
      // URL del CDN de Discord construida con el hash del avatar (si el usuario tiene uno)
      avatarUrl: data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : undefined,
    };
  }
}

// Registro de estrategias (patrón Registry/Factory): nombre del proveedor -> implementación
// "Record<OAuthProviderName, ...>" => el compilador obliga a cubrir los 3 proveedores
const strategies: Record<OAuthProviderName, OAuthProfileStrategy> = {
  GOOGLE: new GoogleProfileStrategy(),
  GITHUB: new GitHubProfileStrategy(),
  DISCORD: new DiscordProfileStrategy(),
};

// verifyOAuthAccessToken => punto de entrada único usado por AuthService (Facade)
export async function verifyOAuthAccessToken(
  provider: OAuthProviderName,
  accessToken: string
): Promise<OAuthProfile> {
  try {
    const profile = await strategies[provider].fetchProfile(accessToken);
    // Sin email no se puede crear ni vincular una cuenta de forma segura
    if (!profile.email) throw new OAuthVerificationException("el proveedor no entregó un email");
    return { ...profile, email: profile.email.toLowerCase() };
  } catch (error) {
    if (error instanceof OAuthVerificationException) throw error;
    // "instanceof AxiosError" => el proveedor rechazó el token (401/403) o no respondió a tiempo
    const reason =
      error instanceof AxiosError
        ? `respuesta ${error.response?.status ?? "sin respuesta"}`
        : "error desconocido";
    throw new OAuthVerificationException(reason);
  }
}
