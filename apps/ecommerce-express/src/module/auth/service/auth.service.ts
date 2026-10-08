import crypto from "node:crypto";
import { verifyMessage } from "ethers";
import { authRepository, type AuthRepository } from "../repository/auth.repository";
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  generateOtp,
} from "../util/token.util";
import {
  InvalidCredentialsException,
  EmailAlreadyRegisteredException,
  AccountNotVerifiedException,
  AccountDisabledException,
  InvalidSessionException,
  InvalidTokenException,
  InvalidWeb3SignatureException,
  WalletAlreadyLinkedException,
  InvalidTwoFactorCodeException,
} from "../exception/auth.exception";
import type {
  RegisterDto,
  LoginDto,
  LoginResultDto,
  RequestContextDto,
  TokenDto,
  Web3LoginDto,
} from "../dto/auth.dto";
import type { Web3LoginInput } from "../schema/auth.schema";
import type { AuthEvents, OAuthProviderName } from "../types/auth.types";
import type { UserEntity } from "../model/auth.model";
import { verifyOAuthAccessToken } from "../strategy/oauth.strategy";
import { sha256, safeEqual } from "../../../shared/util/crypto.util";
import { addMinutes } from "../../../shared/util/date.util";
import { TypedEventBus } from "../../../shared/util/event-bus.util";
import { ForbiddenException } from "../../../shared/filter/http-exception.filter";
import { jwtConfig } from "../../../config/jwt.config";
import { redis, RedisKeys } from "../../../config/redis.config";

const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60;
const PASSWORD_RESET_TTL_MINUTES = 60;
const TWO_FACTOR_TTL_MINUTES = 10;
const WEB3_NONCE_TTL_SECONDS = 300;

