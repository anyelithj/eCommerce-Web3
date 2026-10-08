import axios, { AxiosError } from "axios";
import type { OAuthProfile, OAuthProviderName } from "../types/auth.types";
import { OAuthVerificationException } from "../exception/auth.exception";

interface OAuthProfileStrategy {
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

const http = axios.create({ timeout: 5000 });

const bearer = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` } });

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const [first = "Usuario", ...rest] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: first, lastName: rest.join(" ") };
}

class GoogleProfileStrategy implements OAuthProfileStrategy {
  public async fetchProfile(accessToken: string): Promise<OAuthProfile> {
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

class GitHubProfileStrategy implements OAuthProfileStrategy {
  public async fetchProfile(accessToken: string): Promise<OAuthProfile> {
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

    const primary = emailsResponse.data.find((entry) => entry.primary && entry.verified);
    const { firstName, lastName } = splitName(userResponse.data.name ?? userResponse.data.login);
    return {
      provider: "GITHUB",
      providerAccountId: String(userResponse.data.id),
      email: primary?.email ?? "",
      emailVerified: Boolean(primary),
      firstName,
      lastName,
      avatarUrl: userResponse.data.avatar_url,
    };
  }
}

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
      avatarUrl: data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : undefined,
    };
  }
}

const strategies: Record<OAuthProviderName, OAuthProfileStrategy> = {
  GOOGLE: new GoogleProfileStrategy(),
  GITHUB: new GitHubProfileStrategy(),
  DISCORD: new DiscordProfileStrategy(),
};

export async function verifyOAuthAccessToken(
  provider: OAuthProviderName,
  accessToken: string
): Promise<OAuthProfile> {
  try {
    const profile = await strategies[provider].fetchProfile(accessToken);
    if (!profile.email) throw new OAuthVerificationException("el proveedor no entregó un email");
    return { ...profile, email: profile.email.toLowerCase() };
  } catch (error) {
    if (error instanceof OAuthVerificationException) throw error;
    const reason =
      error instanceof AxiosError
        ? `respuesta ${error.response?.status ?? "sin respuesta"}`
        : "error desconocido";
    throw new OAuthVerificationException(reason);
  }
}
