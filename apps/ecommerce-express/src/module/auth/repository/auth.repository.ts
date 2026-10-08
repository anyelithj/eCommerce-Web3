// auth.repository.ts => PATRÓN "Repository": aísla TODO el acceso a la base de datos (Prisma)
// detrás de métodos con nombres de negocio (ej. "findByEmail"), no de nombres técnicos de SQL.
// Principio DIP (Dependency Inversion): el Service depende de esta ABSTRACCIÓN, nunca importa
// PrismaClient directamente => si mañana cambiamos de ORM, solo se reescribe este archivo.
import { DEFAULT_LOCALE, isLocale, type Locale } from "../../../shared/util/i18n.util";
import type { PrismaClient, VerificationPurpose, OAuthProvider, Prisma } from "@prisma/client";
import { prisma } from "../../../config/database.config"; // Singleton compartido (antes: un PrismaClient por repository)
import {
  UserEntity,
  SessionEntity,
  VerificationTokenEntity,
  type UserPersistenceShape,
} from "../model/auth.model";
import { Roles } from "../../../shared/constants/roles.constants";

// Include reutilizable: trae la relación N-N UserRole -> Role en la MISMA query (evita el problema N+1)
// "satisfies" => valida la forma contra el tipo de Prisma SIN perder el tipo literal (inferencia exacta del resultado)
const USER_WITH_ROLES = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

// Tipo de la fila de usuario con roles, derivado de Prisma (DRY: no se escribe a mano)
type UserRow = Prisma.UserGetPayload<{ include: typeof USER_WITH_ROLES }>;

// "class AuthRepository" => POO: encapsula el cliente Prisma como estado privado de la instancia
export class AuthRepository {
  // Inyección de dependencias por constructor (Constructor Injection): facilita testear con un mock de Prisma
  // "private readonly" en el parámetro => declara y asigna la propiedad en una sola línea
  constructor(private readonly prisma: PrismaClient) {}

  // findByEmail => busca un usuario por email, incluyendo sus roles aplanados
  public async findByEmail(email: string): Promise<UserEntity | null> {
    // "findUnique" aprovecha el índice UNIQUE de la columna "email" (query O(log n), no full scan)
    const rawUser = await this.prisma.user.findUnique({
      where: { email },
      include: USER_WITH_ROLES,
    });
    return rawUser ? this.mapToUserEntity(rawUser) : null; // Operador ternario: null si no existe
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const rawUser = await this.prisma.user.findUnique({ where: { id }, include: USER_WITH_ROLES });
    return rawUser ? this.mapToUserEntity(rawUser) : null;
  }

  public async findByWalletAddress(walletAddress: string): Promise<UserEntity | null> {
    // Las direcciones se guardan en minúsculas: la comparación es exacta y usa el índice UNIQUE
    const rawUser = await this.prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: USER_WITH_ROLES,
    });
    return rawUser ? this.mapToUserEntity(rawUser) : null;
  }

  // createUser => inserta un nuevo usuario y le asigna el rol "CUSTOMER" por defecto (regla de negocio Fase 1.2)
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
        locale: data.locale ?? DEFAULT_LOCALE, // Idioma del registro (el frontend envía el de la interfaz)
        // "roles: { create: [...] }" => crea simultáneamente la fila en la tabla intermedia UserRole
        // "connect: { name }" => vincula el rol EXISTENTE "CUSTOMER" (creado por el seed)
        roles: { create: [{ role: { connect: { name: Roles.CUSTOMER } } }] },
        // Registros 1-1 que todo usuario necesita desde el día 1 (fidelidad y preferencias)
        loyaltyAccount: { create: {} },
        notificationPrefs: { create: {} },
      },
      include: USER_WITH_ROLES,
    });

    return this.mapToUserEntity(rawUser);
  }

  // markEmailAsVerified => actualiza el flag isVerified tras confirmar el token de verificación
  public async markEmailAsVerified(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  // updatePasswordHash => usado en el flujo de "reset password"
  public async updatePasswordHash(userId: string, newHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }

  public async setTwoFactor(userId: string, enabled: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
  }

  // --- OAuth (cuentas externas vinculadas) ---

  // findByOAuthAccount => usuario dueño de la cuenta externa (provider + id externo)
  public async findByOAuthAccount(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<UserEntity | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      // "provider_providerAccountId" => nombre que Prisma genera para el @@unique compuesto
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: { include: USER_WITH_ROLES } },
    });
    return account ? this.mapToUserEntity(account.user) : null;
  }

  // linkWallet => guarda la dirección en minúsculas (misma normalización que findByWalletAddress)
  public async linkWallet(userId: string, walletAddress: string): Promise<string> {
    const normalized = walletAddress.toLowerCase();
    await this.prisma.user.update({ where: { id: userId }, data: { walletAddress: normalized } });
    return normalized;
  }

  // linkOAuthAccount => vincula una cuenta externa a un usuario existente (idempotente con upsert)
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

  // --- Gestión de Sessions (refresh tokens) ---

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

  // updateSessionToken => guarda el hash del NUEVO refresh token (rotación) y extiende la expiración
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

  // revokeAllUserSessions => tras reset/cambio de contraseña o robo detectado: cierra TODAS las sesiones
  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // --- Tokens de verificación (email, reset, 2FA) ---

  // createVerificationToken => invalida los tokens previos del mismo propósito y crea uno nuevo (Unit of Work)
  public async createVerificationToken(data: {
    id?: string | undefined; // Opcional: el desafío 2FA pre-genera su ID para derivar el hash
    userId: string;
    purpose: VerificationPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string> {
    // "$transaction([...])" => ambas operaciones se confirman juntas o ninguna (atomicidad)
    const [, created] = await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId: data.userId, purpose: data.purpose, consumedAt: null },
        data: { consumedAt: new Date() }, // Solo el último enlace enviado es válido
      }),
      this.prisma.verificationToken.create({
        data: {
          // Spread condicional: el "id" solo se envía si viene definido (si no, Postgres genera el UUID)
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

  // findVerificationTokenByHash => búsqueda por hash (el token en claro nunca se guarda)
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
    // "increment" => UPDATE ... SET attempts = attempts + 1 (atómico en la base, sin leer-modificar-escribir)
    await this.prisma.verificationToken.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  public async consumeVerificationToken(id: string): Promise<void> {
    await this.prisma.verificationToken.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  // "private" => método auxiliar SOLO usado dentro de esta clase, no forma parte del contrato público
  // Mapea el shape crudo de Prisma (con relaciones anidadas) al UserEntity de dominio (aplana roles)
  private mapToUserEntity(rawUser: UserRow): UserEntity {
    // ".map()" => transforma el array de relaciones [{role: {name: 'ADMIN'}}] en ['ADMIN'] (aplanado)
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

// Instancia Singleton exportada que reutiliza la conexión Prisma única de la app
export const authRepository = new AuthRepository(prisma);