export const authEvents = new TypedEventBus<AuthEvents>("auth");

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  public async registerUser(dto: RegisterDto): Promise<{ userId: string }> {
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      throw new EmailAlreadyRegisteredException(dto.email);
    }

    const passwordHash = await hashPassword(dto.password);

    const newUser = await this.repository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale,
    });

    await this.sendVerificationEmail(newUser);
    return { userId: newUser.id };
  }

  public async resendVerification(email: string): Promise<void> {
    const user = await this.repository.findByEmail(email);
    if (!user || user.isVerified) return;
    await this.sendVerificationEmail(user);
  }

  public async loginUser(dto: LoginDto): Promise<LoginResultDto> {
    const user = await this.repository.findByEmail(dto.email);

    const storedHash = user?.getPasswordHashForComparison();
    if (!user || !storedHash) throw new InvalidCredentialsException();

    const passwordMatches = await comparePassword(dto.password, storedHash);
    if (!passwordMatches) throw new InvalidCredentialsException();

    this.assertCanAuthenticate(user);

    if (user.twoFactorEnabled) {
      const code = generateOtp();
      const challengeId = crypto.randomUUID();
      await this.repository.createVerificationToken({
        id: challengeId,
        userId: user.id,
        purpose: "TWO_FACTOR",
        tokenHash: sha256(`${challengeId}:${code}`),
        expiresAt: addMinutes(new Date(), TWO_FACTOR_TTL_MINUTES),
      });
      authEvents.emit("user.two-factor-code", {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        locale: user.locale,
        code,
      });
      return { requiresTwoFactor: true, challengeId, expiresIn: TWO_FACTOR_TTL_MINUTES * 60 };
    }

    return this.issueTokenPair(user, dto);
  }

  public async verifyTwoFactor(
    challengeId: string,
    code: string,
    context: RequestContextDto
  ): Promise<TokenDto> {
    const challenge = await this.repository.findVerificationTokenById(challengeId, "TWO_FACTOR");
    if (!challenge || !challenge.entity.isUsable()) throw new InvalidTwoFactorCodeException();

    if (!safeEqual(challenge.tokenHash, sha256(`${challengeId}:${code}`))) {
      await this.repository.incrementTokenAttempts(challengeId);
      throw new InvalidTwoFactorCodeException();
    }

    await this.repository.consumeVerificationToken(challengeId);

    const user = await this.repository.findById(challenge.entity.userId);
    if (!user) throw new InvalidTwoFactorCodeException();
    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, context);
  }

  public async setTwoFactor(userId: string, enabled: boolean, password: string): Promise<void> {
    const user = await this.repository.findById(userId);
    const storedHash = user?.getPasswordHashForComparison();
    if (!user || !storedHash || !(await comparePassword(password, storedHash))) {
      throw new InvalidCredentialsException();
    }
    await this.repository.setTwoFactor(userId, enabled);
  }

  public async loginWithOAuth(
    provider: OAuthProviderName,
    accessToken: string,
    context: RequestContextDto
  ): Promise<TokenDto> {
    const profile = await verifyOAuthAccessToken(provider, accessToken);

    let user = await this.repository.findByOAuthAccount(provider, profile.providerAccountId);

    if (!user) {
      const byEmail = await this.repository.findByEmail(profile.email);
      if (byEmail && !profile.emailVerified)
        throw new ForbiddenException("Verifica tu email en el proveedor para vincular la cuenta");

      user =
        byEmail ??
        (await this.repository.createUser({
          email: profile.email,
          passwordHash: null,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          isVerified: profile.emailVerified,
        }));
      await this.repository.linkOAuthAccount(user.id, provider, profile.providerAccountId);
    }

    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, context);
  }

  public async createWeb3Nonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    const nonce = crypto.randomBytes(16).toString("hex");
    await redis.set(RedisKeys.web3Nonce(walletAddress), nonce, "EX", WEB3_NONCE_TTL_SECONDS);
    const message = `eCommerce Web3 quiere que inicies sesión con tu cuenta:\n${walletAddress}\n\nNonce: ${nonce}`;
    return { nonce, message };
  }

  private async verifyWalletSignature(dto: Web3LoginInput): Promise<void> {
    const nonceKey = RedisKeys.web3Nonce(dto.walletAddress);
    const nonce = await redis.get(nonceKey);
    if (!nonce || !dto.message.includes(`Nonce: ${nonce}`))
      throw new InvalidWeb3SignatureException();
    await redis.del(nonceKey);

    const recoveredAddress = verifyMessage(dto.message, dto.signature);
    if (recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
      throw new InvalidWeb3SignatureException();
    }
  }

  public async linkWallet(userId: string, dto: Web3LoginInput): Promise<{ walletAddress: string }> {
    await this.verifyWalletSignature(dto);
    const owner = await this.repository.findByWalletAddress(dto.walletAddress);
    if (owner && owner.id !== userId) throw new WalletAlreadyLinkedException();
    const walletAddress = await this.repository.linkWallet(userId, dto.walletAddress);
    return { walletAddress };
  }

  public async loginWithWeb3(dto: Web3LoginDto): Promise<TokenDto> {
    await this.verifyWalletSignature(dto);

    const user = await this.repository.findByWalletAddress(dto.walletAddress);
    if (!user || !user.matchesWalletAddress(dto.walletAddress))
      throw new InvalidWeb3SignatureException();

    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, dto);
  }

  public async refreshAccessToken(sessionId: string, refreshToken: string): Promise<TokenDto> {
    let decoded: { sub: string; sessionId: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidSessionException();
    }
    if (decoded.sessionId !== sessionId) throw new InvalidSessionException();

    const session = await this.repository.findSessionById(sessionId);
    if (!session || !session.isValid()) throw new InvalidSessionException();

    if (!session.matchesRefreshTokenHash(sha256(refreshToken))) {
      await this.repository.revokeSession(sessionId);
      throw new InvalidSessionException();
    }

    const user = await this.repository.findById(decoded.sub);
    if (!user || !user.isActive) throw new InvalidSessionException();

    const newRefreshToken = signRefreshToken({ sub: user.id, sessionId });
    await this.repository.updateSessionToken(
      sessionId,
      sha256(newRefreshToken),
      new Date(Date.now() + jwtConfig.refreshTtlMs)
    );

    return this.buildTokenDto(user, sessionId, newRefreshToken);
  }

  public async revokeSession(
    sessionId: string,
    requester: { id: string; roles: string[] }
  ): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) throw new InvalidSessionException();
    if (!session.belongsTo(requester.id) && !requester.roles.includes("ADMIN")) {
      throw new ForbiddenException("No puedes cerrar la sesión de otro usuario");
    }
    await this.repository.revokeSession(sessionId);
  }

  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repository.findByEmail(email);

    if (!user || !user.isActive) return;

    const resetToken = generateSecureToken();
    await this.repository.createVerificationToken({
      userId: user.id,
      purpose: "PASSWORD_RESET",
      tokenHash: sha256(resetToken),
      expiresAt: addMinutes(new Date(), PASSWORD_RESET_TTL_MINUTES),
    });

    authEvents.emit("user.password-reset-requested", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
      resetToken,
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.repository.findVerificationTokenByHash(
      sha256(token),
      "PASSWORD_RESET"
    );
    if (!record || !record.isUsable()) throw new InvalidTokenException("recuperación");

    const user = await this.repository.findById(record.userId);
    if (!user) throw new InvalidTokenException("recuperación");

    await this.repository.updatePasswordHash(user.id, await hashPassword(newPassword));
    await this.repository.consumeVerificationToken(record.id);
    await this.repository.revokeAllUserSessions(user.id);
    if (!user.isVerified) await this.repository.markEmailAsVerified(user.id);

    authEvents.emit("user.password-changed", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });
  }

  public async verifyEmailToken(userId: string, token: string): Promise<void> {
    const record = await this.repository.findVerificationTokenByHash(
      sha256(token),
      "EMAIL_VERIFICATION"
    );
    if (!record || !record.isUsable() || record.userId !== userId)
      throw new InvalidTokenException("verificación");

    await this.repository.markEmailAsVerified(userId);
    await this.repository.consumeVerificationToken(record.id);
  }

  private assertCanAuthenticate(user: UserEntity): void {
    if (!user.isActive) throw new AccountDisabledException();
    if (!user.canAuthenticate()) throw new AccountNotVerifiedException();
  }

  private async sendVerificationEmail(user: UserEntity): Promise<void> {
    const verificationToken = generateSecureToken();
    await this.repository.createVerificationToken({
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      tokenHash: sha256(verificationToken),
      expiresAt: addMinutes(new Date(), EMAIL_VERIFICATION_TTL_MINUTES),
    });
    authEvents.emit("user.registered", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
      verificationToken,
    });
  }

  private async issueTokenPair(user: UserEntity, context: RequestContextDto): Promise<TokenDto> {
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: sha256(crypto.randomUUID()),
      expiresAt: new Date(Date.now() + jwtConfig.refreshTtlMs),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const refreshToken = signRefreshToken({ sub: user.id, sessionId: session.id });
    await this.repository.updateSessionToken(session.id, sha256(refreshToken), session.expiresAt);

    return this.buildTokenDto(user, session.id, refreshToken);
  }

  private buildTokenDto(user: UserEntity, sessionId: string, refreshToken: string): TokenDto {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.accessTtlSeconds,
      sessionId,
      user: user.toPublicJSON(),
    };
  }
}

export const authService = new AuthService(authRepository);
