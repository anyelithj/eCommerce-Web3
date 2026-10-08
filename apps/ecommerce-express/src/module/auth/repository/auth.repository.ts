import { DEFAULT_LOCALE, isLocale, type Locale } from "../../../shared/util/i18n.util";
import type { PrismaClient, VerificationPurpose, OAuthProvider, Prisma } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import {
  UserEntity,
  SessionEntity,
  VerificationTokenEntity,
  type UserPersistenceShape,
} from "../model/auth.model";
import { Roles } from "../../../shared/constants/roles.constants";

const USER_WITH_ROLES = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof USER_WITH_ROLES }>;

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { email },
      include: USER_WITH_ROLES,
    });
    return rawUser ? this.mapToUserEntity(rawUser) : null;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const rawUser = await this.prisma.user.findUnique({ where: { id }, include: USER_WITH_ROLES });
    return rawUser ? this.mapToUserEntity(rawUser) : null;
  }

  public async findByWalletAddress(walletAddress: string): Promise<UserEntity | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: USER_WITH_ROLES,
    });
    return rawUser ? this.mapToUserEntity(rawUser) : null;
  }

  public async createUser(data: {
    email: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
    isVerified?: boolean | undefined;
    locale?: Locale | undefined;
  }): Promise<UserEntity> {
    const rawUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        avatarUrl: data.avatarUrl ?? null,
        isVerified: data.isVerified ?? false,
        locale: data.locale ?? DEFAULT_LOCALE,
        roles: { create: [{ role: { connect: { name: Roles.CUSTOMER } } }] },
        loyaltyAccount: { create: {} },
        notificationPrefs: { create: {} },
      },
      include: USER_WITH_ROLES,
    });

    return this.mapToUserEntity(rawUser);
  }

  public async markEmailAsVerified(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  public async updatePasswordHash(userId: string, newHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }

  public async setTwoFactor(userId: string, enabled: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
  }

  public async findByOAuthAccount(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<UserEntity | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: { include: USER_WITH_ROLES } },
    });
    return account ? this.mapToUserEntity(account.user) : null;
  }

  public async linkWallet(userId: string, walletAddress: string): Promise<string> {
    const normalized = walletAddress.toLowerCase();
    await this.prisma.user.update({ where: { id: userId }, data: { walletAddress: normalized } });
    return normalized;
  }

  public async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<void> {
    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      update: {},
      create: { userId, provider, providerAccountId },
    });
  }

  public async createSession(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
  }): Promise<SessionEntity> {
    const rawSession = await this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });
    return new SessionEntity(rawSession);
  }

  public async findSessionById(sessionId: string): Promise<SessionEntity | null> {
    const rawSession = await this.prisma.session.findUnique({ where: { id: sessionId } });
    return rawSession ? new SessionEntity(rawSession) : null;
  }

  public async updateSessionToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash, expiresAt },
    });
  }

  public async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  public async createVerificationToken(data: {
    id?: string | undefined;
    userId: string;
    purpose: VerificationPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId: data.userId, purpose: data.purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          userId: data.userId,
          purpose: data.purpose,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      }),
    ]);
    return created.id;
  }

  public async findVerificationTokenByHash(
    tokenHash: string,
    purpose: VerificationPurpose
  ): Promise<VerificationTokenEntity | null> {
    const row = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!row || row.purpose !== purpose) return null;
    return new VerificationTokenEntity(
      row.id,
      row.userId,
      row.expiresAt,
      row.consumedAt,
      row.attempts
    );
  }

  public async findVerificationTokenById(
    id: string,
    purpose: VerificationPurpose
  ): Promise<{
    entity: VerificationTokenEntity;
    tokenHash: string;
  } | null> {
    const row = await this.prisma.verificationToken.findUnique({ where: { id } });
    if (!row || row.purpose !== purpose) return null;
    return {
      entity: new VerificationTokenEntity(
        row.id,
        row.userId,
        row.expiresAt,
        row.consumedAt,
        row.attempts
      ),
      tokenHash: row.tokenHash,
    };
  }

  public async incrementTokenAttempts(id: string): Promise<void> {
    await this.prisma.verificationToken.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  public async consumeVerificationToken(id: string): Promise<void> {
    await this.prisma.verificationToken.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  private mapToUserEntity(rawUser: UserRow): UserEntity {
    const shape: UserPersistenceShape = {
      id: rawUser.id,
      email: rawUser.email,
      passwordHash: rawUser.passwordHash,
      firstName: rawUser.firstName,
      lastName: rawUser.lastName,
      avatarUrl: rawUser.avatarUrl,
      isVerified: rawUser.isVerified,
      isActive: rawUser.isActive,
      twoFactorEnabled: rawUser.twoFactorEnabled,
      walletAddress: rawUser.walletAddress,
      locale: isLocale(rawUser.locale) ? rawUser.locale : DEFAULT_LOCALE,
      roles: rawUser.roles.map((userRole) => userRole.role.name),
    };

    return new UserEntity(shape);
  }
}

export const authRepository = new AuthRepository(prisma);
