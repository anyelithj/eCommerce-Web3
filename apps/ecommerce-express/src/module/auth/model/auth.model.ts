import type { AuthUserDto } from "../dto/auth.dto";
import type { Locale } from "../../../shared/util/i18n.util";

export interface UserPersistenceShape {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  walletAddress: string | null;
  locale: Locale;
  roles: string[];
}

export class UserEntity {
  public readonly id: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly avatarUrl: string | null;
  public readonly roles: string[];
  public readonly twoFactorEnabled: boolean;
  public readonly locale: Locale;

  private readonly passwordHash: string | null;
  private readonly isVerifiedFlag: boolean;
  private readonly isActiveFlag: boolean;
  private readonly walletAddress: string | null;

  constructor(data: UserPersistenceShape) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.avatarUrl = data.avatarUrl;
    this.roles = data.roles;
    this.twoFactorEnabled = data.twoFactorEnabled;
    this.locale = data.locale;
    this.passwordHash = data.passwordHash;
    this.isVerifiedFlag = data.isVerified;
    this.isActiveFlag = data.isActive;
    this.walletAddress = data.walletAddress;
  }

  public getPasswordHashForComparison(): string | null {
    return this.passwordHash;
  }

  public get isActive(): boolean {
    return this.isActiveFlag;
  }

  public get isVerified(): boolean {
    return this.isVerifiedFlag;
  }

  public canAuthenticate(): boolean {
    return this.isActiveFlag && this.isVerifiedFlag;
  }

  public hasWeb3WalletLinked(): boolean {
    return this.walletAddress !== null;
  }

  public matchesWalletAddress(address: string): boolean {
    return this.walletAddress?.toLowerCase() === address.toLowerCase();
  }

  public hasRole(roleName: string): boolean {
    return this.roles.includes(roleName);
  }

  public toPublicJSON(): AuthUserDto {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      avatarUrl: this.avatarUrl,
      roles: this.roles,
    };
  }
}

export class SessionEntity {
  public readonly id: string;
  public readonly userId: string;
  public readonly expiresAt: Date;
  private readonly refreshTokenHash: string;
  private isRevokedFlag: boolean;

  constructor(data: {
    id: string;
    userId: string;
    expiresAt: Date;
    isRevoked: boolean;
    refreshTokenHash: string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.expiresAt = data.expiresAt;
    this.isRevokedFlag = data.isRevoked;
    this.refreshTokenHash = data.refreshTokenHash;
  }

  public isValid(): boolean {
    const now = new Date();
    return !this.isRevokedFlag && this.expiresAt > now;
  }

  public matchesRefreshTokenHash(hash: string): boolean {
    return this.refreshTokenHash === hash;
  }

  public belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  public revoke(): void {
    this.isRevokedFlag = true;
  }
}

export class VerificationTokenEntity {
  public static readonly MAX_ATTEMPTS = 5;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    private readonly expiresAt: Date,
    private readonly consumedAt: Date | null,
    private readonly attempts: number
  ) {}

  public isUsable(): boolean {
    return (
      this.consumedAt === null &&
      this.expiresAt > new Date() &&
      this.attempts < VerificationTokenEntity.MAX_ATTEMPTS
    );
  }
}
