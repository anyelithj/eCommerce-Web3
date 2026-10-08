// auth.model.ts => Entidades de DOMINIO (POO: clases con estado + comportamiento propio).
// Diferencia con el "User" de Prisma: Prisma genera un TIPO de datos plano (sin métodos);
// esta clase envuelve ese dato y le agrega REGLAS DE NEGOCIO (encapsulamiento real).
// Paradigma: Programación Orientada a Objetos — SRP: esta clase solo conoce reglas de Identidad.
import type { AuthUserDto } from "../dto/auth.dto";
import type { Locale } from "../../../shared/util/i18n.util";

// "interface" describe la forma cruda que llega desde Prisma (fila de la tabla "users")
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
  locale: Locale; // Idioma preferido (es/en) para los textos que genera el backend
  roles: string[]; // Ya aplanado a nombres de rol (ej. ["ADMIN"]) por el Repository
}

// "class UserEntity" => modelo de dominio rico; encapsula el dato + las reglas que lo protegen
export class UserEntity {
  // "readonly" => estas propiedades NUNCA cambian tras construir el objeto (inmutabilidad)
  public readonly id: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly avatarUrl: string | null;
  public readonly roles: string[];
  public readonly twoFactorEnabled: boolean;
  public readonly locale: Locale;

  // "private" => solo accesible DENTRO de esta clase; el hash de password nunca debe salir al exterior
  private readonly passwordHash: string | null;
  private readonly isVerifiedFlag: boolean;
  private readonly isActiveFlag: boolean;
  private readonly walletAddress: string | null;

  // "constructor" => único punto de entrada para crear la instancia; recibe el shape crudo de Prisma
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

  // Método de dominio: expone el hash SOLO al servicio de auth (que sí necesita compararlo con bcrypt)
  // Se nombra explícito "getPasswordHashForComparison" para dejar claro que es un acceso restringido
  public getPasswordHashForComparison(): string | null {
    return this.passwordHash;
  }

  // "get" => getter: se lee como propiedad (user.isActive), no como método
  public get isActive(): boolean {
    return this.isActiveFlag;
  }

  public get isVerified(): boolean {
    return this.isVerifiedFlag;
  }

  // Regla de negocio: un usuario solo puede iniciar sesión si está activo Y verificado
  // (encapsula la regla en un solo lugar => si cambia, se cambia aquí y no en 5 controllers distintos)
  public canAuthenticate(): boolean {
    return this.isActiveFlag && this.isVerifiedFlag;
  }

  // Regla de negocio: solo se puede iniciar sesión Web3 si el usuario ya vinculó una wallet
  public hasWeb3WalletLinked(): boolean {
    return this.walletAddress !== null;
  }

  public matchesWalletAddress(address: string): boolean {
    // "?." (optional chaining) + comparación case-insensitive: las direcciones ETH no distinguen mayúsculas
    return this.walletAddress?.toLowerCase() === address.toLowerCase();
  }

  // Método que verifica si el usuario tiene un rol específico (usado por Guards/RBAC)
  public hasRole(roleName: string): boolean {
    return this.roles.includes(roleName);
  }

  // "toPublicJSON" => serializa SOLO los campos seguros para exponer en la respuesta HTTP
  // (nunca incluye passwordHash) => previene fuga accidental de datos sensibles
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

// SessionEntity => modela una sesión/refresh-token activa
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

  // Regla de negocio centralizada: una sesión es válida si NO fue revocada Y no expiró por tiempo
  public isValid(): boolean {
    const now = new Date();
    return !this.isRevokedFlag && this.expiresAt > now;
  }

  // Refresh Token Rotation: solo el ÚLTIMO refresh token emitido es válido para esta sesión
  public matchesRefreshTokenHash(hash: string): boolean {
    return this.refreshTokenHash === hash;
  }

  // Ownership: un usuario solo puede cerrar SUS propias sesiones
  public belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  public revoke(): void {
    // Cambia el estado interno; el Repository es responsable de PERSISTIR este cambio en DB
    this.isRevokedFlag = true;
  }
}

// VerificationTokenEntity => token de un solo uso (email, reset de password, OTP 2FA)
export class VerificationTokenEntity {
  public static readonly MAX_ATTEMPTS = 5; // "static" => pertenece a la clase, no a cada instancia

  constructor(
    public readonly id: string,
    public readonly userId: string,
    private readonly expiresAt: Date,
    private readonly consumedAt: Date | null,
    private readonly attempts: number
  ) {}

  // Regla de negocio: usable si no se consumió, no expiró y no superó el máximo de intentos (anti fuerza bruta)
  public isUsable(): boolean {
    return (
      this.consumedAt === null &&
      this.expiresAt > new Date() &&
      this.attempts < VerificationTokenEntity.MAX_ATTEMPTS
    );
  }
}
